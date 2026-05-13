'use client'

import { useState } from 'react'

interface MeetingSchedulerProps {
  projectId: string
  memberEmails: string[]
  projectName: string
}

interface TimeSuggestion {
  start: string
  end: string
  score?: number       // from demo API
  confidence?: number  // from Graph API
}

export default function MeetingScheduler({ memberEmails, projectName }: MeetingSchedulerProps) {
  const [suggestions, setSuggestions] = useState<TimeSuggestion[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [booking, setBooking] = useState<string | null>(null)
  const [booked, setBooked] = useState<{ id: string; webLink: string } | null>(null)
  const [error, setError] = useState('')
  const [duration, setDuration] = useState(60)
  const [subject, setSubject] = useState(`${projectName} sync`)

  async function findTimes() {
    setError('')
    setLoadingSuggestions(true)
    setSuggestions([])
    setBooked(null)
    try {
      const res = await fetch('/api/calendar/find-times', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendeeEmails: memberEmails, durationMinutes: duration }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuggestions(data.suggestions ?? [])
      if (!data.suggestions?.length) setError('No available slots found in the next 2 weeks.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not fetch suggestions. Ensure Microsoft Calendar access is configured.')
    } finally {
      setLoadingSuggestions(false)
    }
  }

  async function book(slot: TimeSuggestion) {
    setBooking(slot.start)
    setError('')
    try {
      const res = await fetch('/api/calendar/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          start: slot.start,
          end: slot.end,
          attendeeEmails: memberEmails,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setBooked(data.event)
      setSuggestions([])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Booking failed')
    } finally {
      setBooking(null)
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="font-semibold text-gray-800 text-sm mb-1">Schedule a Meeting</h2>
      <p className="text-xs text-gray-400 mb-4">
        Find the earliest open slot across all team members and book directly.
      </p>

      <div className="flex flex-col gap-3 mb-4">
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Meeting subject"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 shrink-0">Duration:</label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
          >
            <option value={30}>30 min</option>
            <option value={60}>1 hour</option>
            <option value={90}>1.5 hours</option>
            <option value={120}>2 hours</option>
          </select>
          <button
            onClick={findTimes}
            disabled={loadingSuggestions}
            className="ml-auto bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium py-2 px-4 rounded-lg transition"
          >
            {loadingSuggestions ? 'Searching…' : 'Find times'}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

      {booked && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
          Meeting booked!{' '}
          <a href={booked.webLink} target="_blank" rel="noreferrer" className="underline">
            Open in Outlook
          </a>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-gray-500 font-medium">Available slots:</p>
          {suggestions.map((s) => (
            <div key={s.start} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-900">{formatDate(s.start)}</p>
                <p className="text-xs text-gray-400">→ {formatDate(s.end)}</p>
              </div>
              <button
                onClick={() => book(s)}
                disabled={booking === s.start}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-medium py-1.5 px-3 rounded-lg transition"
              >
                {booking === s.start ? 'Booking…' : 'Book'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
