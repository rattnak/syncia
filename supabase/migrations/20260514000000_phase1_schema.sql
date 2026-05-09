-- Phase 1: profiles, projects, project_members, invites
-- Run this in the Supabase SQL editor or via supabase db push

-- ─── PROFILES ─────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  full_name   text,
  role        text not null default 'member' check (role in ('member', 'supervisor', 'admin')),
  created_at  timestamptz not null default now()
);

-- Auto-create a profile when a user confirms their email
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── PROJECTS ─────────────────────────────────────────────────────────────────
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ─── PROJECT MEMBERS ──────────────────────────────────────────────────────────
create table if not exists public.project_members (
  id                    uuid primary key default gen_random_uuid(),
  project_id            uuid not null references public.projects(id) on delete cascade,
  user_id               uuid not null references public.profiles(id) on delete cascade,
  role                  text not null default 'member' check (role in ('leader', 'member')),
  status                text not null default 'pending' check (status in ('pending', 'active', 'declined')),
  share_with_supervisor boolean not null default false,
  supervisor_id         uuid references public.profiles(id) on delete set null,
  joined_at             timestamptz,
  unique (project_id, user_id)
);

-- ─── INVITES ──────────────────────────────────────────────────────────────────
create table if not exists public.invites (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  invited_email  text not null,
  invited_by     uuid not null references public.profiles(id) on delete cascade,
  token          uuid not null unique default gen_random_uuid(),
  status         text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null default (now() + interval '7 days')
);

-- ─── HELPER FUNCTIONS (security definer = bypass RLS, preventing infinite recursion) ──────────

create or replace function public.is_project_member(p_project_id uuid, p_user_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id
      and user_id = p_user_id
      and status = 'active'
  );
$$;

create or replace function public.is_project_leader(p_project_id uuid, p_user_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id
      and user_id = p_user_id
      and role = 'leader'
      and status = 'active'
  );
$$;

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.invites enable row level security;

-- profiles: users can read their own profile; leaders can read profiles of project members
create policy "users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- projects: visible to active members only
create policy "members can view projects they belong to"
  on public.projects for select
  using (public.is_project_member(id, auth.uid()));

create policy "authenticated users can create projects"
  on public.projects for insert
  with check (auth.uid() is not null);

create policy "leaders can update their projects"
  on public.projects for update
  using (public.is_project_leader(id, auth.uid()));

-- project_members: a user can see their own row, or any row on a project they actively belong to
create policy "members can view project_members of their projects"
  on public.project_members for select
  using (
    user_id = auth.uid()
    or public.is_project_member(project_id, auth.uid())
  );

create policy "users can insert their own membership"
  on public.project_members for insert
  with check (auth.uid() = user_id);

create policy "users can update their own membership"
  on public.project_members for update
  using (auth.uid() = user_id);

create policy "leaders can insert members"
  on public.project_members for insert
  with check (public.is_project_leader(project_id, auth.uid()));

-- invites: invited user can see their own invite by email; leaders can see/create invites for their projects
create policy "invitees can view their invites"
  on public.invites for select
  using (
    invited_email = (select email from public.profiles where id = auth.uid())
    or public.is_project_leader(project_id, auth.uid())
  );

create policy "leaders can create invites"
  on public.invites for insert
  with check (public.is_project_leader(project_id, auth.uid()));

create policy "invitees can update their invite status"
  on public.invites for update
  using (
    invited_email = (select email from public.profiles where id = auth.uid())
  );

-- ─── INDEXES ──────────────────────────────────────────────────────────────────
create index if not exists project_members_user_id_idx on public.project_members(user_id);
create index if not exists project_members_project_id_idx on public.project_members(project_id);
create index if not exists invites_token_idx on public.invites(token);
create index if not exists invites_email_idx on public.invites(invited_email);
