'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Notification {
  id: string
  type: string
  payload: Record<string, unknown>
  is_read: boolean
  created_at: string
}

const TYPE_ICON: Record<string, string> = {
  task_assigned: '📋',
  task_overdue: '🔴',
  milestone_due: '🏁',
  project_stale: '💤',
  invite_received: '✉️',
}

const TYPE_LABEL: Record<string, (p: Record<string, unknown>) => string> = {
  task_assigned: (p) => `Assigned to task: ${p.taskTitle}`,
  task_overdue: (p) => `Overdue: ${p.taskTitle}`,
  milestone_due: (p) => `Milestone due soon: ${p.milestoneTitle}`,
  project_stale: (p) => `No activity in ${p.projectName} for 5 days`,
  invite_received: (p) => `Invited to join ${p.projectName}`,
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  async function fetchNotifications() {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications ?? [])
      }
    } catch {
      // silently ignore; bell is non-critical
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60_000)
    return () => clearInterval(interval)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
  }

  async function markAllRead() {
    await fetch('/api/notifications/read-all', { method: 'POST' })
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  function handleClick(n: Notification) {
    markRead(n.id)
    setOpen(false)
    const p = n.payload
    if (n.type === 'task_assigned' || n.type === 'task_overdue') {
      router.push(`/projects/${p.projectId}`)
    } else if (n.type === 'milestone_due') {
      router.push(`/projects/${p.projectId}`)
    } else if (n.type === 'project_stale') {
      router.push(`/projects/${p.projectId}`)
    } else if (n.type === 'invite_received') {
      router.push(`/invites/${p.token}`)
    }
  }

  const unread = notifications.filter((n) => !n.is_read).length

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center h-6 w-6 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition"
        aria-label="Notifications"
      >
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-800">Notifications</span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-400">No notifications yet.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition ${n.is_read ? '' : 'bg-blue-50/40'}`}
                >
                  <span className="text-base shrink-0 mt-0.5">{TYPE_ICON[n.type] ?? '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${n.is_read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                      {TYPE_LABEL[n.type]?.(n.payload) ?? n.type}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{relativeTime(n.created_at)}</p>
                  </div>
                  {!n.is_read && (
                    <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
