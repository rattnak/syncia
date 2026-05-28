/**
 * Demo-mode Supabase client.
 * Returns static mock data so the UI can be previewed without any live backend.
 * Only used when DEMO_MODE=true in .env.local
 */

const MOCK_USER = {
  id: 'demo-user-001',
  email: 'nak.chanrattna@fhsu.edu',
  user_metadata: {},
}

const MOCK_PROFILES = [
  { id: 'demo-user-001', email: 'nak.chanrattna@fhsu.edu', full_name: 'Nak Chanrattna', role: 'supervisor' },
  { id: 'demo-user-002', email: 'jane.smith@fhsu.edu',     full_name: 'Jane Smith',      role: 'member' },
  { id: 'demo-user-003', email: 'bob.johnson@fhsu.edu',    full_name: 'Bob Johnson',     role: 'member' },
  { id: 'demo-user-004', email: 'alice.wong@fhsu.edu',     full_name: 'Alice Wong',      role: 'member' },
]

const MOCK_PROJECTS = [
  { id: 'proj-001', name: 'TILT Website Redesign',  description: 'Modernising the TILT public website and internal portal.',          created_by: 'demo-user-001', created_at: '2026-04-01T10:00:00Z', teams_channel_id: null, teams_channel_url: null },
  { id: 'proj-002', name: 'AI Learning Modules',    description: 'Developing AI-assisted learning content for faculty training.',      created_by: 'demo-user-002', created_at: '2026-04-15T09:00:00Z', teams_channel_id: null, teams_channel_url: null },
  { id: 'proj-003', name: 'Syncia Internal Pilot',  description: 'Internal pilot and testing of the Syncia platform.',                created_by: 'demo-user-001', created_at: '2026-05-01T08:00:00Z', teams_channel_id: null, teams_channel_url: null },
]

const MOCK_MEMBERSHIPS = [
  { id: 'm-001', project_id: 'proj-001', user_id: 'demo-user-001', role: 'leader', status: 'active',  share_with_supervisor: false, supervisor_id: null,           joined_at: '2026-04-01T10:00:00Z' },
  { id: 'm-002', project_id: 'proj-001', user_id: 'demo-user-002', role: 'member', status: 'active',  share_with_supervisor: true,  supervisor_id: 'demo-user-001', joined_at: '2026-04-02T10:00:00Z' },
  { id: 'm-003', project_id: 'proj-001', user_id: 'demo-user-003', role: 'member', status: 'active',  share_with_supervisor: false, supervisor_id: null,           joined_at: '2026-04-03T10:00:00Z' },
  { id: 'm-004', project_id: 'proj-002', user_id: 'demo-user-001', role: 'member', status: 'active',  share_with_supervisor: false, supervisor_id: null,           joined_at: '2026-04-15T09:00:00Z' },
  { id: 'm-005', project_id: 'proj-002', user_id: 'demo-user-002', role: 'leader', status: 'active',  share_with_supervisor: false, supervisor_id: null,           joined_at: '2026-04-15T09:00:00Z' },
  { id: 'm-006', project_id: 'proj-002', user_id: 'demo-user-004', role: 'member', status: 'active',  share_with_supervisor: true,  supervisor_id: 'demo-user-001', joined_at: '2026-04-16T09:00:00Z' },
  { id: 'm-007', project_id: 'proj-003', user_id: 'demo-user-001', role: 'leader', status: 'active',  share_with_supervisor: false, supervisor_id: null,           joined_at: '2026-05-01T08:00:00Z' },
  { id: 'm-008', project_id: 'proj-003', user_id: 'demo-user-003', role: 'member', status: 'pending', share_with_supervisor: false, supervisor_id: null,           joined_at: null },
]

const MOCK_AVAILABILITY = [
  { id: 'av-001', user_id: 'demo-user-001', project_id: 'proj-001', is_focused: true,  updated_at: new Date().toISOString() },
  { id: 'av-002', user_id: 'demo-user-001', project_id: 'proj-002', is_focused: false, updated_at: new Date().toISOString() },
  { id: 'av-003', user_id: 'demo-user-001', project_id: 'proj-003', is_focused: true,  updated_at: new Date().toISOString() },
  { id: 'av-004', user_id: 'demo-user-002', project_id: 'proj-001', is_focused: true,  updated_at: new Date().toISOString() },
  { id: 'av-005', user_id: 'demo-user-003', project_id: 'proj-001', is_focused: false, updated_at: new Date().toISOString() },
  { id: 'av-006', user_id: 'demo-user-004', project_id: 'proj-002', is_focused: true,  updated_at: new Date().toISOString() },
]

