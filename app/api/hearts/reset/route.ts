import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Called by Vercel cron: 0 0 * * * (midnight UTC)
// vercel.json: { "crons": [{ "path": "/api/hearts/reset", "schedule": "0 0 * * *" }] }
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('hearts')
    .update({ remaining: 20, last_reset: new Date().toISOString() })
    .lt('last_reset', new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString())

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
