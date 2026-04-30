-- Users (synced from Azure AD via NextAuth)
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  azure_id text unique not null,
  email text unique not null,
  name text,
  role text not null default 'member', -- 'member' | 'supervisor' | 'admin'
  created_at timestamptz default now()
);

-- Projects
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  teams_channel_id text, -- MS Teams channel provisioned via Graph API
  created_by uuid references users(id),
  created_at timestamptz default now()
);

-- Project members (consent-based)
create table if not exists project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  role text not null default 'member', -- 'leader' | 'member'
  status text not null default 'pending', -- 'pending' | 'active' | 'declined'
  share_with_supervisor boolean not null default false,
  supervisor_id uuid references users(id),
  joined_at timestamptz,
  unique(project_id, user_id)
);

-- Project-scoped availability
create table if not exists availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  is_focused boolean not null default false,
  updated_at timestamptz default now(),
  unique(user_id, project_id)
);

-- Progress logs
create table if not exists progress_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'in_progress', -- 'not_started' | 'in_progress' | 'done'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- AI hearts (rate limiting)
create table if not exists hearts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade unique,
  remaining integer not null default 10,
  daily_limit integer not null default 10,
  last_reset timestamptz default now()
);

-- AI audit log
create table if not exists ai_audit_log (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references users(id),
  subject_user_id uuid references users(id),
  project_id uuid references projects(id),
  query text not null,
  created_at timestamptz default now()
);

-- Row-level security
alter table users enable row level security;
alter table projects enable row level security;
alter table project_members enable row level security;
alter table availability enable row level security;
alter table progress_logs enable row level security;
alter table hearts enable row level security;
alter table ai_audit_log enable row level security;

-- Users can read their own record
create policy "users_select_own" on users for select using (auth.uid()::text = azure_id);

-- Members can see projects they belong to
create policy "projects_select_member" on projects for select using (
  exists (
    select 1 from project_members
    where project_members.project_id = projects.id
    and project_members.user_id = (select id from users where azure_id = auth.uid()::text)
    and project_members.status = 'active'
  )
);

-- Members see progress logs for their projects
create policy "progress_logs_select_member" on progress_logs for select using (
  exists (
    select 1 from project_members
    where project_members.project_id = progress_logs.project_id
    and project_members.user_id = (select id from users where azure_id = auth.uid()::text)
    and project_members.status = 'active'
  )
);

-- Users manage their own progress logs
create policy "progress_logs_insert_own" on progress_logs for insert with check (
  user_id = (select id from users where azure_id = auth.uid()::text)
);

create policy "progress_logs_update_own" on progress_logs for update using (
  user_id = (select id from users where azure_id = auth.uid()::text)
);

-- Availability visible within project members
create policy "availability_select_member" on availability for select using (
  exists (
    select 1 from project_members
    where project_members.project_id = availability.project_id
    and project_members.user_id = (select id from users where azure_id = auth.uid()::text)
    and project_members.status = 'active'
  )
);

-- Users manage their own availability
create policy "availability_upsert_own" on availability for all using (
  user_id = (select id from users where azure_id = auth.uid()::text)
);

-- Hearts: users see/update their own
create policy "hearts_own" on hearts for all using (
  user_id = (select id from users where azure_id = auth.uid()::text)
);
