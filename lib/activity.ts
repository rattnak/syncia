import { createClient as createServiceClient } from '@supabase/supabase-js'

interface ActivityInput {
  projectId: string
  actorId: string | null
  entityType: string
  entityId?: string | null
  action: string
  meta?: Record<string, unknown>
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function logActivity(input: ActivityInput) {
  if (!SUPABASE_URL || !SERVICE_KEY) return
  try {
    const supabase = createServiceClient(SUPABASE_URL, SERVICE_KEY)
    await supabase.from('activity_feed').insert({
      project_id: input.projectId,
      actor_id: input.actorId,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      action: input.action,
      meta: input.meta ?? {},
    })
  } catch {
    // best-effort
  }
}
