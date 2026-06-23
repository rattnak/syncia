import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: task } = await supabase.from('tasks').select('project_id').eq('id', id).single()
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: membership } = await supabase
    .from('project_members').select('role')
    .eq('project_id', task.project_id).eq('user_id', user.id).eq('status', 'active').single()
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: comments, error } = await supabase
    .from('task_comments')
    .select('*, author:profiles(id, full_name, email)')
    .eq('task_id', id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ comments })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { body } = await req.json()
  if (!body?.trim()) return NextResponse.json({ error: 'Missing body' }, { status: 400 })

  const { data: task } = await supabase.from('tasks').select('project_id, title').eq('id', id).single()
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: membership } = await supabase
    .from('project_members').select('role')
    .eq('project_id', task.project_id).eq('user_id', user.id).eq('status', 'active').single()
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: comment, error } = await supabase
    .from('task_comments')
    .insert({ task_id: id, user_id: user.id, body: body.trim() })
    .select('*, author:profiles(id, full_name, email)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log to activity feed (fire-and-forget)
  await logActivity({
    projectId: task.project_id,
    actorId: user.id,
    entityType: 'comment',
    entityId: comment.id,
    action: 'commented',
    meta: { taskId: id, taskTitle: task.title },
  })

  return NextResponse.json({ comment })
}
