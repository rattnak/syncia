import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { createTeamsChannel } from '@/lib/graph/client'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: projects } = await supabase
    .from('project_members')
    .select('role, status, projects(id, name, description, created_at)')
    .eq('user_id', user.id)
    .eq('status', 'active')

  return NextResponse.json({ projects: projects ?? [] })
}

export async function POST(req: NextRequest) {
  const { name, description } = await req.json()
  if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 })

  // Demo mode: skip real DB, return an existing mock project so the router can navigate to it
  if (process.env.DEMO_MODE === 'true') {
    return NextResponse.json({
      project: {
        id: 'proj-001',
        name,
        description: description ?? null,
        created_at: new Date().toISOString(),
        teams_channel_id: null,
        teams_channel_url: null,
      },
    })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: project, error } = await supabase
    .from('projects')
    .insert({ name, description: description ?? null, created_by: user.id })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('project_members').insert({
    project_id: project.id,
    user_id: user.id,
    role: 'leader',
    status: 'active',
    share_with_supervisor: false,
    supervisor_id: null,
    joined_at: new Date().toISOString(),
  })

  // Provision a private Teams channel using the creating user's delegated token.
  // The delegated token means the user becomes the channel owner automatically —
  // no application-level permissions (Teams.Create / TeamMember.ReadWrite.All) are needed.
  // Non-blocking: silently skipped if GRAPH_TEAM_ID is not set or the user has no Graph token.
  if (process.env.GRAPH_TEAM_ID) {
    try {
      const session = await getServerSession(authOptions)
      if (session?.accessToken) {
        const channel = await createTeamsChannel(
          project.name,
          project.description ?? `Syncia project: ${project.name}`,
          session.accessToken
        )
        await supabase
          .from('projects')
          .update({ teams_channel_id: channel.id, teams_channel_url: channel.webUrl })
          .eq('id', project.id)
        project.teams_channel_id = channel.id
        project.teams_channel_url = channel.webUrl
      }
    } catch (err) {
      console.error('[Teams] Channel provisioning failed (non-fatal):', err)
    }
  }

  return NextResponse.json({ project })
}
