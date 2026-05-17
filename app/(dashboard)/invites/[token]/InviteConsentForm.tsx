'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  token: string
  projectId: string
}

export default function InviteConsentForm({ token, projectId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<'accept' | 'decline' | null>(null)
  const [error, setError] = useState('')

  async function respond(action: 'accept' | 'decline') {
    setLoading(action)
    setError('')
    try {
      const res = await fetch(`/api/invites/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (action === 'accept') {
        router.push(`/projects/${projectId}`)
      } else {
        router.push('/dashboard')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}
      <div className="flex gap-3">
        <button
          onClick={() => respond('accept')}
          disabled={!!loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 rounded-lg transition text-sm flex items-center justify-center gap-2"
        >
          {loading === 'accept' ? (
            <>
              <span className="inline-block h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Joining…
            </>
          ) : 'Accept and join'}
        </button>
        <button
          onClick={() => respond('decline')}
          disabled={!!loading}
          className="flex-1 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg transition text-sm flex items-center justify-center gap-2"
        >
          {loading === 'decline' ? (
            <>
              <span className="inline-block h-3.5 w-3.5 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin" />
              Declining…
            </>
          ) : 'Decline'}
        </button>
      </div>
    </div>
  )
}
