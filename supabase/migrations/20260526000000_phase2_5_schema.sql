-- Phase 2-5: availability, progress_logs, hearts, ai_audit_log
-- Run AFTER 20260514000000_phase1_schema.sql

-- ─── AVAILABILITY ─────────────────────────────────────────────────────────────
create table if not exists public.availability (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  project_id  uuid not null references public.projects(id) on delete cascade,
  is_focused  boolean not null default false,
  updated_at  timestamptz not null default now(),
  unique (user_id, project_id)
);

alter table public.availability enable row level security;

-- Members of the project can view availability for that project
create policy "project members can view availability"
  on public.availability for select
  using (public.is_project_member(project_id, auth.uid()));

-- Users can upsert their own availability
create policy "users can upsert own availability"
  on public.availability for insert
  with check (auth.uid() = user_id);

create policy "users can update own availability"
  on public.availability for update
  using (auth.uid() = user_id);

create index if not exists availability_project_id_idx on public.availability(project_id);
create index if not exists availability_user_id_idx on public.availability(user_id);

-- ─── PROGRESS LOGS ────────────────────────────────────────────────────────────
create table if not exists public.progress_logs (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  description text,
  status      text not null default 'not_started'
                check (status in ('not_started', 'in_progress', 'done')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.progress_logs enable row level security;

-- Active project members can view logs for their project
create policy "project members can view progress logs"
  on public.progress_logs for select
  using (public.is_project_member(project_id, auth.uid()));

-- Users can insert their own logs
create policy "users can insert own progress logs"
  on public.progress_logs for insert
  with check (
    auth.uid() = user_id
    and public.is_project_member(project_id, auth.uid())
  );

-- Users can update/delete their own logs
create policy "users can update own progress logs"
  on public.progress_logs for update
  using (auth.uid() = user_id);

create policy "users can delete own progress logs"
  on public.progress_logs for delete
  using (auth.uid() = user_id);

-- Supervisors can read logs shared with them (share_with_supervisor = true + supervisor_id = supervisor)
create policy "supervisors can view shared logs"
  on public.progress_logs for select
  using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = progress_logs.project_id
        and pm.user_id = progress_logs.user_id
        and pm.share_with_supervisor = true
        and pm.supervisor_id = auth.uid()
    )
  );

create index if not exists progress_logs_project_id_idx on public.progress_logs(project_id);
create index if not exists progress_logs_user_id_idx on public.progress_logs(user_id);
create index if not exists progress_logs_created_at_idx on public.progress_logs(created_at desc);

-- ─── HEARTS ───────────────────────────────────────────────────────────────────
create table if not exists public.hearts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references public.profiles(id) on delete cascade,
  remaining   int not null default 10,
  daily_limit int not null default 10,
  last_reset  timestamptz not null default now()
);

alter table public.hearts enable row level security;

create policy "users can view own hearts"
  on public.hearts for select
  using (auth.uid() = user_id);

create policy "users can update own hearts"
  on public.hearts for update
  using (auth.uid() = user_id);

create policy "users can insert own hearts"
  on public.hearts for insert
  with check (auth.uid() = user_id);

-- Auto-create a hearts row for new users
create or replace function public.handle_new_user_hearts()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.hearts (user_id, remaining, daily_limit, last_reset)
  values (new.id, 10, 10, now())
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_profile_created_hearts on public.profiles;
create trigger on_profile_created_hearts
  after insert on public.profiles
  for each row execute procedure public.handle_new_user_hearts();

-- ─── AI AUDIT LOG ─────────────────────────────────────────────────────────────
create table if not exists public.ai_audit_log (
  id               uuid primary key default gen_random_uuid(),
  requester_id     uuid references public.profiles(id) on delete set null,
  subject_user_id  uuid references public.profiles(id) on delete set null,
  project_id       uuid references public.projects(id) on delete set null,
  query            text not null,
  created_at       timestamptz not null default now()
);

alter table public.ai_audit_log enable row level security;

-- Only admins/supervisors and the requester can view audit logs
create policy "requesters can view own audit logs"
  on public.ai_audit_log for select
  using (auth.uid() = requester_id);

-- Admins can see all (requires role check on profiles)
create policy "admins can view all audit logs"
  on public.ai_audit_log for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "authenticated users can insert audit logs"
  on public.ai_audit_log for insert
  with check (auth.uid() = requester_id);

create index if not exists ai_audit_log_requester_idx on public.ai_audit_log(requester_id);
create index if not exists ai_audit_log_project_idx on public.ai_audit_log(project_id);
create index if not exists ai_audit_log_created_at_idx on public.ai_audit_log(created_at desc);

-- ─── TEAMS CHANNEL (Phase 3) ──────────────────────────────────────────────────
-- Add teams_channel_id column to projects table (nullable until provisioned)
alter table public.projects
  add column if not exists teams_channel_id text,
  add column if not exists teams_channel_url text;
