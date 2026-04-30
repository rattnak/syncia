import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const session = await getServerSession()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient()
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email)
    .single()
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { data: projects } = await supabase
    .from('project_members')
    .select('role, status, projects(id, name, description, created_at)')
    .eq('user_id', user.id)
    .eq('status', 'active')

  return NextResponse.json({ projects: projects ?? [] })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, description } = await req.json()
  if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 })

  const supabase = createClient()
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email)
    .single()
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { data: project, error } = await supabase
    .from('projects')
    .insert({ name, description: description ?? null, created_by: user.id })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Creator becomes the project leader
  await supabase.from('project_members').insert({
    project_id: project.id,
    user_id: user.id,
    role: 'leader',
    status: 'active',
    joined_at: new Date().toISOString(),
  })

  // Seed hearts for user if not present
  await supabase
    .from('hearts')
    .upsert({ user_id: user.id, remaining: 10, daily_limit: 10 }, { onConflict: 'user_id' })

  return NextResponse.json({ project })
}
