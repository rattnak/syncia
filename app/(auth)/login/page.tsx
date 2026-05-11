'use client'

import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSSO() {
    setLoading(true)
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

        <button
          onClick={() => router.push('/dashboard')}
          className="w-full flex items-center justify-center gap-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-medium text-sm py-2.5 px-4 rounded-lg transition"
        >
          ⚡ Preview in demo mode
        </button>

        <p className="text-xs text-gray-400 text-center">
          Use your FHSU Microsoft account (@fhsu.edu). You will be redirected to Microsoft to sign in.
        </p>
      </div>
    </main>
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
