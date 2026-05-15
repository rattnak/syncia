import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import FocusModePanel from '@/components/FocusModePanel'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: memberships } = await supabase
    .from('project_members')
    .select('project_id, role')
    .eq('user_id', user!.id)
    .eq('status', 'active')

  const projectIds = memberships?.map((m) => m.project_id) ?? []

  const { data: projectRows } = projectIds.length
    ? await supabase.from('projects').select('id, name, description, created_at').in('id', projectIds)
    : { data: [] }

  const projects = (projectRows ?? []).map((p) => ({
    ...p,
    role: memberships?.find((m) => m.project_id === p.id)?.role ?? 'member',
  }))

  const { data: availRows } = projectIds.length
    ? await supabase
        .from('availability')
        .select('project_id, is_focused')
        .eq('user_id', user!.id)
        .in('project_id', projectIds)
    : { data: [] }

  const focusedIds = (availRows ?? []).filter((a) => a.is_focused).map((a) => a.project_id)

  // Member counts per project
  const { data: allMembers } = projectIds.length
    ? await supabase
        .from('project_members')
        .select('project_id, user_id')
        .in('project_id', projectIds)
        .eq('status', 'active')
    : { data: [] }

  const memberCount: Record<string, number> = {}
  for (const m of allMembers ?? []) {
    memberCount[m.project_id] = (memberCount[m.project_id] ?? 0) + 1
  }

  // In-progress log counts per project
  const { data: inProgressRows } = projectIds.length
    ? await supabase
        .from('progress_logs')
        .select('project_id')
        .in('project_id', projectIds)
        .eq('status', 'in_progress')
    : { data: [] }

  const inProgressCount: Record<string, number> = {}
  for (const l of inProgressRows ?? []) {
    inProgressCount[l.project_id] = (inProgressCount[l.project_id] ?? 0) + 1
  }

  // Pending invites for this user
  const { data: rawInvites } = await supabase
    .from('invites')
    .select('id, token, project_id')
    .eq('invited_email', user!.email!)
    .eq('status', 'pending')

  const inviteProjectIds = rawInvites?.map((i) => i.project_id) ?? []
  const { data: inviteProjects } = inviteProjectIds.length
    ? await supabase.from('projects').select('id, name').in('id', inviteProjectIds)
    : { data: [] }

  const pendingInvites = (rawInvites ?? []).map((inv) => ({
    ...inv,
    projectName: inviteProjects?.find((p) => p.id === inv.project_id)?.name ?? 'A project',
  }))

  const { data: profileData } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user!.id)
    .single()

  const firstName = profileData?.full_name?.split(' ')[0] ?? user!.email?.split('@')[0] ?? 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div>
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{greeting}, {firstName}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {projects.length === 0
              ? 'Create your first project to get started.'
              : `You're active in ${projects.length} project${projects.length !== 1 ? 's' : ''}.`}
          </p>
        </div>
        <Link
          href="/projects/new"
          className="shrink-0 inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New project
        </Link>
      </div>

      {pendingInvites.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <svg className="h-4 w-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="text-sm font-semibold text-amber-800">
              {pendingInvites.length} pending invitation{pendingInvites.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-amber-100">
                <span className="text-sm text-gray-800 font-medium">{inv.projectName}</span>
                <Link href={`/invites/${inv.token}`} className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline">
                  View invite →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {projects.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-4">
                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm font-medium mb-1">No projects yet</p>
              <p className="text-gray-400 text-xs mb-4">Create a project to start tracking progress with your team.</p>
              <Link href="/projects/new" className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create your first project
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {projects.map((project) => {
                const isFocused = focusedIds.includes(project.id)
                const members = memberCount[project.id] ?? 0
                const active = inProgressCount[project.id] ?? 0
                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="group bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-200 hover:shadow-sm transition flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-semibold text-gray-900 text-sm group-hover:text-blue-700 transition leading-snug">{project.name}</h2>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isFocused && <span className="h-2 w-2 rounded-full bg-green-400" title="You are focused on this project" />}
                        <span className="text-xs text-gray-400 capitalize bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">{project.role}</span>
                      </div>
                    </div>
                    {project.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed flex-1">{project.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-auto pt-2.5 border-t border-gray-50 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {members} member{members !== 1 ? 's' : ''}
                      </span>
                      {active > 0 && (
                        <span className="flex items-center gap-1 text-blue-500 font-medium">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 inline-block" />
                          {active} in progress
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {projects.length > 0 && (
            <FocusModePanel
              projects={projects.map((p) => ({ id: p.id, name: p.name, role: p.role }))}
              initialFocusedIds={focusedIds}
            />
          )}
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Quick links</p>
            <Link href="/briefing" className="flex items-center gap-2.5 text-sm text-gray-600 hover:text-blue-600 transition py-1.5 px-2 rounded-lg hover:bg-gray-50">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Daily briefing
            </Link>
            <Link href="/supervisor" className="flex items-center gap-2.5 text-sm text-gray-600 hover:text-blue-600 transition py-1.5 px-2 rounded-lg hover:bg-gray-50">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Supervisor dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
