import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardShell from '@/components/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const isDemo = process.env.DEMO_MODE === 'true'

  let email = 'c_mong@fhsu.edu'
  if (!isDemo) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
    email = user.email ?? ''
  }

  return (
    <DashboardShell email={email} isDemo={isDemo}>
      {children}
    </DashboardShell>
  )
}
