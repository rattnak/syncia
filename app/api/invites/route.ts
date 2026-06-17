import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications'

export async function POST(req: NextRequest) {
  // Demo mode: return a fake but usable invite link
  if (process.env.DEMO_MODE === 'true') {
    const { email } = await req.json()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    return NextResponse.json({ inviteUrl: `${siteUrl}/invites/demo-invite-token-001`, email })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId, email } = await req.json()

  if (!projectId || !email) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase().trim()

  if (!normalizedEmail.endsWith('@fhsu.edu')) {
    return NextResponse.json({ error: 'Invitees must have an FHSU email address (@fhsu.edu).' }, { status: 400 })
  }

  // Caller must be an active leader of this project
  const { data: membership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership || membership.role !== 'leader') {
    return NextResponse.json({ error: 'Only project leaders can invite members.' }, { status: 403 })
  }

  // Re-use any existing pending invite for this email + project
  const { data: existingInvite } = await supabase
    .from('invites')
    .select('token')
    .eq('project_id', projectId)
    .eq('invited_email', normalizedEmail)
    .eq('status', 'pending')
    .single()

  if (existingInvite) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    return NextResponse.json({ inviteUrl: `${siteUrl}/invites/${existingInvite.token}`, email: normalizedEmail, reused: true })
  }

  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await supabase
    .from('invites')
    .insert({
      project_id: projectId,
      invited_email: normalizedEmail,
      invited_by: user.id,
      token,
      status: 'pending',
      expires_at: expiresAt,
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify invited user if they already have a profile
  const { data: invitedProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', normalizedEmail)
    .single()

  if (invitedProfile) {
    const { data: project } = await supabase.from('projects').select('name').eq('id', projectId).single()
    await createNotification({
      userId: invitedProfile.id,
      type: 'invite_received',
      payload: { token, projectId, projectName: project?.name ?? '' },
    })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  return NextResponse.json({ inviteUrl: `${siteUrl}/invites/${token}`, email: normalizedEmail })
}
