import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import ProjectPageClient from './ProjectPageClient'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, description, created_at, teams_channel_id, teams_channel_url')
    .eq('id', id)
    .single()

  if (!project) notFound()

  const { data: myMembership } = await supabase
    .from('project_members')
    .select('role, status, share_with_supervisor, supervisor_id')
    .eq('project_id', id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!myMembership) redirect('/dashboard')

  // Members + profiles
  const { data: memberRows } = await supabase
    .from('project_members')
    .select('role, status, user_id')
    .eq('project_id', id)
    .in('status', ['active', 'pending'])

  const memberUserIds = memberRows?.map((m) => m.user_id) ?? []
  const { data: profileRows } = memberUserIds.length
    ? await supabase.from('profiles').select('id, full_name, email, role').in('id', memberUserIds)
    : { data: [] }

  const members = (memberRows ?? []).map((m) => ({
    ...m,
    profile: profileRows?.find((p) => p.id === m.user_id) ?? null,
  }))

  // Availability
  const { data: availRows } = memberUserIds.length
    ? await supabase
        .from('availability')
        .select('user_id, is_focused')
        .eq('project_id', id)
        .in('user_id', memberUserIds)
    : { data: [] }

  const availMap: Record<string, boolean> = {}
  for (const a of availRows ?? []) availMap[a.user_id] = a.is_focused

  // Progress logs
  const { data: logsRaw } = await supabase
    .from('progress_logs')
    .select('id, title, description, status, created_at, updated_at, user_id')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  const logUserIds = Array.from(new Set((logsRaw ?? []).map((l) => l.user_id)))
  const { data: logProfiles } = logUserIds.length
    ? await supabase.from('profiles').select('id, full_name, email').in('id', logUserIds)
    : { data: [] }

  const logs = (logsRaw ?? []).map((l) => ({
    ...l,
    author: logProfiles?.find((p) => p.id === l.user_id) ?? null,
  }))

  // ALL supervisors (not just project members) for sharing settings
  const { data: allSupervisors } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'supervisor')

  const supervisors = (allSupervisors ?? []).map((p) => ({
    id: p.id,
    name: p.full_name ?? p.email ?? '',
    email: p.email ?? '',
  }))

  // Milestones + tasks + subtasks
  const { data: milestonesRaw } = await supabase
    .from('milestones')
    .select('*')
    .eq('project_id', id)
    .order('target_date', { ascending: true })

  const { data: tasksRaw } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', id)
    .order('due_date', { ascending: true })

  const taskIds = (tasksRaw ?? []).map((t) => t.id)
  const { data: subtasksRaw } = taskIds.length
    ? await supabase.from('subtasks').select('*').in('task_id', taskIds).order('created_at', { ascending: true })
    : { data: [] }

  // Enrich tasks with assignee profiles
  const taskAssigneeIds = Array.from(new Set((tasksRaw ?? []).map((t) => t.assignee_id).filter(Boolean))) as string[]
  const { data: taskProfiles } = taskAssigneeIds.length
    ? await supabase.from('profiles').select('id, full_name, email').in('id', taskAssigneeIds)
    : { data: [] }

  const milestones = milestonesRaw ?? []
  const tasks = (tasksRaw ?? []).map((t) => ({
    ...t,
    assignee: taskProfiles?.find((p) => p.id === t.assignee_id) ?? null,
  }))
  const subtasks = subtasksRaw ?? []

  const isLeader = myMembership.role === 'leader'
  const activeMembers = members.filter((m) => m.status === 'active')

  const memberEmailsForScheduler = activeMembers
    .map((m) => m.profile?.email)
    .filter((e): e is string => !!e)

  const membersForAI = activeMembers.map((m) => ({
    user_id: m.user_id,
    name: m.profile?.full_name ?? m.profile?.email ?? m.user_id,
  }))

  const membersForBoard = activeMembers.map((m) => ({
    user_id: m.user_id,
    name: m.profile?.full_name ?? m.profile?.email ?? m.user_id,
    email: m.profile?.email ?? '',
  }))

  return (
    <ProjectPageClient
      project={project}
      myMembership={{ ...myMembership, user_id: user.id }}
      members={members}
      availMap={availMap}
      logs={logs}
      supervisors={supervisors}
      isLeader={isLeader}
      memberEmailsForScheduler={memberEmailsForScheduler}
      membersForAI={membersForAI}
      membersForBoard={membersForBoard}
      milestones={milestones}
      tasks={tasks}
      subtasks={subtasks}
    />
  )
}
