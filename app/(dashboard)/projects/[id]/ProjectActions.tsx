'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// ── Edit project details ──────────────────────────────────────────────────────

interface EditProjectFormProps {
  projectId: string
  currentName: string
  currentDescription: string | null
  onSaved: (name: string, description: string | null) => void
  onCancel: () => void
}

export function EditProjectForm({ projectId, currentName, currentDescription, onSaved, onCancel }: EditProjectFormProps) {
  const [name, setName] = useState(currentName)
  const [description, setDescription] = useState(currentDescription ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onSaved(name.trim(), description.trim() || null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4 mt-2">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600">Project name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={80}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600">Description <span className="text-gray-400">(optional)</span></label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium py-1.5 px-4 rounded-lg transition">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700 py-1.5 px-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition">
          Cancel
        </button>
      </div>
    </form>
  )
}

// ── Leave project button ──────────────────────────────────────────────────────

interface LeaveProjectButtonProps {
  projectId: string
}

export function LeaveProjectButton({ projectId }: LeaveProjectButtonProps) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLeave() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leave' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to leave project.')
      setLoading(false)
      setConfirm(false)
    }
  }

  if (error) {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-xs text-red-600">{error}</p>
        <button onClick={() => setError('')} className="text-xs text-gray-500 hover:underline self-start">Dismiss</button>
      </div>
    )
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-600">Are you sure you want to leave this project?</span>
        <button
          onClick={handleLeave}
          disabled={loading}
          className="text-xs font-medium text-red-600 hover:text-red-700 border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg transition"
        >
          {loading ? 'Leaving…' : 'Yes, leave'}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="text-xs text-gray-400 hover:text-red-600 transition"
    >
      Leave project
    </button>
  )
}

// ── Promote / demote member (leaders only) ───────────────────────────────────

interface ChangeRoleButtonProps {
  projectId: string
  targetUserId: string
  currentRole: string        // 'leader' | 'member'
  onRoleChanged: (newRole: string) => void
}

export function ChangeRoleButton({ projectId, targetUserId, currentRole, onRoleChanged }: ChangeRoleButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const newRole = currentRole === 'leader' ? 'member' : 'leader'
  const label = currentRole === 'leader' ? 'Demote' : 'Promote'

  async function handleChange() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/members?projectId=${projectId}&userId=${targetUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onRoleChanged(newRole)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to change role.')
    } finally {
      setLoading(false)
    }
  }

  if (error) {
    return <span className="text-xs text-red-500 cursor-pointer" onClick={() => setError('')}>{error}</span>
  }

  return (
    <button
      onClick={handleChange}
      disabled={loading}
      title={`${label} to ${newRole}`}
      className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-blue-600 transition px-1.5 py-0.5 rounded hover:bg-blue-50 disabled:opacity-50"
    >
      {loading ? '…' : label}
    </button>
  )
}

// ── Remove member button (leaders only) ──────────────────────────────────────

interface RemoveMemberButtonProps {
  projectId: string
  targetUserId: string
  targetName: string
  onRemoved: () => void
}

export function RemoveMemberButton({ projectId, targetUserId, targetName, onRemoved }: RemoveMemberButtonProps) {
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleRemove() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/members?projectId=${projectId}&userId=${targetUserId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onRemoved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove member.')
      setLoading(false)
      setConfirm(false)
    }
  }

  if (error) {
    return <span className="text-xs text-red-500 cursor-pointer" onClick={() => setError('')}>{error}</span>
  }

  if (confirm) {
    return (
      <span className="flex items-center gap-1">
        <button
          onClick={handleRemove}
          disabled={loading}
          className="text-xs text-red-600 hover:text-red-700 font-medium"
        >
          {loading ? '…' : 'Remove'}
        </button>
        <button onClick={() => setConfirm(false)} className="text-xs text-gray-400 hover:text-gray-600">
          Cancel
        </button>
      </span>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      title={`Remove ${targetName}`}
      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition ml-1"
    >
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  )
}
