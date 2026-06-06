import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications'
import type { TaskStatus, TaskPriority } from '@/types/database'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    title?: string
    description?: string | null
    assigneeId?: string | null
    due_date?: string | null
    priority?: TaskPriority
    status?: TaskStatus
    milestoneId?: string | null
  }

  const { data: existing } = await supabase
    .from('tasks')
    .select('project_id, created_by, assignee_id')
    .eq('id', id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: membership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', existing.project_id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  const isLeader = membership?.role === 'leader'
  const isCreator = existing.created_by === user.id
  if (!isLeader && !isCreator) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: task, error } = await supabase
    .from('tasks')
    .update({
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.assigneeId !== undefined && { assignee_id: body.assigneeId }),
      ...(body.due_date !== undefined && { due_date: body.due_date }),
      ...(body.priority !== undefined && { priority: body.priority }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.milestoneId !== undefined && { milestone_id: body.milestoneId }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify new assignee if assignee changed
  const newAssigneeId = body.assigneeId
  if (newAssigneeId && newAssigneeId !== existing.assignee_id && newAssigneeId !== user.id) {
    const { data: project } = await supabase.from('projects').select('name').eq('id', existing.project_id).single()
    await createNotification({
      userId: newAssigneeId,
      type: 'task_assigned',
      payload: { taskId: id, taskTitle: task?.title ?? '', projectId: existing.project_id, projectName: project?.name ?? '' },
    })
  }

  return NextResponse.json({ task })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: existing } = await supabase
    .from('tasks')
    .select('project_id, created_by')
    .eq('id', id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: membership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', existing.project_id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  const isLeader = membership?.role === 'leader'
  const isCreator = existing.created_by === user.id
  if (!isLeader && !isCreator) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
