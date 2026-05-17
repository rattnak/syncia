import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import InviteConsentForm from './InviteConsentForm'

export default async function InvitePage({ params }: { params: { token: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login`)

  const { data: invite } = await supabase
    .from('invites')
    .select('id, status, invited_email, expires_at, project_id')
    .eq('token', params.token)
    .single()

  if (!invite) notFound()

  if (invite.invited_email !== user.email) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 mb-4">
          <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-gray-900 mb-2">Wrong account</h1>
        <p className="text-gray-500 text-sm mb-4">
          This invite was sent to <strong>{invite.invited_email}</strong>. Sign in with that account to accept it.
        </p>
        <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">Back to dashboard</Link>
      </div>
    )
  }

  if (invite.status !== 'pending') {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <div className={`inline-flex h-12 w-12 items-center justify-center rounded-full mb-4 ${invite.status === 'accepted' ? 'bg-green-100' : 'bg-gray-100'}`}>
          <svg className={`h-6 w-6 ${invite.status === 'accepted' ? 'text-green-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-gray-900 mb-2">
          Invite already {invite.status}
        </h1>
        <p className="text-gray-500 text-sm mb-4">This invite link has already been used.</p>
        <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">Back to dashboard</Link>
      </div>
    )
  }

  if (new Date(invite.expires_at) < new Date()) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
          <svg className="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-gray-900 mb-2">Invite expired</h1>
        <p className="text-gray-500 text-sm mb-4">Invite links expire after 7 days. Ask the project leader to send a new one.</p>
        <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">Back to dashboard</Link>
      </div>
    )
  }

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, description')
    .eq('id', invite.project_id)
    .single()

  return (
    <div className="max-w-md mx-auto mt-12 px-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col gap-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 mb-3">
            <svg className="h-7 w-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">You have been invited</h1>
          <p className="text-gray-500 text-sm mt-1">
            Join <strong className="text-gray-800">{project?.name ?? 'a project'}</strong> on Syncia
          </p>
        </div>

        {project?.description && (
          <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 text-center">{project.description}</p>
        )}

        {/* Consent notice */}
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
          <p className="text-xs font-semibold text-blue-800 mb-2 uppercase tracking-wide">Before you join</p>
          <ul className="space-y-1.5">
            {[
              'Your availability status will be visible to all project members.',
              'Progress logs you create will be visible to team members.',
              'Supervisor sharing is off by default — you choose who sees your work.',
              'You can leave this project at any time.',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-blue-700">
                <svg className="h-3.5 w-3.5 text-blue-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <InviteConsentForm token={params.token} projectId={invite.project_id} />
      </div>
    </div>
  )
}
