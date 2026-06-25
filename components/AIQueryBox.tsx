'use client'

import { useState } from 'react'

interface AIQueryBoxProps {
  projectId: string
  members: Array<{ user_id: string; name: string }>
}

export default function AIQueryBox({ projectId, members }: AIQueryBoxProps) {
  const [query, setQuery] = useState('')
  const [subjectUserId, setSubjectUserId] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setAnswer('')
    setError('')
    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          projectId,
          subjectUserId: subjectUserId || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAnswer(data.answer)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'AI query failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">✦</span>
        <div>
          <h2 className="font-semibold text-gray-800 text-sm">AI Agent</h2>
          <p className="text-xs text-gray-400">Ask about progress or blockers. Uses 1 ♥ per query.</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {[
          'Give me a full status summary of this project: what\'s done, what\'s in progress, what\'s blocked, and what\'s coming up.',
          'What tasks are overdue or at risk?',
          'Who is the most active contributor this week?',
        ].map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setQuery(preset)}
            className="text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-full border border-blue-100 transition truncate max-w-[200px]"
            title={preset}
          >
            {preset.length > 30 ? preset.slice(0, 30) + '…' : preset}
          </button>
        ))}
      </div>

      <form onSubmit={handleAsk} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What has the team been working on this week?"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium py-2 px-4 rounded-lg transition whitespace-nowrap"
          >
            {loading ? '…' : 'Ask'}
          </button>
        </div>
        {members.length > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400 shrink-0">Focus on</label>
            <select
              value={subjectUserId}
              onChange={(e) => setSubjectUserId(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-600 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All members</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>{m.name}</option>
              ))}
            </select>
          </div>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
      </form>

      {answer && (
        <div className="mt-4 bg-gray-50 rounded-lg p-4 text-sm text-gray-800 border border-gray-100 whitespace-pre-wrap">
          {answer}
        </div>
      )}
    </div>
  )
}
