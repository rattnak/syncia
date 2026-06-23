import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications'
import { logActivity } from '@/lib/activity'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get('projectId')
  const milestoneId = req.nextUrl.searchParams.get('milestoneId')

  if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })

  const { data: membership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let query = supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('due_date', { ascending: true })

  if (milestoneId) {
    query = query.eq('milestone_id', milestoneId)
  }

  const { data: tasks, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich with assignee profile
  const assigneeIds = Array.from(new Set((tasks ?? []).map((t) => t.assignee_id).filter(Boolean))) as string[]
  const { data: profiles } = assigneeIds.length
    ? await supabase.from('profiles').select('id, full_name, email').in('id', assigneeIds)
    : { data: [] }

  const enriched = (tasks ?? []).map((t) => ({
    ...t,
    assignee: profiles?.find((p) => p.id === t.assignee_id) ?? null,
  }))

  return NextResponse.json({ tasks: enriched })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId, milestoneId, title, description, assigneeId, due_date, priority, status } = await req.json()
  if (!projectId || !title) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  const { data: membership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      project_id: projectId,
      milestone_id: milestoneId ?? null,
      title,
      description: description ?? null,
      assignee_id: assigneeId ?? null,
      due_date: due_date ?? null,
      priority: priority ?? 'medium',
      status: status ?? 'not_started',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify assignee if set and different from creator
  if (task.assignee_id && task.assignee_id !== user.id) {
    const { data: project } = await supabase.from('projects').select('name').eq('id', projectId).single()
    await createNotification({
      userId: task.assignee_id,
      type: 'task_assigned',
      payload: { taskId: task.id, taskTitle: title, projectId, projectName: project?.name ?? '' },
    })
  }

  await logActivity({
    projectId,
    actorId: user.id,
    entityType: 'task',
    entityId: task.id,
    action: 'created',
    meta: { title: task.title },
  })

  return NextResponse.json({ task })
}
