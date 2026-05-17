import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { addTeamsChannelMember } from '@/lib/graph/client'

// POST /api/invites/[token]  body: { action: 'accept' | 'decline' }
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  // Demo mode: always succeed
  if (process.env.DEMO_MODE === 'true') {
    const { action } = await req.json()
    return NextResponse.json({ success: true, action })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action } = await req.json()
  if (action !== 'accept' && action !== 'decline') {
    return NextResponse.json({ error: 'Action must be accept or decline.' }, { status: 400 })
  }

  // Look up the invite
  const { data: invite } = await supabase
    .from('invites')
    .select('id, status, invited_email, expires_at, project_id')
    .eq('token', params.token)
    .single()

  if (!invite) return NextResponse.json({ error: 'Invite not found.' }, { status: 404 })
  if (invite.status !== 'pending') {
    return NextResponse.json({ error: `Invite already ${invite.status}.` }, { status: 409 })
  }
  if (invite.invited_email !== user.email) {
    return NextResponse.json({ error: 'This invite was not sent to your account.' }, { status: 403 })
  }
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This invite has expired.' }, { status: 410 })
  }

  // Update invite status
  const { error: inviteErr } = await supabase
    .from('invites')
    .update({ status: action === 'accept' ? 'accepted' : 'declined' })
    .eq('id', invite.id)

  if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 500 })

  if (action === 'accept') {
    // Check for existing membership (prevent duplicates)
    const { data: existing } = await supabase
      .from('project_members')
      .select('id, status')
      .eq('project_id', invite.project_id)
      .eq('user_id', user.id)
      .single()

    if (!existing) {
      const { error: memberErr } = await supabase
        .from('project_members')
        .insert({
          project_id: invite.project_id,
          user_id: user.id,
          role: 'member',
          status: 'active',
          share_with_supervisor: false,
          supervisor_id: null,
          joined_at: new Date().toISOString(),
        })
      if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 })
    } else if (existing.status !== 'active') {
      await supabase
        .from('project_members')
        .update({ status: 'active', joined_at: new Date().toISOString() })
        .eq('id', existing.id)
    }

    // Add the new member to the Teams channel if one exists for this project.
    // Uses the accepting user's delegated token — they're adding themselves.
    // aadObjectId comes from their NextAuth JWT (populated from the AAD `oid` claim).
    // Non-blocking: Teams failure must not prevent the invite from being accepted.
    if (process.env.GRAPH_TEAM_ID) {
      try {
        const { data: projectRow } = await supabase
          .from('projects')
          .select('teams_channel_id')
          .eq('id', invite.project_id)
          .single()

        const session = await getServerSession(authOptions)
        const channelId = projectRow?.teams_channel_id
        const aadObjectId = session?.aadObjectId
        const accessToken = session?.accessToken

        if (channelId && aadObjectId && accessToken) {
          await addTeamsChannelMember(channelId, aadObjectId, accessToken)
        }
      } catch (err) {
        console.error('[Teams] Failed to add member to channel (non-fatal):', err)
      }
    }
  }

  return NextResponse.json({ success: true, action, projectId: invite.project_id })
}
