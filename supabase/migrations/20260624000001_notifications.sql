-- Phase 6: In-app notifications

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  type text not null, -- 'task_overdue' | 'task_assigned' | 'project_stale' | 'milestone_due' | 'invite_received'
  payload jsonb not null default '{}',
  is_read boolean not null default false,
  created_at timestamptz default now()
);

create index on notifications(user_id, is_read);
create index on notifications(created_at desc);

alter table notifications enable row level security;

create policy "users read own notifications"   on notifications for select using (user_id = auth.uid());
create policy "users update own notifications" on notifications for update using (user_id = auth.uid());
-- Inserts are done server-side via service role key only
