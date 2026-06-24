'use client'

import { useEffect, useState } from 'react'

interface Actor {
  id: string
  full_name: string | null
  email: string
}

interface ActivityItem {
  id: string
  actor: Actor | null
  entity_type: string
  action: string
  meta: Record<string, unknown>
  created_at: string
}

const ACTION_ICON: Record<string, string> = {
  created: '✦',
  updated: '✎',
  completed: '✓',
  deleted: '✕',
  joined: '→',
  commented: '💬',
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.floor(hr / 24)}d ago`
}

function describe(item: ActivityItem) {
  const name = item.actor?.full_name ?? item.actor?.email ?? 'Someone'
  const { entity_type, action, meta } = item
  const title = (meta.title ?? meta.taskTitle ?? meta.milestoneName ?? '') as string
  const entityLabel = entity_type === 'progress_log' ? 'a progress log' : `${entity_type} "${title}"`
  return `${name} ${action} ${entityLabel}`
}

interface Props {
  projectId: string
}

export default function ActivityFeed({ projectId }: Props) {
  const [items, setItems] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/projects/${projectId}/activity`)
      .then((r) => r.json())
      .then((d) => setItems(d.activity ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [projectId])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400 py-4">
        <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Loading activity…
      </div>
    )
  }

  if (!items.length) {
    return <p className="text-xs text-gray-400 py-3">No recent activity.</p>
  }

  return (
    <div className="flex flex-col">
      {items.map((item) => (
        <div key={item.id} className="flex gap-3 py-2.5 border-b border-gray-50 last:border-0">
          <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-xs shrink-0 mt-0.5">
            {ACTION_ICON[item.action] ?? '•'}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-700 leading-snug">{describe(item)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{relativeTime(item.created_at)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
