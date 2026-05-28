import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'
import { createDemoClient } from './demo'

export async function createClient() {
  const cookieStore = await cookies()
  if (process.env.DEMO_MODE === 'true' || cookieStore.get('syncia-demo')?.value === '1') {
    return createDemoClient() as unknown as ReturnType<typeof createServerClient<Database>>
  }

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — middleware will handle setting cookies
          }
        },
      },
    }
  )
}
