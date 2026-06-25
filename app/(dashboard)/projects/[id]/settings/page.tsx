import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import DashboardShell from '@/components/DashboardShell'
import ProjectSettingsClient from './ProjectSettingsClient'

export default async function ProjectSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, description')
    .eq('id', id)
    .single()

  if (!project) notFound()

  const { data: myMembership } = await supabase
    .from('project_members')
    .select('role, status')
    .eq('project_id', id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!myMembership) redirect('/dashboard')

  const { data: profile } = await supabase
    .from('profiles').select('email').eq('id', user.id).single()

  return (
    <DashboardShell email={profile?.email ?? user.email ?? ''}>
      <ProjectSettingsClient
        project={project}
        isLeader={myMembership.role === 'leader'}
      />
    </DashboardShell>
  )
}
