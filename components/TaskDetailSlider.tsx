'use client'

import { useState, useEffect, useRef } from 'react'

interface Profile { id: string; full_name: string | null; email: string }

interface Subtask {
  id: string
  task_id: string
  title: string
  is_completed: boolean
  assignee_id: string | null
  due_date: string | null
  created_by: string
  created_at: string
}

interface Task {
  id: string
  project_id: string
  milestone_id: string | null
  title: string
  description: string | null
  assignee_id: string | null
  assignee?: Profile | null
  due_date: string | null
  priority: 'low' | 'medium' | 'high'
  status: 'not_started' | 'in_progress' | 'done' | 'cancelled'
  created_by: string
}

interface Props {
  task: Task | null
  initialSubtasks: Subtask[]
  members: Array<{ user_id: string; name: string; email: string }>
  onClose: () => void
  onTaskUpdated: (task: Omit<Task, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string }) => void
  onSubtasksUpdated: (taskId: string, subtasks: Subtask[]) => void
}

export default function TaskDetailSlider({ task, initialSubtasks, members, onClose, onTaskUpdated, onSubtasksUpdated }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<Task['priority']>('medium')
  const [status, setStatus] = useState<Task['status']>('not_started')
  const [saving, setSaving] = useState(false)
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [addingSubtask, setAddingSubtask] = useState(false)

  // Comments
  const [comments, setComments] = useState<Array<{
    id: string; body: string; created_at: string;
    author: { id: string; full_name: string | null; email: string } | null
  }>>([])
  const [commentBody, setCommentBody] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const commentsBottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description ?? '')
      setAssigneeId(task.assignee_id ?? '')
      setDueDate(task.due_date ?? '')
      setPriority(task.priority)
      setStatus(task.status)
      setSubtasks(initialSubtasks)
      // Load comments
      setComments([])
      fetch(`/api/tasks/${task.id}/comments`)
        .then((r) => r.json())
        .then((d) => setComments(d.comments ?? []))
        .catch(() => {})
    }
  }, [task, initialSubtasks])

  if (!task) return null

  async function save() {
    if (!task) return
    setSaving(true)
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || null,
          assigneeId: assigneeId || null,
          due_date: dueDate || null,
          priority,
          status,
        }),
      })
      const data = await res.json()
      if (!res.ok) return
      const assigneeMember = members.find((m) => m.user_id === (assigneeId || null))
      onTaskUpdated({
        ...data.task,
        assignee: assigneeMember ? { id: assigneeMember.user_id, full_name: assigneeMember.name, email: assigneeMember.email } : null,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function toggleSubtask(sub: Subtask) {
    const res = await fetch(`/api/tasks/${task!.id}/subtasks/${sub.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_completed: !sub.is_completed }),
    })
    const data = await res.json()
    if (res.ok) {
      const updated = subtasks.map((s) => s.id === sub.id ? data.subtask : s)
      setSubtasks(updated)
      onSubtasksUpdated(task!.id, updated)
    }
  }

  async function addSubtask(e: React.FormEvent) {
    e.preventDefault()
    if (!newSubtaskTitle.trim()) return
    setAddingSubtask(true)
    try {
      const res = await fetch(`/api/tasks/${task!.id}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newSubtaskTitle }),
      })
      const data = await res.json()
      if (res.ok) {
        const updated = [...subtasks, data.subtask]
        setSubtasks(updated)
        onSubtasksUpdated(task!.id, updated)
        setNewSubtaskTitle('')
      }
    } finally {
      setAddingSubtask(false)
    }
  }

  async function deleteSubtask(subId: string) {
    await fetch(`/api/tasks/${task!.id}/subtasks/${subId}`, { method: 'DELETE' })
    const updated = subtasks.filter((s) => s.id !== subId)
    setSubtasks(updated)
    onSubtasksUpdated(task!.id, updated)
  }

  async function postComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentBody.trim() || !task) return
    setPostingComment(true)
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: commentBody.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setComments((prev) => [...prev, data.comment])
        setCommentBody('')
        setTimeout(() => commentsBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      }
    } finally {
      setPostingComment(false)
    }
  }

  async function deleteComment(commentId: string) {
    if (!task) return
    await fetch(`/api/tasks/${task.id}/comments/${commentId}`, { method: 'DELETE' })
    setComments((prev) => prev.filter((c) => c.id !== commentId))
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

  const completed = subtasks.filter((s) => s.is_completed).length

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Slider panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 text-sm">Task detail</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition p-1 rounded hover:bg-gray-100">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
          {/* Title */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Add details, context, or blockers…"
              className="mt-1.5 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Row: status + priority */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Task['status'])}
                className="mt-1.5 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Task['priority'])}
                className="mt-1.5 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {/* Assignee + due date */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Assignee</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="mt-1.5 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>{m.name || m.email}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1.5 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
              />
            </div>
          </div>

          {/* Subtasks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Subtasks {subtasks.length > 0 && <span className="normal-case font-normal text-gray-400">({completed}/{subtasks.length})</span>}
              </label>
            </div>

            {subtasks.length > 0 && (
              <div className="mb-3 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-400 rounded-full transition-all"
                  style={{ width: subtasks.length ? `${Math.round((completed / subtasks.length) * 100)}%` : '0%' }}
                />
              </div>
            )}

            <div className="flex flex-col gap-1 mb-3">
              {subtasks.map((sub) => (
                <div key={sub.id} className="group flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50">
                  <button
                    onClick={() => toggleSubtask(sub)}
                    className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition ${sub.is_completed ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-blue-400'}`}
                  >
                    {sub.is_completed && (
                      <svg className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <span className={`flex-1 text-sm ${sub.is_completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>{sub.title}</span>
                  <button
                    onClick={() => deleteSubtask(sub.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition text-xs px-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={addSubtask} className="flex gap-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder="Add a subtask…"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={addingSubtask || !newSubtaskTitle.trim()}
                className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-600 text-xs font-medium py-1.5 px-3 rounded-lg transition"
              >
                Add
              </button>
            </form>
          </div>
        </div>

          {/* Comments */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
              Comments {comments.length > 0 && <span className="normal-case font-normal text-gray-400">({comments.length})</span>}
            </label>

            <div className="flex flex-col gap-3 mb-3">
              {comments.map((c) => (
                <div key={c.id} className="group flex gap-2">
                  <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">
                    {((c.author?.full_name ?? c.author?.email ?? '?')[0] ?? '?').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 bg-gray-50 rounded-lg px-3 py-2">
                    <div className="flex items-baseline gap-2 justify-between">
                      <span className="text-xs font-medium text-gray-700">
                        {c.author?.full_name ?? c.author?.email ?? 'Unknown'}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-gray-400">{relativeTime(c.created_at)}</span>
                        <button
                          onClick={() => deleteComment(c.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5 leading-snug">{c.body}</p>
                  </div>
                </div>
              ))}
              <div ref={commentsBottomRef} />
            </div>

            <form onSubmit={postComment} className="flex gap-2">
              <input
                type="text"
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="Add a comment…"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={postingComment || !commentBody.trim()}
                className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-600 text-xs font-medium py-1.5 px-3 rounded-lg transition"
              >
                Post
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || !title.trim()}
            className="text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-5 py-2 rounded-lg transition"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </>
  )
}
