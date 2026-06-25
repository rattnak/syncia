import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runAgentQuery } from '@/lib/ai/agent'

export async function POST(req: NextRequest) {
  // Demo mode: return a canned answer so the UI can be previewed
  if (process.env.DEMO_MODE === 'true') {
    const { query } = await req.json()
    return NextResponse.json({
      answer: `[Demo] This is a simulated AI response to: "${query}". In production this would be answered by Claude Haiku using live progress log data.`,
    })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { query, projectId, subjectUserId } = await req.json()
  if (!query) return NextResponse.json({ error: 'Missing query' }, { status: 400 })

  // Check heart balance (but don't deduct yet — only charge on success)
  const { data: hearts } = await supabase
    .from('hearts')
    .select('id, remaining')
    .eq('user_id', user.id)
    .single()

  if (!hearts || hearts.remaining < 1) {
    return NextResponse.json({ error: 'No hearts remaining. Try again tomorrow.' }, { status: 429 })
  }

  let logsQuery = supabase.from('progress_logs').select('title,description,status,created_at')
  if (projectId) logsQuery = logsQuery.eq('project_id', projectId)
  if (subjectUserId) logsQuery = logsQuery.eq('user_id', subjectUserId)
  const { data: logs } = await logsQuery.order('created_at', { ascending: false }).limit(30)

  // Fetch tasks and milestones for richer AI context
  let tasks: Array<{ title: string; status: string; assignee: string | null; due_date: string | null; priority: string }> = []
  let milestones: Array<{ title: string; status: string; target_date: string | null }> = []

  if (projectId) {
    const { data: taskRows } = await supabase
      .from('tasks')
      .select('title, status, due_date, priority, assignee_id')
      .eq('project_id', projectId)
      .not('status', 'in', '(cancelled)')
      .order('due_date', { ascending: true })
      .limit(40)

    const assigneeIds = Array.from(new Set((taskRows ?? []).map((t) => t.assignee_id).filter(Boolean))) as string[]
    const { data: assigneeProfiles } = assigneeIds.length
      ? await supabase.from('profiles').select('id, full_name, email').in('id', assigneeIds)
      : { data: [] }

    tasks = (taskRows ?? []).map((t) => ({
      title: t.title,
      status: t.status,
      due_date: t.due_date,
      priority: t.priority,
      assignee: assigneeProfiles?.find((p) => p.id === t.assignee_id)?.full_name
        ?? assigneeProfiles?.find((p) => p.id === t.assignee_id)?.email
        ?? null,
    }))

    const { data: msRows } = await supabase
      .from('milestones')
      .select('title, status, target_date')
      .eq('project_id', projectId)
      .not('status', 'in', '(cancelled)')
      .order('target_date', { ascending: true })

    milestones = (msRows ?? []).map((m) => ({ title: m.title, status: m.status, target_date: m.target_date }))
  }

  // Run AI — deduct heart only if the call succeeds
  let answer: string
  try {
    answer = await runAgentQuery({
      requesterId: user.id,
      subjectUserId,
      projectId,
      query,
      progressLogs: logs ?? [],
      tasks,
      milestones,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'AI request failed'
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  await supabase
    .from('hearts')
    .update({ remaining: hearts.remaining - 1 })
    .eq('id', hearts.id)

  return NextResponse.json({ answer })
}
