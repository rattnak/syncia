import { getToken } from 'next-auth/jwt'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Demo mode: skip all auth checks so the UI can be previewed without any backend
  if (process.env.DEMO_MODE === 'true' || request.cookies.get('syncia-demo')?.value === '1') {
    return NextResponse.next()
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

  if (!token) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard',
    '/dashboard/:path*',
    '/projects/:path*',
    '/supervisor',
    '/supervisor/:path*',
    '/briefing',
    '/briefing/:path*',
    '/invites/:path*',
  ],
}
