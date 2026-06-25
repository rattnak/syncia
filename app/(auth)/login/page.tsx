'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

const errorMessage: Record<string, string> = {
  OAuthSignin:        'Could not start Microsoft sign-in.',
  OAuthCallback:      'Microsoft returned an error during sign-in.',
  OAuthCreateAccount: 'Could not create your account.',
  Callback:           'Sign-in callback failed.',
  AccessDenied:       'Access denied — sign in with an @fhsu.edu Microsoft account.',
  Verification:       'Verification failed.',
  Default:            'An unexpected error occurred during sign-in.',
}

function LoginForm() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const [csrfToken, setCsrfToken] = useState('')

  useEffect(() => {
    // Clear demo cookie
    document.cookie = 'syncia-demo=; path=/; max-age=0'
    // Fetch CSRF token required by NextAuth v4 for POST-based OAuth initiation
    fetch('/api/auth/csrf')
      .then((r) => r.json())
      .then((d) => setCsrfToken(d.csrfToken ?? ''))
      .catch(() => {})
  }, [])

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-md p-10 flex flex-col items-center gap-6 max-w-sm w-full">
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-2xl font-bold text-gray-900">Syncia</h1>
          <p className="text-gray-500 text-sm text-center">
            Project-scoped team coordination for FHSU staff
          </p>
        </div>

        {error && (
          <div className="w-full rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-700 font-medium">Sign-in failed</p>
            <p className="text-xs text-red-600 mt-0.5">
              {errorMessage[error] ?? errorMessage.Default}
            </p>
            <p className="text-xs text-red-400 mt-1">Code: {error}</p>
          </div>
        )}

        {/* NextAuth v4 requires a form POST with csrfToken to initiate OAuth */}
        <form
          action="/api/auth/signin/azure-ad"
          method="POST"
          className="w-full"
        >
          <input type="hidden" name="csrfToken" value={csrfToken} />
          <input type="hidden" name="callbackUrl" value="/dashboard" />
          <button
            type="submit"
            disabled={!csrfToken}
            className="w-full flex items-center justify-center gap-3 bg-[#0078d4] hover:bg-[#106ebe] disabled:bg-[#0078d4]/60 text-white font-medium py-2.5 px-4 rounded-lg transition"
          >
            <MicrosoftIcon />
            {csrfToken ? 'Sign in with Microsoft' : 'Loading…'}
          </button>
        </form>

        <div className="w-full flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <a
          href="/api/auth/demo"
          className="w-full flex items-center justify-center gap-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-medium text-sm py-2.5 px-4 rounded-lg transition"
        >
          ⚡ Preview in demo mode
        </a>

        <p className="text-xs text-gray-400 text-center">
          Use your FHSU Microsoft account (@fhsu.edu). You will be redirected to Microsoft to sign in.
        </p>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function MicrosoftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  )
}
