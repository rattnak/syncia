-- Phase 7: task comments and project activity feed

-- ─── TASK COMMENTS ────────────────────────────────────────────────────────────
create table task_comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references tasks(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  body       text not null check (char_length(body) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on task_comments(task_id);
create index on task_comments(user_id);
create index on task_comments(created_at desc);

alter table task_comments enable row level security;

create policy "members read task comments" on task_comments for select using (
  exists (
    select 1 from tasks t where t.id = task_comments.task_id
      and is_project_member(t.project_id)
  )
);

create policy "members insert task comments" on task_comments for insert with check (
  auth.uid() = user_id
  and exists (
    select 1 from tasks t where t.id = task_comments.task_id
      and is_project_member(t.project_id)
  )
);

create policy "authors update task comments" on task_comments for update
  using (auth.uid() = user_id);

create policy "authors delete task comments" on task_comments for delete
  using (auth.uid() = user_id);

-- ─── ACTIVITY FEED ────────────────────────────────────────────────────────────
-- Append-only event log; written server-side via service role.
create table activity_feed (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  actor_id     uuid references profiles(id) on delete set null,
  entity_type  text not null, -- 'task' | 'milestone' | 'progress_log' | 'member' | 'comment'
  entity_id    uuid,
  action       text not null, -- 'created' | 'updated' | 'completed' | 'deleted' | 'joined' | 'commented'
  meta         jsonb not null default '{}',
  created_at   timestamptz not null default now()
);

create index on activity_feed(project_id, created_at desc);
create index on activity_feed(actor_id);

alter table activity_feed enable row level security;

create policy "members read activity" on activity_feed for select
  using (is_project_member(project_id));
-- Insert via service role only (no user-facing insert policy)
