import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CalendarBriefing from '@/components/CalendarBriefing'

export default async function BriefingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch all active projects for this user
  const { data: memberships } = await supabase
    .from('project_members')
    .select('project_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')

  const projectIds = memberships?.map((m) => m.project_id) ?? []

  const { data: projectRows } = projectIds.length
    ? await supabase.from('projects').select('id, name').in('id', projectIds)
    : { data: [] }

  const projects = (projectRows ?? []).map((p) => ({
    ...p,
    role: memberships?.find((m) => m.project_id === p.id)?.role ?? 'member',
  }))

  // In-progress logs grouped by project
  const { data: inProgressLogs } = projectIds.length
    ? await supabase
        .from('progress_logs')
        .select('id, title, description, status, created_at, project_id, user_id')
        .in('project_id', projectIds)
        .eq('status', 'in_progress')
        .order('updated_at', { ascending: false })
        .limit(50)
    : { data: [] }

  const logUserIds = Array.from(new Set((inProgressLogs ?? []).map((l) => l.user_id)))
  const { data: logProfiles } = logUserIds.length
    ? await supabase.from('profiles').select('id, full_name, email').in('id', logUserIds)
    : { data: [] }

  type LogRow = { id: string; title: string; description: string | null; status: string; created_at: string; project_id: string; user_id: string }
  const logsByProject: Record<string, LogRow[]> = {}
  for (const log of (inProgressLogs ?? []) as LogRow[]) {
    if (!logsByProject[log.project_id]) logsByProject[log.project_id] = []
    logsByProject[log.project_id].push(log)
  }

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Daily Briefing</h1>
        <p className="text-gray-500 text-sm mt-1">{today}</p>
      </div>

      {/* In-progress work by project */}
      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Active work across your projects</h2>
        {projects.length === 0 ? (
          <p className="text-sm text-gray-400">You are not part of any projects yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {projects.map((project) => {
              const logs = logsByProject[project.id] ?? []
              return (
                <div key={project.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <Link
                      href={`/projects/${project.id}`}
                      className="font-semibold text-gray-900 hover:text-blue-600 transition text-sm"
                    >
                      {project.name}
                    </Link>
                    <span className="text-xs text-gray-400 capitalize">{project.role}</span>
                  </div>
                  {logs.length === 0 ? (
                    <p className="text-xs text-gray-400">No active tasks logged.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {logs.map((log) => {
                        const author = logProfiles?.find((p) => p.id === log.user_id)
                        const authorName = author?.full_name ?? author?.email ?? 'Someone'
                        return (
                          <div key={log.id} className="flex items-start gap-3 py-2 border-t border-gray-50">
                            <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-800 font-medium">{log.title}</p>
                              {log.description && (
                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{log.description}</p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">{authorName}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Calendar section (requires Graph access) */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-4">Today&apos;s meetings</h2>
        <CalendarBriefing />
      </section>
    </div>
  )
}
