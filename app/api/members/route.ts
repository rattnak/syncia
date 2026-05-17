import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// DELETE /api/members?projectId=xxx&userId=xxx
// Leaders can remove any non-leader member from their project.
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get('projectId')
  const targetUserId = req.nextUrl.searchParams.get('userId')

  if (!projectId || !targetUserId) {
    return NextResponse.json({ error: 'Missing projectId or userId.' }, { status: 400 })
  }

  if (targetUserId === user.id) {
    return NextResponse.json({ error: 'Use the leave action to remove yourself.' }, { status: 400 })
  }

  // Verify caller is an active leader
  const { data: myMembership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!myMembership || myMembership.role !== 'leader') {
    return NextResponse.json({ error: 'Only leaders can remove members.' }, { status: 403 })
  }

  // Get the target member's role
  const { data: targetMembership } = await supabase
    .from('project_members')
    .select('id, role')
    .eq('project_id', projectId)
    .eq('user_id', targetUserId)
    .in('status', ['active', 'pending'])
    .single()

  if (!targetMembership) {
    return NextResponse.json({ error: 'Member not found in this project.' }, { status: 404 })
  }

  const { error } = await supabase
    .from('project_members')
    .update({ status: 'removed' })
    .eq('id', targetMembership.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// PATCH /api/members?projectId=xxx&userId=xxx  body: { role: 'leader' | 'member' }
// Leaders can promote/demote other members.
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get('projectId')
  const targetUserId = req.nextUrl.searchParams.get('userId')

  if (!projectId || !targetUserId) {
    return NextResponse.json({ error: 'Missing projectId or userId.' }, { status: 400 })
  }

  const { role } = await req.json()
  if (role !== 'leader' && role !== 'member') {
    return NextResponse.json({ error: 'Role must be leader or member.' }, { status: 400 })
  }

  // Verify caller is an active leader
  const { data: myMembership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!myMembership || myMembership.role !== 'leader') {
    return NextResponse.json({ error: 'Only leaders can change member roles.' }, { status: 403 })
  }

  const { data: target } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', targetUserId)
    .eq('status', 'active')
    .single()

  if (!target) return NextResponse.json({ error: 'Member not found.' }, { status: 404 })

  const { error } = await supabase
    .from('project_members')
    .update({ role })
    .eq('id', target.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
