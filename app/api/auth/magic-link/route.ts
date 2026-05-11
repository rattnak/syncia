import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { email } = await req.json()

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
  }

  if (!email.toLowerCase().endsWith('@fhsu.edu')) {
    return NextResponse.json(
      { error: 'Only FHSU email addresses (@fhsu.edu) are allowed.' },
      { status: 403 }
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: email.toLowerCase(),
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/callback`,
    },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
