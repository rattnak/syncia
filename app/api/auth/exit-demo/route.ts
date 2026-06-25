import { NextResponse } from 'next/server'

export async function GET() {
  const res = NextResponse.redirect(
    new URL('/login', process.env.NEXT_PUBLIC_SITE_URL ?? 'https://syncia.vercel.app')
  )
  // Expire the demo cookie immediately
  res.cookies.set('syncia-demo', '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return res
}
