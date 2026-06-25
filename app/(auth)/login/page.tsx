'use client'

import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

function LoginForm() {
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const errorMessage: Record<string, string> = {
    OAuthSignin:    'Could not start Microsoft sign-in. Check that the app is configured correctly.',
    OAuthCallback:  'Microsoft returned an error during sign-in.',
    OAuthCreateAccount: 'Could not create your account.',
    Callback:       'Sign-in callback failed.',
    AccessDenied:   'Access denied. Make sure you are signing in with an @fhsu.edu Microsoft account.',
    Verification:   'Verification failed.',
    Default:        'An unexpected error occurred during sign-in.',
  }

  async function handleSSO() {
    setLoading(true)
    await fetch('/api/auth/exit-demo').catch(() => {})
    document.cookie = 'syncia-demo=; path=/; max-age=0'
    await signIn('azure-ad', { callbackUrl: '/dashboard' })
  }

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
            <p className="text-xs text-red-400 mt-1">Error code: {error}</p>
          </div>
        )}

        <button
          onClick={handleSSO}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-[#0078d4] hover:bg-[#106ebe] disabled:bg-[#0078d4]/60 text-white font-medium py-2.5 px-4 rounded-lg transition"
        >
          <MicrosoftIcon />
          {loading ? 'Redirecting…' : 'Sign in with Microsoft'}
        </button>

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
