'use client'

import { useState, useMemo } from 'react'
import Select from '@/components/ui/Select'

interface ProgressLog {
  id: string
  title: string
  description: string | null
  status: string
  created_at: string
  updated_at: string
  user_id: string
  author: { id: string; full_name: string | null; email: string } | null
}

interface ProgressLogFormProps {
  projectId: string
  currentUserId: string
  initialLogs: ProgressLog[]
}

type StatusFilter = 'all' | 'in_progress' | 'done' | 'not_started'

const STATUS_META: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  not_started: { label: 'Not Started', bg: 'bg-gray-100',  text: 'text-gray-600',  dot: 'bg-gray-400'  },
  in_progress:  { label: 'In Progress', bg: 'bg-blue-100',  text: 'text-blue-700',  dot: 'bg-blue-400'  },
  done:         { label: 'Done',         bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
}

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${meta.bg} ${meta.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

export default function ProgressLogForm({ projectId, currentUserId, initialLogs }: ProgressLogFormProps) {
  const [logs, setLogs] = useState<ProgressLog[]>(initialLogs)
  const [filter, setFilter] = useState<StatusFilter>('all')

  // ── Add form state ─────────────────────────────────────────────────
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('in_progress')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [showForm, setShowForm] = useState(false)

  // ── Edit state ─────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // ── Inline delete confirm ──────────────────────────────────────────
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ── Filtered list ──────────────────────────────────────────────────
  const filteredLogs = useMemo(() => {
    if (filter === 'all') return logs
    return logs.filter((l) => l.status === filter)
  }, [logs, filter])

  const counts = useMemo(() => ({
    all: logs.length,
    in_progress: logs.filter((l) => l.status === 'in_progress').length,
    done: logs.filter((l) => l.status === 'done').length,
    not_started: logs.filter((l) => l.status === 'not_started').length,
  }), [logs])

  // ── Helpers ────────────────────────────────────────────────────────
  async function refreshLogs() {
    const res = await fetch(`/api/progress-logs?projectId=${projectId}`)
    const data = await res.json()
    if (data.logs) setLogs(data.logs)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddError('')
    setAdding(true)
    try {
      const res = await fetch('/api/progress-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, title, description, status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await refreshLogs()
      setTitle('')
      setDescription('')
      setStatus('in_progress')
      setShowForm(false)
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Failed to add log.')
    } finally {
      setAdding(false)
    }
  }

  function startEdit(log: ProgressLog) {
    setEditingId(log.id)
    setEditTitle(log.title)
    setEditDescription(log.description ?? '')
    setEditStatus(log.status)
    setConfirmDeleteId(null)
  }

  async function saveEdit(id: string) {
    setEditSaving(true)
    try {
      const res = await fetch(`/api/progress-logs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, description: editDescription || null, status: editStatus }),
      })
      if (!res.ok) return
      setEditingId(null)
      await refreshLogs()
    } finally {
      setEditSaving(false)
    }
  }

  async function deleteLog(id: string) {
    setDeleting(true)
    try {
      await fetch(`/api/progress-logs/${id}`, { method: 'DELETE' })
      setLogs((prev) => prev.filter((l) => l.id !== id))
    } finally {
      setDeleting(false)
      setConfirmDeleteId(null)
    }
  }

  function formatDate(iso: string) {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  const filterTabs: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'done', label: 'Done' },
    { key: 'not_started', label: 'Not Started' },
  ]

  return (
    <div>
      {/* ── Filter tabs + add button ──────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition ${
                filter === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {counts[tab.key] > 0 && (
                <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${
                  filter === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'
                }`}>
                  {counts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setAddError('') }}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
        >
          {showForm ? (
            <>
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </>
          ) : (
            <>
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Log progress
            </>
          )}
        </button>
      </div>

      {/* ── Add log form ──────────────────────────────────────────────── */}
      {showForm && (
        <form onSubmit={handleAdd} className="mb-5 bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What did you work on?"
            required
            autoFocus
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Details, blockers, or next steps (optional)"
            rows={2}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
          />
          <div className="flex items-center justify-between gap-2">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </Select>
            <button
              type="submit"
              disabled={adding}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium py-2 px-5 rounded-lg transition"
            >
              {adding ? 'Adding…' : 'Add log'}
            </button>
          </div>
          {addError && <p className="text-xs text-red-500">{addError}</p>}
        </form>
      )}

      {/* ── Log list ──────────────────────────────────────────────────── */}
      {filteredLogs.length === 0 ? (
        <div className="text-center py-10">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 mb-3">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-sm text-gray-400">
            {filter === 'all' ? 'No progress logs yet. Log your first update above.' : `No ${STATUS_META[filter]?.label ?? filter} items.`}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredLogs.map((log) => {
            const isOwn = log.user_id === currentUserId
            const isEditing = editingId === log.id
            const isConfirmDelete = confirmDeleteId === log.id
            const authorName = log.author?.full_name ?? log.author?.email ?? 'Unknown'
            const initial = (log.author?.full_name ?? log.author?.email ?? '?')[0].toUpperCase()

            return (
              <div key={log.id} className={`rounded-xl border p-4 transition ${isEditing ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}>
                {isEditing ? (
                  /* ── Edit mode ── */
                  <div className="flex flex-col gap-2">
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      autoFocus
                      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={2}
                      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
                    />
                    <div className="flex items-center gap-2">
                      <Select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                      >
                        <option value="not_started">Not Started</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                      </Select>
                      <button
                        onClick={() => saveEdit(log.id)}
                        disabled={editSaving}
                        className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 transition font-medium disabled:bg-blue-400"
                      >
                        {editSaving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-white transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── View mode ── */
                  <div>
                    <div className="flex items-start gap-3">
                      {/* Author avatar */}
                      <div className="h-7 w-7 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">
                        {initial}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900">{log.title}</span>
                          <StatusBadge status={log.status} />
                        </div>
                        {log.description && (
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{log.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-400 font-medium">{authorName}</span>
                          <span className="text-gray-200">·</span>
                          <span className="text-xs text-gray-400">{formatDate(log.created_at)}</span>
                        </div>
                      </div>

                      {/* Actions (own logs only) */}
                      {isOwn && !isConfirmDelete && (
                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          <button
                            onClick={() => startEdit(log)}
                            className="text-xs text-gray-400 hover:text-blue-600 transition px-2 py-1 rounded hover:bg-blue-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(log.id)}
                            className="text-xs text-gray-400 hover:text-red-500 transition px-2 py-1 rounded hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Inline delete confirm */}
                    {isConfirmDelete && (
                      <div className="mt-3 flex items-center gap-2 pt-3 border-t border-red-100">
                        <span className="text-xs text-red-600 flex-1">Delete this log?</span>
                        <button
                          onClick={() => deleteLog(log.id)}
                          disabled={deleting}
                          className="text-xs font-medium text-white bg-red-500 hover:bg-red-600 disabled:bg-red-300 px-3 py-1 rounded-lg transition"
                        >
                          {deleting ? 'Deleting…' : 'Delete'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1 rounded-lg border border-gray-200 hover:bg-white transition"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