const MOCK_PROGRESS_LOGS = [
  { id: 'log-001', project_id: 'proj-001', user_id: 'demo-user-001', title: 'Finalised homepage wireframes',  description: 'Completed Figma wireframes for the new homepage and nav structure. Ready for review.',        status: 'done',        created_at: '2026-05-24T09:00:00Z', updated_at: '2026-05-24T09:00:00Z' },
  { id: 'log-002', project_id: 'proj-001', user_id: 'demo-user-002', title: 'Content audit for About section', description: 'Going through existing About page copy to identify what can be reused vs rewritten.',       status: 'in_progress', created_at: '2026-05-25T10:00:00Z', updated_at: '2026-05-25T10:00:00Z' },
  { id: 'log-003', project_id: 'proj-001', user_id: 'demo-user-003', title: 'Set up staging environment',      description: null,                                                                                        status: 'in_progress', created_at: '2026-05-25T14:00:00Z', updated_at: '2026-05-25T14:00:00Z' },
  { id: 'log-004', project_id: 'proj-001', user_id: 'demo-user-001', title: 'Mobile responsive breakpoints',   description: 'Working on Tailwind breakpoints for tablet and mobile layouts.',                            status: 'in_progress', created_at: '2026-05-26T08:00:00Z', updated_at: '2026-05-26T08:00:00Z' },
  { id: 'log-005', project_id: 'proj-001', user_id: 'demo-user-002', title: 'Nav accessibility audit',         description: 'Checking WCAG 2.1 AA compliance for the new navigation components.',                       status: 'not_started', created_at: '2026-05-26T07:30:00Z', updated_at: '2026-05-26T07:30:00Z' },
  { id: 'log-006', project_id: 'proj-002', user_id: 'demo-user-002', title: 'Draft Module 1 script',           description: 'First draft of the AI Fundamentals intro module script. Needs SME review.',                 status: 'done',        created_at: '2026-05-23T11:00:00Z', updated_at: '2026-05-23T11:00:00Z' },
  { id: 'log-007', project_id: 'proj-002', user_id: 'demo-user-004', title: 'Record voiceover for Module 1',   description: null,                                                                                        status: 'not_started', created_at: '2026-05-26T07:00:00Z', updated_at: '2026-05-26T07:00:00Z' },
  { id: 'log-008', project_id: 'proj-003', user_id: 'demo-user-001', title: 'Set up Supabase schema',          description: 'Phase 1 and Phase 2 migrations applied to production.',                                    status: 'done',        created_at: '2026-05-20T10:00:00Z', updated_at: '2026-05-20T10:00:00Z' },
  { id: 'log-009', project_id: 'proj-003', user_id: 'demo-user-001', title: 'AI agent integration',            description: 'Wiring Claude Haiku to the progress log context. Rate limiting working correctly.',         status: 'in_progress', created_at: '2026-05-26T09:00:00Z', updated_at: '2026-05-26T09:00:00Z' },
]

// Typed properly so items can be added
const MOCK_INVITES: Array<Record<string, unknown>> = [
  { id: 'inv-001', project_id: 'proj-001', invited_email: 'newperson@fhsu.edu', invited_by: 'demo-user-001', token: 'demo-invite-token-001', status: 'pending', expires_at: new Date(Date.now() + 7 * 24 * 3600_000).toISOString(), created_at: new Date().toISOString() },
]

const MOCK_HEARTS = { id: 'h-001', user_id: 'demo-user-001', remaining: 8, daily_limit: 10, last_reset: new Date().toISOString() }

// ─── Minimal chainable query builder ─────────────────────────────────────────

type Row = Record<string, unknown>

function makeQueryBuilder(initialRows: Row[]) {
  let rows = [...initialRows]
  let isSingle = false

  const builder = {
    select(_cols?: string) { void _cols; return builder },
    eq(col: string, val: unknown) {
      rows = rows.filter(r => r[col] === val)
      return builder
    },
    neq(col: string, val: unknown) {
      rows = rows.filter(r => r[col] !== val)
      return builder
    },
    in(col: string, vals: unknown[]) {
      rows = rows.filter(r => vals.includes(r[col]))
      return builder
    },
    order(col: string, opts?: { ascending?: boolean }) {
      const asc = opts?.ascending !== false
      rows = [...rows].sort((a, b) => {
        const av = a[col] as string | number | null | undefined
        const bv = b[col] as string | number | null | undefined
        if (av == null && bv == null) return 0
        if (av == null) return asc ? 1 : -1
        if (bv == null) return asc ? -1 : 1
        if (av < bv) return asc ? -1 : 1
        if (av > bv) return asc ? 1 : -1
        return 0
      })
      return builder
    },
    limit(n: number) { rows = rows.slice(0, n); return builder },
    single() { isSingle = true; return builder },
    insert(payload: Row | Row[]) {
      const items = Array.isArray(payload) ? payload : [payload]
      rows = items.map(item => ({ id: `new-${Date.now()}`, created_at: new Date().toISOString(), ...item }))
      return builder
    },
    update(_payload: Row) { void _payload; return builder },
    upsert(_payload: Row | Row[], _opts?: unknown) { void _payload; void _opts; return builder },
    delete() { return builder },
    // Resolve — always returns { data, error }
    then(resolve: (v: { data: Row | Row[] | null; error: null }) => unknown) {
      const data = isSingle ? (rows[0] ?? null) : rows
      return Promise.resolve(resolve({ data, error: null }))
    },
  }

  Object.defineProperty(builder, Symbol.toStringTag, { value: 'QueryBuilder' })
  return builder
}

// ─── Table data map ───────────────────────────────────────────────────────────

function getTableRows(table: string): Row[] {
  switch (table) {
    case 'profiles':        return MOCK_PROFILES        as unknown as Row[]
    case 'projects':        return MOCK_PROJECTS        as unknown as Row[]
    case 'project_members': return MOCK_MEMBERSHIPS     as unknown as Row[]
    case 'availability':    return MOCK_AVAILABILITY    as unknown as Row[]
    case 'progress_logs':   return MOCK_PROGRESS_LOGS   as unknown as Row[]
    case 'invites':         return MOCK_INVITES         as unknown as Row[]
    case 'hearts':          return [MOCK_HEARTS]        as unknown as Row[]
    case 'ai_audit_log':    return []
    default:                return []
  }
}

// ─── Mock Supabase client ─────────────────────────────────────────────────────

export function createDemoClient() {
  return {
    auth: {
      getUser:    async () => ({ data: { user: MOCK_USER }, error: null }),
      getSession: async () => ({ data: { session: { user: MOCK_USER, access_token: 'demo' } }, error: null }),
    },
    from(table: string) {
      return makeQueryBuilder(getTableRows(table))
    },
  }
}
