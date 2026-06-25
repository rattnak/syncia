# Syncia

A project coordination platform for FHSU student teams — built with Next.js 15, Supabase, and Microsoft Graph.

## What Syncia Does

Syncia gives student project teams a single place to coordinate work from start to finish:

- **Azure AD SSO** — sign-in restricted to `@fhsu.edu` accounts
- **Project workspaces** — create projects, invite members by FHSU email, manage roles (leader / member)
- **Milestone → Task → Subtask hierarchy** — structured work tracking with assignees, due dates, priorities, and completion rollup
- **Progress logs** — freeform status updates per member, filterable by status
- **Focus mode** — members mark which projects they are actively working on; team sees live availability
- **Microsoft Graph integration**
  - Outlook Calendar: view today's meetings matched to your projects
  - Teams: auto-create a private Teams channel per project, invite members, book meetings
  - Meeting scheduler: find mutual availability across all members and book directly from the app
- **In-app notifications** — task assignments, overdue alerts, milestone due-date warnings, stale project nudges, invite receipts; daily cron at 8am UTC
- **AI assistant** — project-aware chat powered by Claude (all members); reads milestones, tasks, and progress logs; preset quick-actions for common queries; 10-query daily limit (hearts) per user
- **Supervisor dashboard** — supervisors see progress logs for students who opt in; AI query over shared data
- **Daily briefing** — personal view of tasks due this week (grouped by urgency), per-project health snapshots, active logs across all projects, and today's calendar
- **Task comments** — threaded comments on any task; visible to all project members; author can delete their own
- **Activity feed** — per-project timeline of every create/update/complete/comment event, shown in the project sidebar
- **Global search** — header search bar across all projects, milestones, and tasks the user can access
- **Task filtering** — filter MilestoneBoard by assignee, priority, and status with a single-click clear
- **Teams channel feed** — reads recent Microsoft Teams messages from the project's linked channel
- **Project settings** — dedicated settings page: rename, update description, leave project, and (leaders) delete project with confirmation

---

## Database Architecture

```mermaid
erDiagram

  %% ── IDENTITY ────────────────────────────────────────────────────────────────

  auth_users {
    uuid id PK
  }

  profiles {
    uuid id PK "FK → auth.users"
    text email UK
    text full_name
    text role "member | supervisor | admin"
    timestamptz created_at
  }

  auth_users ||--|| profiles : "triggers on_auth_user_created"

  %% ── PROJECTS & MEMBERSHIP ───────────────────────────────────────────────────

  projects {
    uuid id PK
    text name
    text description
    uuid created_by FK
    text teams_channel_id
    text teams_channel_url
    timestamptz created_at
  }

  project_members {
    uuid id PK
    uuid project_id FK
    uuid user_id FK
    text role "leader | member"
    text status "pending | active | declined | left | removed"
    boolean share_with_supervisor
    uuid supervisor_id FK
    timestamptz joined_at
  }

  invites {
    uuid id PK
    uuid project_id FK
    text invited_email
    uuid invited_by FK
    uuid token UK
    text status "pending | accepted | declined"
    timestamptz created_at
    timestamptz expires_at
  }

  profiles ||--o{ projects : "created_by"
  projects ||--o{ project_members : "project_id"
  profiles ||--o{ project_members : "user_id"
  profiles ||--o{ project_members : "supervisor_id (opt)"
  projects ||--o{ invites : "project_id"
  profiles ||--o{ invites : "invited_by"

  %% ── MILESTONES / TASKS / SUBTASKS ───────────────────────────────────────────

  milestones {
    uuid id PK
    uuid project_id FK
    text title
    text description
    date target_date
    text status "open | in_progress | completed | cancelled"
    uuid created_by FK
    timestamptz created_at
    timestamptz updated_at
  }

  tasks {
    uuid id PK
    uuid project_id FK
    uuid milestone_id FK "nullable — unassigned if null"
    text title
    text description
    uuid assignee_id FK "nullable"
    date due_date
    text priority "low | medium | high"
    text status "not_started | in_progress | done | cancelled"
    uuid created_by FK
    timestamptz created_at
    timestamptz updated_at
  }

  subtasks {
    uuid id PK
    uuid task_id FK
    text title
    boolean is_completed
    uuid assignee_id FK "nullable"
    date due_date
    uuid created_by FK
    timestamptz created_at
  }

  projects ||--o{ milestones : "project_id"
  milestones ||--o{ tasks : "milestone_id (opt)"
  projects ||--o{ tasks : "project_id"
  tasks ||--o{ subtasks : "task_id"
  profiles ||--o{ milestones : "created_by"
  profiles ||--o{ tasks : "assignee_id (opt)"
  profiles ||--o{ tasks : "created_by"
  profiles ||--o{ subtasks : "assignee_id (opt)"
  profiles ||--o{ subtasks : "created_by"

  %% ── PROGRESS LOGS ───────────────────────────────────────────────────────────

  progress_logs {
    uuid id PK
    uuid project_id FK
    uuid user_id FK
    text title
    text description
    text status "not_started | in_progress | done"
    timestamptz created_at
    timestamptz updated_at
  }

  projects ||--o{ progress_logs : "project_id"
  profiles ||--o{ progress_logs : "user_id"

  %% ── AVAILABILITY ────────────────────────────────────────────────────────────

  availability {
    uuid id PK
    uuid user_id FK
    uuid project_id FK
    boolean is_focused
    timestamptz updated_at
  }

  profiles ||--o{ availability : "user_id"
  projects ||--o{ availability : "project_id"

  %% ── NOTIFICATIONS ───────────────────────────────────────────────────────────

  notifications {
    uuid id PK
    uuid user_id FK
    text type "task_assigned | task_overdue | milestone_due | project_stale | invite_received"
    jsonb payload "taskId | milestoneId | projectId | token etc."
    boolean is_read
    timestamptz created_at
  }

  profiles ||--o{ notifications : "user_id"

  %% ── TASK COMMENTS ───────────────────────────────────────────────────────────

  task_comments {
    uuid id PK
    uuid task_id FK
    uuid user_id FK
    text body
    timestamptz created_at
    timestamptz updated_at
  }

  tasks ||--o{ task_comments : "task_id"
  profiles ||--o{ task_comments : "user_id"

  %% ── ACTIVITY FEED ───────────────────────────────────────────────────────────

  activity_feed {
    uuid id PK
    uuid project_id FK
    uuid actor_id FK "nullable"
    text entity_type "task | milestone | progress_log | member | comment"
    uuid entity_id "nullable"
    text action "created | updated | completed | deleted | joined | commented"
    jsonb meta
    timestamptz created_at
  }

  projects ||--o{ activity_feed : "project_id"
  profiles ||--o{ activity_feed : "actor_id (opt)"

  %% ── AI RATE LIMITING & AUDIT ────────────────────────────────────────────────

  hearts {
    uuid id PK
    uuid user_id UK FK
    int remaining
    int daily_limit
    timestamptz last_reset
  }

  ai_audit_log {
    uuid id PK
    uuid requester_id FK
    uuid subject_user_id FK "nullable"
    uuid project_id FK "nullable"
    text query
    timestamptz created_at
  }

  profiles ||--|| hearts : "triggers on_profile_created_hearts"
  profiles ||--o{ ai_audit_log : "requester_id"
  profiles ||--o{ ai_audit_log : "subject_user_id (opt)"
  projects ||--o{ ai_audit_log : "project_id (opt)"
```

