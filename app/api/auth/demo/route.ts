import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const dashboardUrl = new URL('/dashboard', req.url)
  const res = NextResponse.redirect(dashboardUrl)
  res.cookies.set('syncia-demo', '1', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 1 day
  })
  return res
}
