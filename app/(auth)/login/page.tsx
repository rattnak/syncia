'use client'

import { signIn } from 'next-auth/react'

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-md p-10 flex flex-col items-center gap-6 max-w-sm w-full">
        <h1 className="text-2xl font-bold text-gray-900">Syncia</h1>
        <p className="text-gray-500 text-sm text-center">
          Project-scoped team coordination for FHSU staff
        </p>
        <button
          onClick={() => signIn('azure-ad', { callbackUrl: '/dashboard' })}
          className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition"
        >
          Sign in with Microsoft
        </button>
        <p className="text-xs text-gray-400">Use your FHSU Microsoft account</p>
      </div>
    </main>
  )
}
