import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Activate focus mode: set focused projects, mark others unavailable
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { focusedProjectIds }: { focusedProjectIds: string[] } = await req.json()

  const { data: memberships } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', user.id)
    .eq('status', 'active')

  if (!memberships) return NextResponse.json({ success: true })

  const upserts = memberships.map((m) => ({
    user_id: user.id,
    project_id: m.project_id,
    is_focused: focusedProjectIds.includes(m.project_id),
    updated_at: new Date().toISOString(),
  }))

  await supabase.from('availability').upsert(upserts, { onConflict: 'user_id,project_id' })

  return NextResponse.json({ success: true })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })

  const { data } = await supabase
    .from('availability')
    .select('user_id, is_focused, updated_at, profiles(full_name, email)')
    .eq('project_id', projectId)

  return NextResponse.json({ availability: data ?? [] })
}
