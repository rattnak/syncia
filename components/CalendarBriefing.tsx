'use client'

import { useEffect, useState } from 'react'

interface CalendarEvent {
  id: string
  subject: string
  start: string
  end: string
  attendeeEmails: string[]
  onlineMeetingUrl?: string  // from Graph API
  joinUrl?: string           // from demo data
  projectId?: string | null
  projectName?: string | null
}

export default function CalendarBriefing() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/calendar/events?days=1')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error)
        else setEvents(d.events ?? [])
      })
      .catch(() => setError('Could not load calendar. Ensure Microsoft Calendar access is configured.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 text-sm text-gray-400 animate-pulse">
        Loading calendar…
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 text-sm text-yellow-700">
        <p className="font-medium mb-1">Calendar unavailable</p>
        <p className="text-xs">{error}</p>
        <p className="text-xs mt-1">
          Outlook Calendar integration requires Microsoft Graph API access (Phase 4).
          Once configured, your meetings will appear here matched to their project context.
        </p>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-5 text-sm text-gray-400 text-center">
        No meetings scheduled for today.
      </div>
    )
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col gap-3">
      {events.map((event) => (
        <div key={event.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-4">
          <div className="text-xs text-gray-500 shrink-0 pt-0.5 w-20 text-right">
            <p>{formatTime(event.start)}</p>
            <p className="text-gray-300">→ {formatTime(event.end)}</p>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">{event.subject}</p>
            {event.projectName && (
              <span className="inline-block mt-1 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                {event.projectName}
              </span>
            )}
            {(event.onlineMeetingUrl ?? event.joinUrl) && (
              <a
                href={(event.onlineMeetingUrl ?? event.joinUrl)!}
                target="_blank"
                rel="noreferrer"
                className="block mt-1.5 text-xs text-blue-600 hover:underline"
              >
                Join Teams meeting
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
