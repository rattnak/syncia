import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; subId: string }> }) {
  const { id, subId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { title?: string; is_completed?: boolean; assigneeId?: string | null; due_date?: string | null }

  const { data: task } = await supabase.from('tasks').select('project_id').eq('id', id).single()
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: membership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', task.project_id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: subtask, error } = await supabase
    .from('subtasks')
    .update({
      ...(body.title !== undefined && { title: body.title }),
      ...(body.is_completed !== undefined && { is_completed: body.is_completed }),
      ...(body.assigneeId !== undefined && { assignee_id: body.assigneeId }),
      ...(body.due_date !== undefined && { due_date: body.due_date }),
    })
    .eq('id', subId)
    .eq('task_id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!subtask) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ subtask })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; subId: string }> }) {
  const { id, subId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: task } = await supabase.from('tasks').select('project_id').eq('id', id).single()
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: membership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', task.project_id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase.from('subtasks').delete().eq('id', subId).eq('task_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
