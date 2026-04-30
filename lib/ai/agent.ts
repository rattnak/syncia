import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  defaultHeaders: {
    // Zero data retention
    'anthropic-beta': 'zero-retention-2025-01-01',
  },
})

interface AgentQueryParams {
  requesterId: string
  subjectUserId?: string
  projectId?: string
  query: string
  progressLogs: Array<{ title: string; description: string | null; status: string; created_at: string }>
}

export async function runAgentQuery({ requesterId, subjectUserId, projectId, query, progressLogs }: AgentQueryParams) {
  const context = progressLogs
    .map((l) => `[${l.status.toUpperCase()}] ${l.title}: ${l.description ?? 'No description'} (${l.created_at.slice(0, 10)})`)
    .join('\n')

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `You are a helpful project coordination assistant. Answer only from the provided context. Be concise.\n\nProgress logs:\n${context}\n\nQuestion: ${query}`,
      },
    ],
  })

  // Write audit log
  const supabase = createClient()
  await supabase.from('ai_audit_log').insert({
    requester_id: requesterId,
    subject_user_id: subjectUserId ?? null,
    project_id: projectId ?? null,
    query,
  })

  const content = message.content[0]
  return content.type === 'text' ? content.text : ''
}
