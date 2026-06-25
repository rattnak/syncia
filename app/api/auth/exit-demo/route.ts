import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const loginUrl = new URL('/login', req.url)
  const res = NextResponse.redirect(loginUrl)
  res.cookies.set('syncia-demo', '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return res
}
