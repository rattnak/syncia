import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: fetch the user's sharing preference for a project
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })

  const { data } = await supabase
    .from('project_members')
    .select('share_with_supervisor, supervisor_id')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  return NextResponse.json({ sharing: data ?? null })
}

// PATCH: toggle share_with_supervisor and/or set supervisor_id
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    projectId: string
    shareWithSupervisor?: boolean
    supervisorId?: string | null
  }

  if (!body.projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })

  const { data, error } = await supabase
    .from('project_members')
    .update({
      ...(typeof body.shareWithSupervisor === 'boolean' && { share_with_supervisor: body.shareWithSupervisor }),
      ...(body.supervisorId !== undefined && { supervisor_id: body.supervisorId }),
    })
    .eq('project_id', body.projectId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .select('share_with_supervisor, supervisor_id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sharing: data })
}
