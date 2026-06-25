'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Project {
  id: string
  name: string
  description: string | null
}

interface Props {
  project: Project
  isLeader: boolean
}

export default function ProjectSettingsClient({ project, isLeader }: Props) {
  const router = useRouter()

  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description ?? '')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [saveError, setSaveError] = useState('')

  const [leaveConfirm, setLeaveConfirm] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [leaveError, setLeaveError] = useState('')

  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setSaveMsg(''); setSaveError('')
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      })
      if (res.ok) { setSaveMsg('Saved.'); router.refresh() }
      else { const d = await res.json(); setSaveError(d.error ?? 'Failed to save.') }
    } finally { setSaving(false) }
  }

  async function leaveProject() {
    setLeaving(true); setLeaveError('')
    const res = await fetch(`/api/projects/${project.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'leave' }),
    })
    if (res.ok) { router.push('/dashboard') }
    else { const d = await res.json(); setLeaveError(d.error ?? 'Failed.'); setLeaving(false) }
  }

  async function deleteProject() {
    setDeleting(true); setDeleteError('')
    const res = await fetch(`/api/projects/${project.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete' }),
    })
    if (res.ok) { router.push('/dashboard') }
    else { const d = await res.json(); setDeleteError(d.error ?? 'Failed.'); setDeleting(false) }
  }

  return (
    <div className="max-w-xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href={`/projects/${project.id}`} className="hover:text-gray-700 transition">{project.name}</Link>
        <span>/</span>
        <span className="text-gray-700">Settings</span>
      </div>

      <h1 className="text-xl font-semibold text-gray-900">Project settings</h1>

      {/* General */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">General</h2>
        {isLeader ? (
          <form onSubmit={saveDetails} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Project name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1.5 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1.5 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              {saveMsg && <span className="text-sm text-green-600">{saveMsg}</span>}
              {saveError && <span className="text-sm text-red-500">{saveError}</span>}
            </div>
          </form>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-700 font-medium">{project.name}</p>
            {project.description && <p className="text-sm text-gray-500">{project.description}</p>}
            <p className="text-xs text-gray-400 mt-2">Only project leaders can edit these settings.</p>
          </div>
        )}
      </section>

      {/* Danger zone */}
      <section className="bg-white rounded-xl border border-red-200 p-6 space-y-5">
        <h2 className="text-sm font-semibold text-red-700">Danger zone</h2>

        {/* Leave */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-800">Leave project</p>
              <p className="text-xs text-gray-400 mt-0.5">You will lose access to this project&apos;s tasks and logs.</p>
            </div>
            {!leaveConfirm && (
              <button
                onClick={() => setLeaveConfirm(true)}
                className="shrink-0 text-sm font-medium text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-4 py-1.5 rounded-lg transition"
              >
                Leave
              </button>
            )}
          </div>
          {leaveConfirm && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
              <p className="text-sm text-red-800 font-medium">Are you sure you want to leave?</p>
              <p className="text-xs text-red-600">You will need a new invite to rejoin.</p>
              <div className="flex gap-2">
                <button
                  onClick={leaveProject}
                  disabled={leaving}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition"
                >
                  {leaving ? 'Leaving…' : 'Yes, leave project'}
                </button>
                <button
                  onClick={() => setLeaveConfirm(false)}
                  className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 bg-white px-4 py-1.5 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
              {leaveError && <p className="text-xs text-red-600">{leaveError}</p>}
            </div>
          )}
        </div>

        {/* Delete — leaders only */}
        {isLeader && (
          <div className="border-t border-red-100 pt-5 space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Delete project</p>
              <p className="text-xs text-gray-400 mt-0.5">
                This permanently deletes the project, all milestones, tasks, and logs. This cannot be undone.
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Type <strong>{project.name}</strong> to confirm</label>
              <input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={project.name}
                className="mt-1.5 w-full border border-red-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
            <button
              onClick={deleteProject}
              disabled={deleting || deleteConfirm !== project.name}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
            >
              {deleting ? 'Deleting…' : 'Delete project permanently'}
            </button>
            {deleteError && <p className="text-xs text-red-500">{deleteError}</p>}
          </div>
        )}
      </section>
    </div>
  )
}
