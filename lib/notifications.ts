import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { NotificationType } from '@/types/database'

interface NotificationInput {
  userId: string
  type: NotificationType
  payload: Record<string, unknown>
}

// Uses service role to bypass RLS — call only from trusted server-side routes
export async function createNotification({ userId, type, payload }: NotificationInput) {
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Deduplicate: skip if same type+user+taskId was sent in the last 24h
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: existing } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('type', type)
    .gte('created_at', since)
    .limit(1)

  // For task-specific notifications, dedupe by taskId in payload
  if (existing && existing.length > 0 && payload.taskId) {
    const { data: taskMatch } = await supabase
      .from('notifications')
      .select('id, payload')
      .eq('user_id', userId)
      .eq('type', type)
      .gte('created_at', since)

    const isDup = taskMatch?.some((n) => (n.payload as Record<string, unknown>).taskId === payload.taskId)
    if (isDup) return
  }

  await supabase.from('notifications').insert({ user_id: userId, type, payload })
}
