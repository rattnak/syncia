'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useEffect, useRef, useState } from 'react'
import NotificationBell from '@/components/NotificationBell'
import SearchBar from '@/components/SearchBar'

// ── Hearts badge ──────────────────────────────────────────────────────────────
function HeartBadge() {
  const [hearts, setHearts] = useState<{ remaining: number; daily_limit: number } | null>(null)

  useEffect(() => {
    fetch('/api/hearts')
      .then((r) => r.json())
      .then((d) => { if (d.remaining !== undefined) setHearts(d) })
      .catch(() => {})
  }, [])

  if (!hearts) return null

  const pct = hearts.remaining / hearts.daily_limit
  const color = pct > 0.5 ? 'text-rose-500' : pct > 0.2 ? 'text-orange-500' : 'text-red-600'

  return (
    <span
      className={`flex items-center gap-1 text-xs font-medium ${color}`}
      title={`${hearts.remaining} of ${hearts.daily_limit} AI queries remaining today`}
    >
      <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
      {hearts.remaining}/{hearts.daily_limit}
    </span>
  )
}

// ── Nav link ──────────────────────────────────────────────────────────────────
function NavLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  const pathname = usePathname()
  const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 text-sm font-medium px-2.5 py-1.5 rounded-lg transition ${
        active
          ? 'bg-blue-50 text-blue-700'
          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Link>
  )
}

// ── User menu ─────────────────────────────────────────────────────────────────
function UserMenu({ email, isDemo, onSignOut }: { email: string; isDemo?: boolean; onSignOut: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const initial = (email[0] ?? '?').toUpperCase()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 transition group"
      >
        <div className="h-7 w-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold select-none">
          {initial}
        </div>
        <span className="hidden sm:block text-sm text-gray-600 max-w-[140px] truncate">{email}</span>
        <svg className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50">
          <div className="px-4 py-2.5 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-900 truncate">{email}</p>
            {isDemo && (
              <p className="text-xs text-amber-600 font-medium mt-0.5">Demo mode</p>
            )}
          </div>
          <button
            onClick={() => { setOpen(false); onSignOut() }}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {isDemo ? 'Exit demo' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const DashboardIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
)
const BriefingIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)
const SupervisorIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
)

// ── Shell ─────────────────────────────────────────────────────────────────────
interface DashboardShellProps {
  email: string
  children: React.ReactNode
  isDemo?: boolean
}

export default function DashboardShell({ email, children, isDemo }: DashboardShellProps) {
  function handleSignOut() {
    if (isDemo) {
      window.location.href = '/login'
    } else {
      signOut({ callbackUrl: '/login' })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Demo banner */}
      {isDemo && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-2 text-xs text-amber-800">
          <svg className="h-3.5 w-3.5 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          <span><strong>Demo mode</strong> — showing mock data. Sign in with your FHSU account to use the live app.</span>
        </div>
      )}

      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between sticky top-0 z-30 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          {/* Wordmark */}
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold tracking-tight">S</div>
            <span className="hidden sm:block text-sm font-semibold text-gray-900">Syncia</span>
          </Link>

          {/* Nav — icon-only on mobile, label on sm+ */}
          <nav className="flex items-center gap-0.5">
            <NavLink href="/dashboard" label="Projects" icon={<DashboardIcon />} />
            <NavLink href="/briefing"  label="Briefing"  icon={<BriefingIcon />} />
            <NavLink href="/supervisor" label="Supervisor" icon={<SupervisorIcon />} />
          </nav>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:block">
            <SearchBar />
          </div>
          <HeartBadge />
          <NotificationBell />
          <UserMenu email={email} isDemo={isDemo} onSignOut={handleSignOut} />
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>
    </div>
  )
}
