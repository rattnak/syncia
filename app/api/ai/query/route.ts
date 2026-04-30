import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { createClient } from '@/lib/supabase/server'
import { runAgentQuery } from '@/lib/ai/agent'

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { query, projectId, subjectUserId } = await req.json()
  if (!query) return NextResponse.json({ error: 'Missing query' }, { status: 400 })

  const supabase = createClient()

  // Resolve requester's internal user ID
  const { data: requester } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email)
    .single()
  if (!requester) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Check and deduct heart
  const { data: hearts } = await supabase
    .from('hearts')
    .select('id, remaining')
    .eq('user_id', requester.id)
    .single()

  if (!hearts || hearts.remaining < 1) {
    return NextResponse.json({ error: 'No hearts remaining. Try again tomorrow.' }, { status: 429 })
  }

  await supabase
    .from('hearts')
    .update({ remaining: hearts.remaining - 1 })
    .eq('id', hearts.id)

  // Fetch relevant progress logs
  let logsQuery = supabase.from('progress_logs').select('title,description,status,created_at')
  if (projectId) logsQuery = logsQuery.eq('project_id', projectId)
  if (subjectUserId) logsQuery = logsQuery.eq('user_id', subjectUserId)
  const { data: logs } = await logsQuery.order('created_at', { ascending: false }).limit(30)

  const answer = await runAgentQuery({
    requesterId: requester.id,
    subjectUserId,
    projectId,
    query,
    progressLogs: logs ?? [],
  })

  return NextResponse.json({ answer })
}
