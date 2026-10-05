create schema auth;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create table public.tasks (
  id text primary key,
  user_id uuid not null default auth.uid(),
  title text not null,
  date text,
  done boolean not null default false,
  done_at timestamptz,
  color text,
  recurrence text,
  note text,
  due_time text,
  "order" double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  planned_date text,
  rolled_over_count integer not null default 0,
  last_rolled_over_at text
);
create table public.task_events (
  id text primary key,
  user_id uuid not null default auth.uid(),
  task_id text references public.tasks(id) on delete cascade,
  type text not null,
  from_date text,
  to_date text,
  created_at timestamptz not null default now()
);
create table public.habit_templates (
  id text primary key,
  user_id uuid not null default auth.uid(),
  task_id text not null references public.tasks(id) on delete cascade,
  recurrence jsonb not null,
  target_per_period integer not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.habit_instances (
  id text primary key,
  habit_template_id text not null references public.habit_templates(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  task_id text not null references public.tasks(id) on delete cascade,
  for_date text not null,
  period_start text not null,
  created_at timestamptz not null default now(),
  unique (habit_template_id, for_date)
);

grant usage on schema auth, public to authenticated;
grant usage on schema public to anon;
alter default privileges in schema public grant execute on functions to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

alter table public.tasks enable row level security;
alter table public.task_events enable row level security;
alter table public.habit_templates enable row level security;
alter table public.habit_instances enable row level security;
create policy tasks_own on public.tasks to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy events_own on public.task_events to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy templates_read on public.habit_templates for select to authenticated using (user_id = auth.uid());
create policy templates_create on public.habit_templates for insert to authenticated with check (user_id = auth.uid());
create policy templates_update on public.habit_templates for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy instances_own on public.habit_instances to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
insert into public.tasks (id, title, date, planned_date) values ('base', 'Read', '2026-10-05', '2026-10-05');
insert into public.habit_templates (id, task_id, recurrence) values ('template', 'base', '{"freq":"weekly","interval":1,"byWeekdays":[1]}');
