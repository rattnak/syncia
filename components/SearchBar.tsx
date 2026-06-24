'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface SearchResult {
  type: 'project' | 'milestone' | 'task'
  id: string
  title: string
  subtitle?: string
  href: string
}

const TYPE_ICON: Record<string, string> = {
  project: '📁',
  milestone: '🏁',
  task: '✓',
}

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) { setResults([]); setOpen(false); return }
    setLoading(true)
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => {
          setResults(d.results ?? [])
          setOpen(true)
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  function go(href: string) {
    setOpen(false)
    setQuery('')
    router.push(href)
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5 w-52 focus-within:ring-2 focus-within:ring-blue-400 transition">
        <svg className="h-3.5 w-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search projects, tasks…"
          className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none flex-1 min-w-0"
        />
        {loading && (
          <svg className="h-3 w-3 text-gray-400 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute left-0 top-full mt-1.5 w-80 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50">
          {results.map((r) => (
            <button
              key={`${r.type}-${r.id}`}
              onClick={() => go(r.href)}
              className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 transition text-left"
            >
              <span className="text-base mt-0.5 shrink-0">{TYPE_ICON[r.type] ?? '•'}</span>
              <div className="min-w-0">
                <p className="text-sm text-gray-800 font-medium truncate">{r.title}</p>
                {r.subtitle && <p className="text-xs text-gray-400 truncate">{r.subtitle}</p>}
              </div>
            </button>
          ))}
        </div>
      )}

      {open && results.length === 0 && !loading && query.length >= 2 && (
        <div className="absolute left-0 top-full mt-1.5 w-64 bg-white rounded-xl border border-gray-200 shadow-lg px-4 py-3 z-50">
          <p className="text-sm text-gray-400">No results for &ldquo;{query}&rdquo;</p>
        </div>
      )}
    </div>
  )
}
