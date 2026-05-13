'use client'

import { useState } from 'react'

interface Project {
  id: string
  name: string
  role: string
}

interface FocusModePanelProps {
  projects: Project[]
  initialFocusedIds: string[]
}

export default function FocusModePanel({ projects, initialFocusedIds }: FocusModePanelProps) {
  const [focused, setFocused] = useState<Set<string>>(new Set(initialFocusedIds))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function toggle(id: string) {
    setFocused((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setSaved(false)
  }

  async function activate() {
    setSaving(true)
    setSaved(false)
    try {
      await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ focusedProjectIds: Array.from(focused) }),
      })
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  async function clearFocus() {
    setFocused(new Set())
    setSaving(true)
    setSaved(false)
    try {
      await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ focusedProjectIds: [] }),
      })
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  const focusedCount = focused.size

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-gray-800 text-sm">Focus Mode</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Select projects you are working on right now. Others will show you as unavailable.
          </p>
        </div>
        {focusedCount > 0 && (
          <span className="shrink-0 text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-medium whitespace-nowrap">
            {focusedCount} active
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 mb-4">
        {projects.map((p) => {
          const isFocused = focused.has(p.id)
          return (
            <label
              key={p.id}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition ${
                isFocused
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="checkbox"
                checked={isFocused}
                onChange={() => toggle(p.id)}
                className="accent-blue-600"
              />
              <span className="text-sm font-medium text-gray-900">{p.name}</span>
              <span className="ml-auto text-xs text-gray-400 capitalize">{p.role}</span>
            </label>
          )
        })}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={activate}
          disabled={saving}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium py-2 px-4 rounded-lg transition"
        >
          {saving ? 'Saving…' : focusedCount === 0 ? 'Set as available for all' : `Activate Focus (${focusedCount})`}
        </button>
        {focusedCount > 0 && (
          <button
            onClick={clearFocus}
            disabled={saving}
            className="text-sm text-gray-400 hover:text-gray-600 transition px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300"
          >
            Clear
          </button>
        )}
      </div>

      {saved && (
        <p className="text-xs text-green-600 mt-2">Focus updated — team members will see your availability update in real time.</p>
      )}
    </div>
  )
}
