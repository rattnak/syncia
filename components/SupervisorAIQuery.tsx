'use client'

import { useState } from 'react'
import Select from '@/components/ui/Select'

interface SupervisorAIQueryProps {
  members: Array<{ user_id: string; name: string }>
}

export default function SupervisorAIQuery({ members }: SupervisorAIQueryProps) {
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
          <p className="text-xs text-gray-400">Ask about a member&apos;s work. Uses 1 ♥ per query.</p>
        </div>
      </div>

      <form onSubmit={handleAsk} className="flex flex-col gap-3">
        <Select
          value={subjectUserId}
          onChange={(e) => setSubjectUserId(e.target.value)}
        >
          <option value="">All members</option>
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>{m.name}</option>
          ))}
        </Select>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What has this member been working on this week? Is anyone blocked?"
          rows={3}
          required
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium py-2 px-4 rounded-lg transition"
        >
          {loading ? 'Asking…' : 'Ask AI'}
        </button>
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
