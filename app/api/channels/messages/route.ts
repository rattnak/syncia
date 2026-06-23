import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getChannelMessages } from '@/lib/graph/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const channelId = req.nextUrl.searchParams.get('channelId')
  if (!channelId) return NextResponse.json({ error: 'Missing channelId' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify the channel belongs to a project the user is a member of
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('teams_channel_id', channelId)
    .single()

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: membership } = await supabase
    .from('project_members').select('role')
    .eq('project_id', project.id).eq('user_id', user.id).eq('status', 'active').single()
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const session = await getServerSession(authOptions)
  const accessToken = (session as { accessToken?: string })?.accessToken
  if (!accessToken) return NextResponse.json({ error: 'No Graph token' }, { status: 401 })

  try {
    const messages = await getChannelMessages(channelId, accessToken, 20)
    return NextResponse.json({ messages })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Graph error'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
