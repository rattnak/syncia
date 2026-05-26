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

  // Run AI — deduct heart only if the call succeeds
  const answer = await runAgentQuery({
    requesterId: user.id,
    subjectUserId,
    projectId,
    query,
    progressLogs: logs ?? [],
  })

  await supabase
    .from('hearts')
    .update({ remaining: hearts.remaining - 1 })
    .eq('id', hearts.id)

  return NextResponse.json({ answer })
}
