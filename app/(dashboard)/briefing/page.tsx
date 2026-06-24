import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CalendarBriefing from '@/components/CalendarBriefing'

function dueDateLabel(due: string): { label: string; cls: string; group: 'overdue' | 'today' | 'week' } {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(due + 'T00:00:00')
  const diff = Math.floor((d.getTime() - today.getTime()) / 86400000)
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, cls: 'text-red-600 font-semibold', group: 'overdue' }
  if (diff === 0) return { label: 'Due today', cls: 'text-amber-600 font-semibold', group: 'today' }
  return { label: `Due in ${diff}d`, cls: 'text-gray-500', group: 'week' }
}

const STATUS_DOT: Record<string, string> = {
  not_started: 'bg-gray-400',
  in_progress: 'bg-blue-400',
  done: 'bg-green-500',
  cancelled: 'bg-gray-300',
}

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

  // My tasks due this week (assignee_id = me, due_date within 7 days, not done/cancelled)
  const sevenDaysOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const { data: myTaskRows } = await supabase
    .from('tasks')
    .select('id, title, status, due_date, priority, project_id')
    .eq('assignee_id', user.id)
    .lte('due_date', sevenDaysOut)
    .not('status', 'in', '("done","cancelled")')
    .order('due_date', { ascending: true })

  const myTaskProjectIds = Array.from(new Set((myTaskRows ?? []).map((t) => t.project_id)))
  const { data: myTaskProjects } = myTaskProjectIds.length
    ? await supabase.from('projects').select('id, name').in('id', myTaskProjectIds)
    : { data: [] }

  const myTasks = (myTaskRows ?? []).map((t) => ({
    ...t,
    projectName: myTaskProjects?.find((p) => p.id === t.project_id)?.name ?? '',
    dueInfo: dueDateLabel(t.due_date!),
  }))

  const overdueCount = myTasks.filter((t) => t.dueInfo.group === 'overdue').length
  const todayCount = myTasks.filter((t) => t.dueInfo.group === 'today').length

  // Per-project snapshots: milestone count, tasks due this week, overdue task count
  const { data: allProjectTasks } = projectIds.length
    ? await supabase
        .from('tasks')
        .select('project_id, status, due_date')
        .in('project_id', projectIds)
        .not('status', 'in', '("done","cancelled")')
    : { data: [] }

  const { data: allMilestones } = projectIds.length
    ? await supabase
        .from('milestones')
        .select('project_id, status')
        .in('project_id', projectIds)
        .not('status', 'in', '("completed","cancelled")')
    : { data: [] }

  const today = new Date().toISOString().slice(0, 10)
  const snapshots: Record<string, { openMilestones: number; overdueTasks: number; dueSoon: number }> = {}
  for (const pid of projectIds) {
    const pts = (allProjectTasks ?? []).filter((t) => t.project_id === pid)
    const pms = (allMilestones ?? []).filter((m) => m.project_id === pid)
    snapshots[pid] = {
      openMilestones: pms.length,
      overdueTasks: pts.filter((t) => t.due_date && t.due_date < today).length,
      dueSoon: pts.filter((t) => t.due_date && t.due_date >= today && t.due_date <= sevenDaysOut).length,
    }
  }

  // In-progress logs grouped by project (existing section)
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

  const todayDisplay = new Date().toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const PRIORITY_DOT: Record<string, string> = {
    low: 'bg-gray-300', medium: 'bg-blue-400', high: 'bg-red-500',
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Daily Briefing</h1>
        <p className="text-gray-500 text-sm mt-1">{todayDisplay}</p>
      </div>

      {/* ── Section 1: My tasks ─────────────────────────────────────────── */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">My tasks this week</h2>
          <div className="flex items-center gap-2 text-xs">
            {overdueCount > 0 && (
              <span className="bg-red-100 text-red-700 font-medium px-2 py-0.5 rounded-full">{overdueCount} overdue</span>
            )}
            {todayCount > 0 && (
              <span className="bg-amber-100 text-amber-700 font-medium px-2 py-0.5 rounded-full">{todayCount} due today</span>
            )}
          </div>
        </div>

        {myTasks.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <p className="text-sm text-gray-400">No tasks due this week. You&apos;re all caught up!</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {(['overdue', 'today', 'week'] as const).map((group) => {
              const groupTasks = myTasks.filter((t) => t.dueInfo.group === group)
              if (!groupTasks.length) return null
              const groupLabel = group === 'overdue' ? 'Overdue' : group === 'today' ? 'Due today' : 'Due this week'
              const groupBg = group === 'overdue' ? 'bg-red-50 border-red-100' : group === 'today' ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100'
              return (
                <div key={group}>
                  <div className={`px-4 py-2 border-b ${groupBg}`}>
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{groupLabel}</span>
                  </div>
                  {groupTasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/projects/${task.project_id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition border-b border-gray-50 last:border-0"
                    >
                      <span className={`h-2 w-2 rounded-full shrink-0 ${PRIORITY_DOT[task.priority] ?? 'bg-gray-300'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{task.projectName}</p>
                      </div>
                      <span className={`text-xs shrink-0 ${task.dueInfo.cls}`}>{task.dueInfo.label}</span>
                    </Link>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Section 2: Project snapshots ────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Project snapshots</h2>
        {projects.length === 0 ? (
          <p className="text-sm text-gray-400">You are not part of any projects yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {projects.map((project) => {
              const snap = snapshots[project.id] ?? { openMilestones: 0, overdueTasks: 0, dueSoon: 0 }
              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-200 hover:shadow-sm transition"
                >
                  <p className="text-sm font-semibold text-gray-900 mb-2 hover:text-blue-700 transition">{project.name}</p>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-gray-500">{snap.openMilestones} milestone{snap.openMilestones !== 1 ? 's' : ''}</span>
                    {snap.overdueTasks > 0 && (
                      <span className="text-red-600 font-medium">{snap.overdueTasks} overdue</span>
                    )}
                    {snap.dueSoon > 0 && (
                      <span className="text-amber-600 font-medium">{snap.dueSoon} due soon</span>
                    )}
                    {snap.overdueTasks === 0 && snap.dueSoon === 0 && (
                      <span className="text-green-600 font-medium">On track</span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Section 3: Active work across projects ───────────────────────── */}
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
                            <span className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${STATUS_DOT[log.status] ?? 'bg-gray-400'}`} />
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

      {/* ── Section 4: Today's meetings ──────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-4">Today&apos;s meetings</h2>
        <CalendarBriefing />
      </section>
    </div>
  )
}
