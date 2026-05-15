'use client'

import { useState } from 'react'

interface PendingInvite {
  email: string
  url: string
}

export default function InviteMemberForm({ projectId }: { projectId: string }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [copied, setCopied] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Add to local list so leader can copy the link
      setPendingInvites((prev) => {
        const already = prev.some((i) => i.email === data.email)
        if (already) return prev.map((i) => i.email === data.email ? { ...i, url: data.inviteUrl } : i)
        return [{ email: data.email, url: data.inviteUrl }, ...prev]
      })
      setEmail('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create invite.')
    } finally {
      setLoading(false)
    }
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(url)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // Fallback: select the input text
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="invite-email" className="text-xs font-medium text-gray-600">
            FHSU email address
          </label>
          <div className="flex gap-2">
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError('') }}
              placeholder="colleague@fhsu.edu"
              required
              className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="shrink-0 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-3 rounded-lg transition text-sm"
            >
              {loading ? '…' : 'Invite'}
            </button>
          </div>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <p className="text-xs text-gray-400">
          Generates a shareable link. The invitee must accept before joining.
        </p>
      </form>

      {pendingInvites.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-gray-600">Pending invite links</p>
          {pendingInvites.map((inv) => (
            <div key={inv.email} className="rounded-lg border border-gray-100 bg-gray-50 p-3 flex flex-col gap-1.5">
              <p className="text-xs font-medium text-gray-700 truncate">{inv.email}</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={inv.url}
                  className="flex-1 min-w-0 text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-500 select-all"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  onClick={() => copyLink(inv.url)}
                  className="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-800 transition px-2 py-1 rounded border border-blue-200 bg-blue-50 hover:bg-blue-100 whitespace-nowrap"
                >
                  {copied === inv.url ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
