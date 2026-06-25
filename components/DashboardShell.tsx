'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useEffect, useRef, useState } from 'react'
import NotificationBell from '@/components/NotificationBell'
import SearchBar from '@/components/SearchBar'

// ─── Shared icon size token ───────────────────────────────────────────────────
// All nav + action icons use h-5 w-5. Buttons use h-9 w-9 (desktop) or
// the bottom nav handles mobile tap targets at 48px+.

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
      <svg className="h-4 w-4 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
      <span>{hearts.remaining}/{hearts.daily_limit}</span>
    </span>
  )
}

// ── Nav icons — all h-5 w-5, strokeWidth 2 ───────────────────────────────────
const ProjectsIcon = () => (
  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
  </svg>
)

const BriefingIcon = () => (
  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
)

const SupervisorIcon = () => (
  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
)

const BellIcon = () => (
  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 01-3.46 0" />
  </svg>
)

const ChevronDownIcon = () => (
  <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 9l6 6 6-6" />
  </svg>
)

const SignOutIcon = () => (
  <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
  </svg>
)

// ── Desktop nav link ───────────────────────────────────────────────────────────
function NavLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  const pathname = usePathname()
  const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
  return (
    <Link
      href={href}
      aria-label={label}
      className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
        active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
    </Link>
  )
}

// ── Mobile bottom nav link ─────────────────────────────────────────────────────
function BottomNavLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  const pathname = usePathname()
  const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
  return (
    <Link
      href={href}
      aria-label={label}
      className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors ${
        active ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      {icon}
      <span className="text-[10px] font-medium leading-none">{label}</span>
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
        aria-label="Account menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 transition-colors"
      >
        <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold select-none shrink-0">
          {initial}
        </div>
        <span className="hidden lg:block text-sm text-gray-600 max-w-[140px] truncate">{email}</span>
        <ChevronDownIcon />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50">
          <div className="px-4 py-2.5 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-900 truncate">{email}</p>
            {isDemo && <p className="text-xs text-amber-600 font-medium mt-0.5">Demo mode</p>}
          </div>
          <button
            onClick={() => { setOpen(false); onSignOut() }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <SignOutIcon />
            {isDemo ? 'Exit demo' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Notification bell — uses shared BellIcon ───────────────────────────────────
// Kept in NotificationBell.tsx but we pass the icon via the slot pattern there.
// DashboardShell exports BellIcon so NotificationBell can import it.

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

  const navItems = [
    { href: '/dashboard',   label: 'Projects',   icon: <ProjectsIcon /> },
    { href: '/briefing',    label: 'Briefing',   icon: <BriefingIcon /> },
    { href: '/supervisor',  label: 'Supervisor', icon: <SupervisorIcon /> },
  ]

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Demo banner */}
      {isDemo && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-2 text-xs text-amber-800">
          <svg className="h-3.5 w-3.5 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          <span><strong>Demo mode</strong> — showing mock data. Sign in with your FHSU account to use the live app.</span>
        </div>
      )}

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

          {/* Left: logo + desktop nav */}
          <div className="flex items-center gap-1">
            <Link href="/dashboard" className="flex items-center gap-2 pr-3 shrink-0">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold tracking-tight">S</div>
              <span className="hidden sm:block text-sm font-semibold text-gray-900">Syncia</span>
            </Link>

            {/* Divider */}
            <div className="hidden sm:block h-5 w-px bg-gray-200 mr-1" />

            {/* Desktop nav — hidden on mobile (bottom nav handles it) */}
            <nav className="hidden sm:flex items-center" aria-label="Main navigation">
              {navItems.map((item) => (
                <NavLink key={item.href} {...item} />
              ))}
            </nav>
          </div>

          {/* Right: search + hearts + bell + avatar — all same vertical rhythm */}
          <div className="flex items-center gap-1">
            <div className="hidden md:block mr-2">
              <SearchBar />
            </div>
            <HeartBadge />
            <NotificationBell />
            <div className="h-5 w-px bg-gray-200 mx-1" />
            <UserMenu email={email} isDemo={isDemo} onSignOut={handleSignOut} />
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 sm:pb-8">
        {children}
      </main>

      {/* ── Mobile bottom nav ─────────────────────────────────────────────────── */}
      <nav
        className="sm:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-30 flex items-stretch"
        aria-label="Mobile navigation"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {navItems.map((item) => (
          <BottomNavLink key={item.href} {...item} />
        ))}
      </nav>
    </div>
  )
}
