import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

interface AgentQueryParams {
  requesterId: string
  subjectUserId?: string
  projectId?: string
  query: string
  progressLogs: Array<{ title: string; description: string | null; status: string; created_at: string }>
  tasks?: Array<{ title: string; status: string; assignee: string | null; due_date: string | null; priority: string }>
  milestones?: Array<{ title: string; status: string; target_date: string | null }>
}

export async function runAgentQuery({ requesterId, subjectUserId, projectId, query, progressLogs, tasks, milestones }: AgentQueryParams) {
  const milestoneContext = milestones?.length
    ? '## Milestones\n' + milestones.map((m) =>
        `[${m.status.toUpperCase()}] ${m.title}${m.target_date ? ` (due ${m.target_date})` : ''}`
      ).join('\n')
    : ''

  const taskContext = tasks?.length
    ? '## Tasks\n' + tasks.map((t) =>
        `[${t.status.toUpperCase()}][${t.priority.toUpperCase()}] ${t.title}` +
        (t.assignee ? ` — ${t.assignee}` : '') +
        (t.due_date ? ` (due ${t.due_date})` : '')
      ).join('\n')
    : ''

  const logContext = progressLogs.length
    ? '## Progress Logs\n' + progressLogs
        .map((l) => `[${l.status.toUpperCase()}] ${l.title}: ${l.description ?? 'No description'} (${l.created_at.slice(0, 10)})`)
        .join('\n')
    : ''

  const context = [milestoneContext, taskContext, logContext].filter(Boolean).join('\n\n')

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are a helpful project coordination assistant for an FHSU student team. Answer only from the provided context. Be concise and specific.\n\n${context}\n\nQuestion: ${query}`,
      },
    ],
  })

  const supabase = await createClient()
  await supabase.from('ai_audit_log').insert({
    requester_id: requesterId,
    subject_user_id: subjectUserId ?? null,
    project_id: projectId ?? null,
    query,
  })

  const content = message.content[0]
  return content.type === 'text' ? content.text : ''
}
