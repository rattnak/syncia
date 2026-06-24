'use client'

import { useEffect, useState } from 'react'

interface ChannelMessage {
  from: string
  body: string
  createdAt: string
}

function relativeTime(iso: string) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  return new Date(iso).toLocaleDateString()
}

interface Props {
  channelId: string
}

export default function ChannelFeed({ channelId }: Props) {
  const [messages, setMessages] = useState<ChannelMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/channels/messages?channelId=${encodeURIComponent(channelId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error)
        else setMessages(d.messages ?? [])
      })
      .catch(() => setError('Failed to load messages'))
      .finally(() => setLoading(false))
  }, [channelId])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400 py-3">
        <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        Loading channel messages…
      </div>
    )
  }

  if (error) return <p className="text-xs text-red-500 py-2">{error}</p>
  if (!messages.length) return <p className="text-xs text-gray-400 py-2">No recent messages in this channel.</p>

  return (
    <div className="flex flex-col gap-3">
      {messages.map((msg, i) => (
        <div key={i} className="flex gap-3">
          <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold shrink-0">
            {(msg.from[0] ?? '?').toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-medium text-gray-800">{msg.from}</span>
              <span className="text-xs text-gray-400">{relativeTime(msg.createdAt)}</span>
            </div>
            <p className="text-xs text-gray-600 mt-0.5 leading-snug line-clamp-3"
              dangerouslySetInnerHTML={{ __html: msg.body }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