### Entity Notes

| Entity | Purpose | Key Constraints |
|--------|---------|----------------|
| `profiles` | Mirror of `auth.users`; auto-created via trigger | `role` gates supervisor/admin features |
| `projects` | Top-level workspace | Leader is always an active `project_members` row with `role = 'leader'` |
| `project_members` | Many-to-many between profiles and projects | Unique `(project_id, user_id)`; `share_with_supervisor` + `supervisor_id` control visibility |
| `invites` | Email-based invite flow | Expires 7 days after creation; reuses existing pending token for same email+project |
| `milestones` | Deadline groupings for tasks | `target_date` drives overdue/due-soon notifications |
| `tasks` | Owned, dated work items | `milestone_id` nullable — tasks without a milestone appear in "Unassigned" group |
| `subtasks` | Checklist items under a task | Completion % displayed on both task and milestone |
| `progress_logs` | Freeform status updates | Visible to supervisors when `share_with_supervisor = true` |
| `availability` | Focus-mode state | Unique `(user_id, project_id)`; upserted on toggle |
| `notifications` | In-app alert center | Inserted via service role only; deduplicated within 24h per type+user+payload |
| `hearts` | AI query daily rate limit | Auto-created on profile insert; reset nightly by cron |
| `ai_audit_log` | Immutable query history | Append-only; no `UPDATE`/`DELETE` policies |
| `task_comments` | Threaded discussion on tasks | Author can delete own comment; all project members can read/post |
| `activity_feed` | Append-only project event log | Written via service role; powers the Activity sidebar on project pages |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Auth | NextAuth.js + Azure AD (MSAL) |
| Database | Supabase (Postgres + RLS) |
| Graph API | Microsoft Graph v1.0 (delegated tokens) |
| AI | Anthropic Claude (Sonnet 4.6) |
| Styling | Tailwind CSS + shadcn/ui |
| Deployment | Vercel (with cron jobs) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project
- An Azure AD app registration with the following **delegated** permissions (admin-consented):
  - `Calendars.Read`, `Calendars.ReadWrite`
  - `Channel.ReadBasic.All`, `Channel.Create`
  - `ChannelMember.ReadWrite.All`, `ChannelMessage.Read.All`

