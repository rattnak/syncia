import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: hearts } = await supabase
    .from('hearts')
    .select('remaining, daily_limit, last_reset')
    .eq('user_id', user.id)
    .single()

  // If no hearts row yet, auto-create and return default
  if (!hearts) {
    await supabase.from('hearts').insert({
      user_id: user.id,
      remaining: 10,
      daily_limit: 10,
      last_reset: new Date().toISOString(),
    })
    return NextResponse.json({ remaining: 10, daily_limit: 10 })
  }

  return NextResponse.json({ remaining: hearts.remaining, daily_limit: hearts.daily_limit })
}
