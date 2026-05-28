import { NextResponse } from 'next/server'

export async function GET() {
  const res = NextResponse.redirect(
    new URL('/dashboard', process.env.NEXT_PUBLIC_SITE_URL ?? 'https://syncia.vercel.app')
  )
  res.cookies.set('syncia-demo', '1', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 1 day
  })
  return res
}
