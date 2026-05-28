import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getUserCalendarEvents } from '@/lib/graph/client'

export async function GET(req: NextRequest) {
  // Demo mode: return mock calendar events
  if (process.env.DEMO_MODE === 'true') {
    const now = new Date()
    return NextResponse.json({
      events: [
        {
          id: 'ev-demo-1',
          subject: 'TILT Website Redesign – Sprint Review',
          start: new Date(now.getTime() + 2 * 3600_000).toISOString(),
          end: new Date(now.getTime() + 3 * 3600_000).toISOString(),
          attendeeEmails: ['c_mong@fhsu.edu', 'j_smith@fhsu.edu'],
          joinUrl: null,
          projectId: 'proj-001',
          projectName: 'TILT Website Redesign',
        },
        {
          id: 'ev-demo-2',
          subject: 'AI Learning Modules – Content Review',
          start: new Date(now.getTime() + 26 * 3600_000).toISOString(),
          end: new Date(now.getTime() + 27 * 3600_000).toISOString(),
          attendeeEmails: ['j_smith@fhsu.edu', 'a_wong@fhsu.edu'],
          joinUrl: null,
          projectId: 'proj-002',
          projectName: 'AI Learning Modules',
        },
      ],
    })
  }

  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized or missing Graph token' }, { status: 401 })
  }

  const daysAhead = parseInt(req.nextUrl.searchParams.get('days') ?? '7', 10)

  try {
    const events = await getUserCalendarEvents(session.accessToken as string, daysAhead)

    // Match events to Syncia projects via attendee email overlap
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ events })

    // Fetch memberships
    const { data: memberships } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id)
      .eq('status', 'active')

    const projectIds = Array.from(new Set((memberships ?? []).map((m) => m.project_id)))

    if (!projectIds.length) return NextResponse.json({ events })

    // Fetch project names
    const { data: projectRows } = await supabase
      .from('projects')
      .select('id, name')
      .in('id', projectIds)

    // Fetch all member emails per project
    const { data: allProjectMembers } = await supabase
      .from('project_members')
      .select('project_id, user_id')
      .in('project_id', projectIds)
      .eq('status', 'active')

    const allMemberIds = Array.from(new Set((allProjectMembers ?? []).map((m) => m.user_id)))
    const { data: memberProfiles } = allMemberIds.length
      ? await supabase.from('profiles').select('id, email').in('id', allMemberIds)
      : { data: [] }

    // Build project → member emails map
    const projectMemberEmails: Record<string, string[]> = {}
    for (const pm of allProjectMembers ?? []) {
      if (!projectMemberEmails[pm.project_id]) projectMemberEmails[pm.project_id] = []
      const email = memberProfiles?.find((p) => p.id === pm.user_id)?.email
      if (email) projectMemberEmails[pm.project_id].push(email.toLowerCase())
    }

    // Tag each event with its project
    const taggedEvents = events.map((event) => {
      const attendeeSet = new Set(event.attendeeEmails.map((e) => e.toLowerCase()))
      const matchedProjectId = projectIds.find((pid) => {
        const memberEmails = projectMemberEmails[pid] ?? []
        const overlap = memberEmails.filter((email) => attendeeSet.has(email))
        return overlap.length >= 2
      })

      const project = matchedProjectId
        ? projectRows?.find((p) => p.id === matchedProjectId)
        : null

      return {
        ...event,
        projectId: project?.id ?? null,
        projectName: project?.name ?? null,
      }
    })

    return NextResponse.json({ events: taggedEvents })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 503 })
  }
}
