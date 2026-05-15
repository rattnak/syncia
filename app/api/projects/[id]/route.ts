import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/projects/[id]  — edit name/description (leaders only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: membership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', params.id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership || membership.role !== 'leader') {
    return NextResponse.json({ error: 'Only project leaders can edit project details.' }, { status: 403 })
  }

  const body = await req.json()
  const updates: { name?: string; description?: string | null } = {}
  if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim()
  if ('description' in body) updates.description = body.description?.trim() || null

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, updates })
}

// DELETE /api/projects/[id]  body: { action: 'leave' }
// Leaders can leave if there is at least one other active leader.
// Regular members can always leave.
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action } = await req.json()
  if (action !== 'leave') {
    return NextResponse.json({ error: 'Only the leave action is supported.' }, { status: 400 })
  }

  const { data: myMembership } = await supabase
    .from('project_members')
    .select('id, role')
    .eq('project_id', params.id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!myMembership) {
    return NextResponse.json({ error: 'You are not an active member of this project.' }, { status: 404 })
  }

  if (myMembership.role === 'leader') {
    const { data: leaders } = await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', params.id)
      .eq('role', 'leader')
      .eq('status', 'active')

    const otherLeaders = (leaders ?? []).filter((l) => l.user_id !== user.id)
    if (otherLeaders.length === 0) {
      return NextResponse.json({
        error: 'You are the only leader. Promote another member to leader before leaving.',
      }, { status: 400 })
    }
  }

  const { error } = await supabase
    .from('project_members')
    .update({ status: 'left' })
    .eq('id', myMembership.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
