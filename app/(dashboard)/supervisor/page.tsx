import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SupervisorAIQuery from '@/components/SupervisorAIQuery'

export default async function SupervisorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify this user is a supervisor or admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'supervisor' && profile.role !== 'admin')) {
    return (
      <div className="max-w-xl mx-auto mt-12 text-center">
        <h1 className="text-lg font-semibold text-gray-900 mb-2">Access restricted</h1>
        <p className="text-gray-500 text-sm">
          This dashboard is only accessible to supervisors and admins.
          If you should have access, ask an admin to update your role.
        </p>
      </div>
    )
  }

  // Fetch all members who have opted to share with this supervisor
  const { data: sharedMemberships } = await supabase
    .from('project_members')
    .select('user_id, project_id, role')
    .eq('supervisor_id', user.id)
    .eq('share_with_supervisor', true)
    .eq('status', 'active')

  if (!sharedMemberships?.length) {
    return (
      <div className="max-w-xl mx-auto mt-12 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Supervisor Dashboard</h1>
        <p className="text-gray-500 text-sm">
          No team members have opted to share their progress with you yet.
          Members can enable supervisor sharing from the project settings panel.
        </p>
      </div>
    )
  }

  const memberUserIds = Array.from(new Set(sharedMemberships.map((m) => m.user_id)))
  const projectIds = Array.from(new Set(sharedMemberships.map((m) => m.project_id)))

  // Fetch profiles for those members
  const { data: memberProfiles } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', memberUserIds)

  // Fetch projects
  const { data: projectRows } = await supabase
    .from('projects')
    .select('id, name')
    .in('id', projectIds)

  // Fetch progress logs; filter client-side to shared (user, project) pairs
  // (Supabase doesn't support tuple IN natively)
  const { data: rawLogs } = await supabase
    .from('progress_logs')
    .select('id, title, description, status, created_at, user_id, project_id')
    .in('user_id', memberUserIds)
    .in('project_id', projectIds)
    .order('created_at', { ascending: false })
    .limit(200)

  // Filter to only the shared (user, project) pairs
  const sharedPairSet = new Set(sharedMemberships.map((m) => `${m.user_id}:${m.project_id}`))
  const logs = (rawLogs ?? []).filter((l) => sharedPairSet.has(`${l.user_id}:${l.project_id}`))

  type ProfileRow = { id: string; full_name: string | null; email: string }
  type LogRow = { id: string; title: string; description: string | null; status: string; created_at: string; user_id: string; project_id: string }
  type ProjectRow = { id: string; name: string }

  // Group by member
  const memberGroups: Record<string, {
    profile: ProfileRow | null
    projects: ProjectRow[]
    logs: LogRow[]
  }> = {}

  for (const uid of memberUserIds) {
    const memberProjectIds = sharedMemberships
      .filter((m) => m.user_id === uid)
      .map((m) => m.project_id)

    memberGroups[uid] = {
      profile: (memberProfiles as ProfileRow[] | null)?.find((p) => p.id === uid) ?? null,
      projects: ((projectRows ?? []) as ProjectRow[]).filter((p) => memberProjectIds.includes(p.id)),
      logs: (logs as LogRow[]).filter((l) => l.user_id === uid),
    }
  }

  const STATUS_COLORS: Record<string, string> = {
    not_started: 'bg-gray-100 text-gray-600',
    in_progress: 'bg-blue-100 text-blue-700',
    done: 'bg-green-100 text-green-700',
  }
  const STATUS_LABELS: Record<string, string> = {
    not_started: 'Not Started',
    in_progress: 'In Progress',
    done: 'Done',
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Supervisor Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Read-only view of progress logs from members who have opted to share with you.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {Object.entries(memberGroups).map(([uid, group]) => {
            const name = group.profile?.full_name ?? group.profile?.email ?? uid
            return (
              <div key={uid} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="font-semibold text-gray-900">{name}</h2>
                  {group.profile?.email && (
                    <span className="text-xs text-gray-400">{group.profile.email}</span>
                  )}
                </div>
                <div className="flex gap-1 flex-wrap mb-4">
                  {group.projects.map((p) => (
                    <span key={p.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {p.name}
                    </span>
                  ))}
                </div>

                {group.logs.length === 0 ? (
                  <p className="text-sm text-gray-400">No progress logs yet.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {group.logs.map((log) => {
                      const project = projectRows?.find((p) => p.id === log.project_id)
                      return (
                        <div key={log.id} className="flex items-start gap-3 py-2 border-t border-gray-50">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-gray-900">{log.title}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[log.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                {STATUS_LABELS[log.status] ?? log.status}
                              </span>
                            </div>
                            {log.description && (
                              <p className="text-xs text-gray-500 mt-0.5">{log.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              {project && (
                                <span className="text-xs text-blue-600">{project.name}</span>
                              )}
                              <span className="text-xs text-gray-400">
                                {new Date(log.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
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

        {/* AI Query sidebar */}
        <div>
          <SupervisorAIQuery members={Object.entries(memberGroups).map(([uid, g]) => ({
            user_id: uid,
            name: g.profile?.full_name ?? g.profile?.email ?? uid,
          }))} />
        </div>
      </div>
    </div>
  )
}
