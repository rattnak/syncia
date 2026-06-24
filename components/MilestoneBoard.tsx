'use client'

import { useState } from 'react'

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
  created_at: string
  updated_at: string
}

interface Milestone {
  id: string
  project_id: string
  title: string
  description: string | null
  target_date: string | null
  status: 'open' | 'in_progress' | 'completed' | 'cancelled'
  created_by: string
  created_at: string
}

interface Props {
  projectId: string
  initialMilestones: Milestone[]
  initialTasks: Task[]
  members: Array<{ user_id: string; name: string; email: string }>
  isLeader: boolean
  onTaskClick: (task: Task, subtasks: Subtask[]) => void
}

const PRIORITY_META = {
  low:    { label: 'Low',    bg: 'bg-gray-100',   text: 'text-gray-600'  },
  medium: { label: 'Medium', bg: 'bg-blue-100',   text: 'text-blue-700'  },
  high:   { label: 'High',   bg: 'bg-red-100',    text: 'text-red-700'   },
}

const STATUS_META = {
  not_started: { label: 'Not Started', bg: 'bg-gray-100',   text: 'text-gray-600',   dot: 'bg-gray-400'  },
  in_progress: { label: 'In Progress', bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-400'  },
  done:        { label: 'Done',        bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500' },
  cancelled:   { label: 'Cancelled',   bg: 'bg-gray-100',   text: 'text-gray-400',   dot: 'bg-gray-300'  },
}

const MS_STATUS_META = {
  open:        { label: 'Open',      bg: 'bg-gray-100',   text: 'text-gray-600'  },
  in_progress: { label: 'Active',    bg: 'bg-blue-100',   text: 'text-blue-700'  },
  completed:   { label: 'Completed', bg: 'bg-green-100',  text: 'text-green-700' },
  cancelled:   { label: 'Cancelled', bg: 'bg-gray-100',   text: 'text-gray-400'  },
}

function dueDateClass(due: string | null): string {
  if (!due) return ''
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(due + 'T00:00:00')
  const diff = (d.getTime() - today.getTime()) / 86400000
  if (diff < 0) return 'text-red-600 font-semibold'
  if (diff <= 3) return 'text-amber-600 font-semibold'
  return 'text-gray-400'
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function Initials({ name, email }: { name: string | null; email: string }) {
  const letter = (name ?? email)[0]?.toUpperCase() ?? '?'
  return (
    <div className="h-6 w-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-semibold shrink-0">
      {letter}
    </div>
  )
}

export default function MilestoneBoard({ projectId, initialMilestones, initialTasks, members, isLeader, onTaskClick }: Props) {
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones)
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(initialMilestones.map((m) => [m.id, true]))
  )

  // Add milestone form
  const [showMsForm, setShowMsForm] = useState(false)
  const [msTitle, setMsTitle] = useState('')
  const [msDate, setMsDate] = useState('')
  const [msDesc, setMsDesc] = useState('')
  const [msAdding, setMsAdding] = useState(false)

  // Add task form state per milestone (milestoneId → bool)
  const [showTaskForm, setShowTaskForm] = useState<Record<string, boolean>>({})
  const [taskTitle, setTaskTitle] = useState<Record<string, string>>({})
  const [taskAssignee, setTaskAssignee] = useState<Record<string, string>>({})
  const [taskDue, setTaskDue] = useState<Record<string, string>>({})
  const [taskPriority, setTaskPriority] = useState<Record<string, string>>({})
  const [taskAdding, setTaskAdding] = useState<Record<string, boolean>>({})

  // Inline status update
  const [updatingTask, setUpdatingTask] = useState<string | null>(null)

  // Subtasks per task (loaded lazily when task detail opens)
  const [subtasksMap, setSubtasksMap] = useState<Record<string, Subtask[]>>({})

  // Filters
  const [filterAssignee, setFilterAssignee] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  function applyFilters(list: Task[]) {
    return list.filter((t) => {
      if (filterAssignee && t.assignee_id !== filterAssignee) return false
      if (filterPriority && t.priority !== filterPriority) return false
      if (filterStatus && t.status !== filterStatus) return false
      return true
    })
  }

  const activeFilters = [filterAssignee, filterPriority, filterStatus].filter(Boolean).length

  async function addMilestone(e: React.FormEvent) {
    e.preventDefault()
    setMsAdding(true)
    try {
      const res = await fetch('/api/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, title: msTitle, description: msDesc || null, target_date: msDate || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMilestones((prev) => [...prev, data.milestone])
      setExpanded((prev) => ({ ...prev, [data.milestone.id]: true }))
      setMsTitle(''); setMsDate(''); setMsDesc(''); setShowMsForm(false)
    } finally {
      setMsAdding(false)
    }
  }

  async function addTask(milestoneId: string, e: React.FormEvent) {
    e.preventDefault()
    setTaskAdding((prev) => ({ ...prev, [milestoneId]: true }))
    try {
      const assigneeId = taskAssignee[milestoneId] || null
      const assigneeMember = members.find((m) => m.user_id === assigneeId)
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          milestoneId,
          title: taskTitle[milestoneId],
          assigneeId: assigneeId || null,
          due_date: taskDue[milestoneId] || null,
          priority: taskPriority[milestoneId] || 'medium',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const enriched: Task = {
        ...data.task,
        assignee: assigneeMember ? { id: assigneeMember.user_id, full_name: assigneeMember.name, email: assigneeMember.email } : null,
      }
      setTasks((prev) => [...prev, enriched])
      setTaskTitle((prev) => ({ ...prev, [milestoneId]: '' }))
      setTaskAssignee((prev) => ({ ...prev, [milestoneId]: '' }))
      setTaskDue((prev) => ({ ...prev, [milestoneId]: '' }))
      setTaskPriority((prev) => ({ ...prev, [milestoneId]: 'medium' }))
      setShowTaskForm((prev) => ({ ...prev, [milestoneId]: false }))
    } finally {
      setTaskAdding((prev) => ({ ...prev, [milestoneId]: false }))
    }
  }

  async function updateTaskStatus(taskId: string, status: Task['status']) {
    setUpdatingTask(taskId)
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status } : t))
    } finally {
      setUpdatingTask(null)
    }
  }

  async function deleteMilestone(milestoneId: string) {
    await fetch(`/api/milestones/${milestoneId}`, { method: 'DELETE' })
    setMilestones((prev) => prev.filter((m) => m.id !== milestoneId))
    setTasks((prev) => prev.filter((t) => t.milestone_id !== milestoneId))
  }

  async function handleTaskClick(task: Task) {
    if (!subtasksMap[task.id]) {
      const res = await fetch(`/api/tasks/${task.id}/subtasks`)
      const data = await res.json()
      setSubtasksMap((prev) => ({ ...prev, [task.id]: data.subtasks ?? [] }))
      onTaskClick(task, data.subtasks ?? [])
    } else {
      onTaskClick(task, subtasksMap[task.id])
    }
  }

  function onSubtasksUpdated(taskId: string, updated: Subtask[]) {
    setSubtasksMap((prev) => ({ ...prev, [taskId]: updated }))
  }

  // Expose subtask updater so parent can call it after slider saves
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__syncSubtasks = onSubtasksUpdated
  }

  const tasksForMilestone = (msId: string) => applyFilters(tasks.filter((t) => t.milestone_id === msId))
  const unassignedTasks = applyFilters(tasks.filter((t) => !t.milestone_id))

  function msProgress(msId: string) {
    const t = tasksForMilestone(msId)
    if (!t.length) return null
    const done = t.filter((x) => x.status === 'done').length
    return { done, total: t.length, pct: Math.round((done / t.length) * 100) }
  }

  const allMilestoneGroups = [
    ...milestones.map((ms) => ({ type: 'milestone' as const, ms })),
    ...(unassignedTasks.length > 0 ? [{ type: 'unassigned' as const, ms: null }] : []),
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-800 text-sm">Milestones &amp; Tasks</h2>
          <p className="text-xs text-gray-400 mt-0.5">Structured work with due dates and assignees.</p>
        </div>
        {isLeader && (
          <button
            onClick={() => setShowMsForm((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
          >
            {showMsForm ? 'Cancel' : '+ Add milestone'}
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="px-5 py-2.5 border-b border-gray-100 flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-400 mr-1">Filter:</span>
        <select
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none"
        >
          <option value="">All assignees</option>
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>{m.name || m.email}</option>
          ))}
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none"
        >
          <option value="">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none"
        >
          <option value="">All statuses</option>
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
          <option value="cancelled">Cancelled</option>
        </select>
        {activeFilters > 0 && (
          <button
            onClick={() => { setFilterAssignee(''); setFilterPriority(''); setFilterStatus('') }}
            className="text-xs text-gray-400 hover:text-red-500 transition px-2 py-1 rounded-lg hover:bg-red-50"
          >
            Clear filters
          </button>
        )}
      </div>

      {showMsForm && (
        <form onSubmit={addMilestone} className="mx-5 mt-4 mb-2 bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col gap-3">
          <input
            type="text"
            value={msTitle}
            onChange={(e) => setMsTitle(e.target.value)}
            placeholder="Milestone title"
            required
            autoFocus
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            value={msDesc}
            onChange={(e) => setMsDesc(e.target.value)}
            placeholder="Description (optional)"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 shrink-0">Target date:</label>
            <input
              type="date"
              value={msDate}
              onChange={(e) => setMsDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none"
            />
            <button
              type="submit"
              disabled={msAdding || !msTitle.trim()}
              className="ml-auto bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium py-2 px-4 rounded-lg transition"
            >
              {msAdding ? 'Adding…' : 'Add'}
            </button>
          </div>
        </form>
      )}

      <div className="divide-y divide-gray-50">
        {allMilestoneGroups.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-gray-400">No milestones yet.{isLeader ? ' Add one above.' : ''}</p>
          </div>
        ) : (
          allMilestoneGroups.map(({ type, ms }) => {
            const msId = ms?.id ?? '__unassigned__'
            const isOpen = expanded[msId] ?? true
            const groupTasks = type === 'milestone' ? tasksForMilestone(ms!.id) : unassignedTasks
            const progress = type === 'milestone' ? msProgress(ms!.id) : null

            return (
              <div key={msId} className="px-5 py-4">
                {/* Milestone header */}
                <div className="flex items-center gap-3 mb-2">
                  <button
                    onClick={() => setExpanded((prev) => ({ ...prev, [msId]: !isOpen }))}
                    className="text-gray-400 hover:text-gray-600 transition shrink-0"
                  >
                    <svg className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {type === 'milestone' && ms ? (
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      <span className="text-sm font-semibold text-gray-800 truncate">{ms.title}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${MS_STATUS_META[ms.status].bg} ${MS_STATUS_META[ms.status].text}`}>
                        {MS_STATUS_META[ms.status].label}
                      </span>
                      {ms.target_date && (
                        <span className={`text-xs ${dueDateClass(ms.target_date)}`}>
                          {formatDate(ms.target_date)}
                        </span>
                      )}
                      {progress && (
                        <span className="text-xs text-gray-400 ml-1">{progress.done}/{progress.total}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm font-semibold text-gray-500 flex-1">Unassigned tasks</span>
                  )}

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setShowTaskForm((prev) => ({ ...prev, [msId]: !prev[msId] }))}
                      className="text-xs text-gray-400 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition"
                    >
                      + Task
                    </button>
                    {isLeader && type === 'milestone' && ms && (
                      <button
                        onClick={() => { if (confirm('Delete this milestone and its tasks?')) deleteMilestone(ms.id) }}
                        className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50 transition"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                {type === 'milestone' && progress && progress.total > 0 && (
                  <div className="ml-7 mb-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-400 rounded-full transition-all"
                      style={{ width: `${progress.pct}%` }}
                    />
                  </div>
                )}

                {/* Add task form */}
                {showTaskForm[msId] && (
                  <form
                    onSubmit={(e) => addTask(type === 'milestone' ? ms!.id : '__unassigned__', e)}
                    className="ml-7 mb-3 bg-gray-50 border border-gray-200 rounded-xl p-3 flex flex-col gap-2"
                  >
                    <input
                      type="text"
                      value={taskTitle[msId] ?? ''}
                      onChange={(e) => setTaskTitle((prev) => ({ ...prev, [msId]: e.target.value }))}
                      placeholder="Task title"
                      required
                      autoFocus
                      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={taskAssignee[msId] ?? ''}
                        onChange={(e) => setTaskAssignee((prev) => ({ ...prev, [msId]: e.target.value }))}
                        className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none"
                      >
                        <option value="">Unassigned</option>
                        {members.map((m) => (
                          <option key={m.user_id} value={m.user_id}>{m.name || m.email}</option>
                        ))}
                      </select>
                      <input
                        type="date"
                        value={taskDue[msId] ?? ''}
                        onChange={(e) => setTaskDue((prev) => ({ ...prev, [msId]: e.target.value }))}
                        className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none"
                      />
                      <select
                        value={taskPriority[msId] ?? 'medium'}
                        onChange={(e) => setTaskPriority((prev) => ({ ...prev, [msId]: e.target.value }))}
                        className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                      <button
                        type="submit"
                        disabled={taskAdding[msId]}
                        className="ml-auto bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-medium py-1.5 px-3 rounded-lg transition"
                      >
                        {taskAdding[msId] ? 'Adding…' : 'Add'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowTaskForm((prev) => ({ ...prev, [msId]: false }))}
                        className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* Task list */}
                {isOpen && (
                  <div className="ml-7 flex flex-col gap-1">
                    {groupTasks.length === 0 && !showTaskForm[msId] && (
                      <p className="text-xs text-gray-400 py-1">No tasks yet.</p>
                    )}
                    {groupTasks.map((task) => {
                      const sm = STATUS_META[task.status]
                      const pm = PRIORITY_META[task.priority]
                      return (
                        <div
                          key={task.id}
                          className="group flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition cursor-pointer"
                          onClick={() => handleTaskClick(task)}
                        >
                          {/* Status dot */}
                          <span className={`h-2 w-2 rounded-full shrink-0 ${sm.dot}`} />

                          <span className={`flex-1 text-sm truncate ${task.status === 'done' || task.status === 'cancelled' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                            {task.title}
                          </span>

                          {/* Priority badge */}
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${pm.bg} ${pm.text}`}>
                            {pm.label}
                          </span>

                          {/* Due date */}
                          {task.due_date && (
                            <span className={`text-xs shrink-0 ${dueDateClass(task.due_date)}`}>
                              {formatDate(task.due_date)}
                            </span>
                          )}

                          {/* Assignee */}
                          {task.assignee && (
                            <Initials name={task.assignee.full_name} email={task.assignee.email} />
                          )}

                          {/* Quick status toggle */}
                          <select
                            value={task.status}
                            disabled={updatingTask === task.id}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => updateTaskStatus(task.id, e.target.value as Task['status'])}
                            className="opacity-0 group-hover:opacity-100 border border-gray-200 rounded-lg px-1.5 py-0.5 text-xs bg-white focus:outline-none transition shrink-0"
                          >
                            <option value="not_started">Not Started</option>
                            <option value="in_progress">In Progress</option>
                            <option value="done">Done</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