### Environment variables

```env
# Azure AD
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_TENANT_ID=

# Microsoft Teams — object ID of the FHSU-wide Team
GRAPH_TEAM_ID=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# NextAuth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# Anthropic
ANTHROPIC_API_KEY=

# Vercel cron authentication
CRON_SECRET=

# Optional: enable demo mode (no real auth required)
DEMO_MODE=false
```

### Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Database setup

Run migrations in order against your Supabase project:

```
supabase/migrations/20260514000000_phase1_schema.sql     — profiles, projects, members, invites
supabase/migrations/20260526000000_phase2_5_schema.sql   — availability, progress_logs, hearts, ai_audit_log
supabase/migrations/20260624000000_phase6_tasks.sql      — milestones, tasks, subtasks
supabase/migrations/20260624000001_notifications.sql     — notifications
supabase/migrations/20260625000000_task_comments_activity.sql — task_comments, activity_feed
```

---

## Authentication & Token Refresh

Sign-in uses Azure AD via NextAuth. The JWT callback stores the Graph `access_token` and `refresh_token`. When the access token is within 60 seconds of expiry, it is silently refreshed against the Azure AD `/oauth2/v2.0/token` endpoint — no re-login required.

If refresh fails (e.g. the refresh token itself expires after 90 days of inactivity), the session is tagged with `error: "RefreshAccessTokenError"` and the user is prompted to sign in again.

---

## Project Structure

```
app/
  (auth)/login/           — Azure AD sign-in page
  (dashboard)/
    dashboard/            — Project list + focus mode
    projects/[id]/        — Project workspace (milestones, tasks, logs, AI, scheduler)
    briefing/             — Daily briefing: my tasks, project snapshots, meetings
    supervisor/           — Supervisor view of shared team progress
    invites/[token]/      — Invite accept/decline
  api/
    auth/                 — NextAuth + magic-link + demo routes
    projects/             — Project CRUD
    milestones/           — Milestone CRUD
    tasks/                — Task CRUD (fires task_assigned notifications + activity log)
    tasks/[id]/subtasks/  — Subtask CRUD
    tasks/[id]/comments/  — Task comment CRUD (members post, authors delete)
    projects/[id]/activity/ — Project activity feed (last 50 events)
    search/               — Global search across projects, milestones, tasks
    channels/messages/    — Teams channel message feed via Microsoft Graph
    invites/              — Invite creation + acceptance (fires invite_received notifications)
    members/              — Member role management + supervisor sharing
    progress-logs/        — Progress log CRUD
    availability/         — Focus mode upsert
    calendar/             — Graph calendar: events, find-times, book
    ai/query/             — Claude query with milestone + task + log context
    hearts/               — AI quota (get + daily reset cron)
    notifications/        — Notification CRUD + daily generate cron
components/
  MilestoneBoard          — Accordion milestone/task/subtask board
  TaskDetailSlider        — Slide-over panel for full task editing
  ProgressLogForm         — Freeform status log UI
  AIQueryBox              — AI query box with preset quick-actions
  NotificationBell        — Header bell with unread badge + dropdown
  MeetingScheduler        — Graph availability finder + booking
  CalendarBriefing        — Today's meetings from Outlook
  FocusModePanel          — Focus mode toggle
  SharingSettings         — Supervisor sharing toggle
  SearchBar               — Global header search with debounced results dropdown
  ActivityFeed            — Per-project event timeline (client component)
  ChannelFeed             — Teams channel message reader (client component)
  DashboardShell          — Nav shell with search + hearts + notification bell + user menu
lib/
  auth.ts                 — NextAuth config with Azure AD + token refresh
  notifications.ts        — Server-side notification helper (service role, deduplicates)
  ai/agent.ts             — Claude Sonnet query with milestone + task + log context building
  graph/client.ts         — Microsoft Graph API client (Teams + Calendar)
  supabase/               — Server / client / demo Supabase factories
types/
  database.ts             — Full TypeScript type definitions for all tables
```

---

## Cron Jobs

| Schedule | Endpoint | What it does |
|----------|----------|-------------|
| `0 0 * * *` (midnight UTC) | `/api/hearts/reset` | Resets AI query quota to 10 for all users |
| `0 8 * * *` (8am UTC) | `/api/notifications/generate` | Creates overdue task alerts, milestone due-date warnings, and stale project nudges |

Both cron endpoints require `Authorization: Bearer <CRON_SECRET>`.

---

## Deployment

Deploy to Vercel. Set all environment variables in the Vercel project settings. Set `NEXTAUTH_URL` to your production URL. Cron schedules are defined in `vercel.json` and run automatically on Vercel's infrastructure.
