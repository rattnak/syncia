import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { findMeetingTimes } from '@/lib/graph/client'

export async function POST(req: NextRequest) {
  if (process.env.DEMO_MODE === 'true') {
    const now = new Date()
    return NextResponse.json({
      suggestions: [
        { start: new Date(now.getTime() + 24 * 3600_000).toISOString(), end: new Date(now.getTime() + 25 * 3600_000).toISOString(), score: 100 },
        { start: new Date(now.getTime() + 48 * 3600_000).toISOString(), end: new Date(now.getTime() + 49 * 3600_000).toISOString(), score: 95 },
        { start: new Date(now.getTime() + 72 * 3600_000).toISOString(), end: new Date(now.getTime() + 73 * 3600_000).toISOString(), score: 88 },
      ],
    })
  }

  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized or missing Graph token' }, { status: 401 })
  }

  const { attendeeEmails, durationMinutes = 60 } = await req.json()
  if (!attendeeEmails?.length) {
    return NextResponse.json({ error: 'Missing attendeeEmails' }, { status: 400 })
  }

  try {
    const suggestions = await findMeetingTimes(
      session.accessToken as string,
      attendeeEmails,
      durationMinutes
    )
    return NextResponse.json({ suggestions })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 503 })
  }
}
