import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createNotification } from '@/lib/notifications'

// Vercel cron: 0 8 * * * (daily 8am UTC)
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const today = new Date().toISOString().slice(0, 10)
  const threeDaysOut = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()

  // 1. Overdue tasks — notify assignees
  const { data: overdueTasks } = await supabase
    .from('tasks')
    .select('id, title, project_id, assignee_id')
    .lt('due_date', today)
    .not('status', 'in', '("done","cancelled")')
    .not('assignee_id', 'is', null)

  for (const task of overdueTasks ?? []) {
    const { data: project } = await supabase.from('projects').select('name').eq('id', task.project_id).single()
    await createNotification({
      userId: task.assignee_id!,
      type: 'task_overdue',
      payload: { taskId: task.id, taskTitle: task.title, projectId: task.project_id, projectName: project?.name ?? '' },
    })
  }

  // 2. Milestones due within 3 days — notify all active members
  const { data: dueMilestones } = await supabase
    .from('milestones')
    .select('id, title, project_id, target_date')
    .lte('target_date', threeDaysOut)
    .gte('target_date', today)
    .not('status', 'in', '("completed","cancelled")')

  for (const ms of dueMilestones ?? []) {
    const { data: members } = await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', ms.project_id)
      .eq('status', 'active')

    const { data: project } = await supabase.from('projects').select('name').eq('id', ms.project_id).single()
    for (const m of members ?? []) {
      await createNotification({
        userId: m.user_id,
        type: 'milestone_due',
        payload: { milestoneId: ms.id, milestoneTitle: ms.title, targetDate: ms.target_date, projectId: ms.project_id, projectName: project?.name ?? '' },
      })
    }
  }

  // 3. Stale projects (no progress_log updated in 5 days) — notify leaders
  const { data: recentLogs } = await supabase
    .from('progress_logs')
    .select('project_id')
    .gte('updated_at', fiveDaysAgo)

  const activeProjectIds = Array.from(new Set((recentLogs ?? []).map((l) => l.project_id)))

  const { data: allProjects } = await supabase.from('projects').select('id, name')
  const staleProjects = (allProjects ?? []).filter((p) => !activeProjectIds.includes(p.id))

  for (const proj of staleProjects) {
    const { data: leaders } = await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', proj.id)
      .eq('role', 'leader')
      .eq('status', 'active')

    for (const l of leaders ?? []) {
      await createNotification({
        userId: l.user_id,
        type: 'project_stale',
        payload: { projectId: proj.id, projectName: proj.name },
      })
    }
  }

  return NextResponse.json({ success: true })
}
