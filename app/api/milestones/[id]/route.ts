import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { MilestoneStatus } from '@/types/database'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { title?: string; description?: string | null; target_date?: string | null; status?: MilestoneStatus }

  // Fetch milestone to get project_id for leader check
  const { data: existing } = await supabase
    .from('milestones')
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

  const { data: milestone, error } = await supabase
    .from('milestones')
    .update({
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.target_date !== undefined && { target_date: body.target_date }),
      ...(body.status !== undefined && { status: body.status }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ milestone })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: existing } = await supabase
    .from('milestones')
    .select('project_id')
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

  if (membership?.role !== 'leader') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase.from('milestones').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
