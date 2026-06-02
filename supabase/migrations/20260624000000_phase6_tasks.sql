-- Phase 6: Milestones, Tasks, Subtasks

-- Milestones
create table milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade not null,
  title text not null,
  description text,
  target_date date,
  status text not null default 'open' check (status in ('open','in_progress','completed','cancelled')),
  created_by uuid references profiles(id) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tasks
create table tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade not null,
  milestone_id uuid references milestones(id) on delete set null,
  title text not null,
  description text,
  assignee_id uuid references profiles(id) on delete set null,
  due_date date,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  status text not null default 'not_started' check (status in ('not_started','in_progress','done','cancelled')),
  created_by uuid references profiles(id) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Subtasks
create table subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade not null,
  title text not null,
  is_completed boolean not null default false,
  assignee_id uuid references profiles(id) on delete set null,
  due_date date,
  created_by uuid references profiles(id) not null,
  created_at timestamptz default now()
);

-- Indexes
create index on milestones(project_id);
create index on tasks(project_id);
create index on tasks(milestone_id);
create index on tasks(assignee_id);
create index on subtasks(task_id);

-- RLS
alter table milestones enable row level security;
alter table tasks enable row level security;
alter table subtasks enable row level security;

-- Read policies
create policy "members read milestones" on milestones for select using (is_project_member(project_id));
create policy "members read tasks"      on tasks      for select using (is_project_member(project_id));
create policy "members read subtasks"   on subtasks   for select using (
  exists (select 1 from tasks t where t.id = subtasks.task_id and is_project_member(t.project_id))
);

-- Insert policies
create policy "members insert milestones" on milestones for insert with check (is_project_member(project_id));
create policy "members insert tasks"      on tasks      for insert with check (is_project_member(project_id));
create policy "members insert subtasks"   on subtasks   for insert with check (
  exists (select 1 from tasks t where t.id = subtasks.task_id and is_project_member(t.project_id))
);

-- Update policies
create policy "leaders update milestones" on milestones for update using (is_project_leader(project_id) or created_by = auth.uid());
create policy "leaders update tasks"      on tasks      for update using (is_project_leader(project_id) or created_by = auth.uid());
create policy "members update subtasks"   on subtasks   for update using (
  exists (select 1 from tasks t where t.id = subtasks.task_id and is_project_member(t.project_id))
);

-- Delete policies
create policy "leaders delete milestones" on milestones for delete using (is_project_leader(project_id));
create policy "leaders delete tasks"      on tasks      for delete using (is_project_leader(project_id) or created_by = auth.uid());
create policy "members delete subtasks"   on subtasks   for delete using (
  exists (select 1 from tasks t where t.id = subtasks.task_id and is_project_member(t.project_id))
);
