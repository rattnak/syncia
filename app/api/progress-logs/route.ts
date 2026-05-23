import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })

  // Verify membership
  const { data: membership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Fetch all logs for this project, join profile info
  const { data: logs, error } = await supabase
    .from('progress_logs')
    .select('id, title, description, status, created_at, updated_at, user_id')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch profiles for authors
  const userIds = Array.from(new Set((logs ?? []).map((l) => l.user_id)))
  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('id, full_name, email').in('id', userIds)
    : { data: [] }

  const enriched = (logs ?? []).map((l) => ({
    ...l,
    author: profiles?.find((p) => p.id === l.user_id) ?? null,
  }))

  return NextResponse.json({ logs: enriched })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId, title, description, status } = await req.json()
  if (!projectId || !title) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  // Verify active membership
  const { data: membership } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: log, error } = await supabase
    .from('progress_logs')
    .insert({
      project_id: projectId,
      user_id: user.id,
      title,
      description: description ?? null,
      status: status ?? 'not_started',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ log })
}
