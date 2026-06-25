'use client'

import { useState, useEffect } from 'react'
import Select from '@/components/ui/Select'

interface SharingSettingsProps {
  projectId: string
  supervisors: Array<{ id: string; name: string; email: string }>
}

export default function SharingSettings({ projectId, supervisors }: SharingSettingsProps) {
  const [shareWithSupervisor, setShareWithSupervisor] = useState(false)
  const [supervisorId, setSupervisorId] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch(`/api/members/sharing?projectId=${projectId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.sharing) {
          setShareWithSupervisor(d.sharing.share_with_supervisor)
          setSupervisorId(d.sharing.supervisor_id ?? '')
        }
        setLoaded(true)
      })
  }, [projectId])

  async function save() {
    setSaving(true)
    setSaved(false)
    try {
      await fetch('/api/members/sharing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          shareWithSupervisor,
          supervisorId: supervisorId || null,
        }),
      })
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="font-semibold text-gray-800 text-sm mb-1">Sharing Settings</h2>
      <p className="text-xs text-gray-400 mb-4">
        Control who can see your progress logs for this project.
      </p>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={shareWithSupervisor}
          onChange={(e) => { setShareWithSupervisor(e.target.checked); setSaved(false) }}
          className="mt-0.5 accent-blue-600"
        />
        <div>
          <p className="text-sm font-medium text-gray-800">Share with supervisor</p>
          <p className="text-xs text-gray-400">
            Grants read-only access to your progress logs on their supervisor dashboard.
            Default is off.
          </p>
        </div>
      </label>

      {shareWithSupervisor && supervisors.length > 0 && (
        <div className="mt-3">
          <label className="text-xs text-gray-500 block mb-1">Select supervisor</label>
          <Select
            value={supervisorId}
            onChange={(e) => { setSupervisorId(e.target.value); setSaved(false) }}
          >
            <option value="">— choose —</option>
            {supervisors.map((s) => (
              <option key={s.id} value={s.id}>{s.name || s.email}</option>
            ))}
          </Select>
        </div>
      )}

      <div className="flex items-center gap-2 mt-4">
        <button
          onClick={save}
          disabled={saving}
          className="bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 text-white text-sm font-medium py-2 px-4 rounded-lg transition"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {saved && <span className="text-xs text-green-600">Saved</span>}
      </div>
    </div>
  )
}
