import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { bookMeeting } from '@/lib/graph/client'

export async function POST(req: NextRequest) {
  if (process.env.DEMO_MODE === 'true') {
    const { subject, start, end } = await req.json()
    return NextResponse.json({
      event: {
        id: `demo-event-${Date.now()}`,
        subject,
        start,
        end,
        webLink: 'https://outlook.office.com/calendar',
      },
    })
  }

  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized or missing Graph token' }, { status: 401 })
  }

  const { subject, start, end, attendeeEmails, body } = await req.json()
  if (!subject || !start || !end || !attendeeEmails?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const event = await bookMeeting(
      session.accessToken as string,
      subject,
      start,
      end,
      attendeeEmails,
      body
    )
    return NextResponse.json({ event })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 503 })
  }
}
