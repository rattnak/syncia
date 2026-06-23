import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ results: [] })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get all projects the user is a member of
  const { data: memberships } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', user.id)
    .eq('status', 'active')

  const projectIds = (memberships ?? []).map((m) => m.project_id)
  if (!projectIds.length) return NextResponse.json({ results: [] })

  const like = `%${q}%`

  const [projectsRes, tasksRes, milestonesRes] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, description')
      .in('id', projectIds)
      .or(`name.ilike.${like},description.ilike.${like}`)
      .limit(5),
    supabase
      .from('tasks')
      .select('id, project_id, title, status')
      .in('project_id', projectIds)
      .ilike('title', like)
      .limit(8),
    supabase
      .from('milestones')
      .select('id, project_id, title, status')
      .in('project_id', projectIds)
      .ilike('title', like)
      .limit(5),
  ])

  const results = [
    ...(projectsRes.data ?? []).map((p) => ({
      type: 'project' as const,
      id: p.id,
      title: p.name,
      subtitle: p.description ?? undefined,
      href: `/projects/${p.id}`,
    })),
    ...(milestonesRes.data ?? []).map((m) => ({
      type: 'milestone' as const,
      id: m.id,
      title: m.title,
      subtitle: `Milestone · ${m.status}`,
      href: `/projects/${m.project_id}`,
    })),
    ...(tasksRes.data ?? []).map((t) => ({
      type: 'task' as const,
      id: t.id,
      title: t.title,
      subtitle: `Task · ${t.status.replace('_', ' ')}`,
      href: `/projects/${t.project_id}`,
    })),
  ]

  return NextResponse.json({ results })
}
