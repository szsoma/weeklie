-- Add habit tracker tables (templates + generated instances).

-- ============================================================
-- Habit tables
-- ============================================================

create table if not exists public.habit_templates (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_id text not null references public.tasks(id) on delete cascade,
  recurrence jsonb not null default '{"freq":"weekly","interval":1,"byWeekdays":[]}'::jsonb,
  target_per_period integer not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.habit_instances (
  id text primary key,
  habit_template_id text not null references public.habit_templates(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_id text not null references public.tasks(id) on delete cascade,
  for_date text not null,
  period_start text not null,
  created_at timestamptz not null default now()
);

create index if not exists habit_templates_user_id_idx
  on public.habit_templates (user_id);

create index if not exists habit_instances_user_id_date_idx
  on public.habit_instances (user_id, for_date);

create unique index if not exists habit_instances_template_date_idx
  on public.habit_instances (habit_template_id, for_date);

alter table public.habit_instances
  add constraint if not exists habit_instances_template_date_unq
  unique (habit_template_id, for_date);

drop trigger if exists habit_templates_set_updated_at on public.habit_templates;
create trigger habit_templates_set_updated_at
  before update on public.habit_templates
  for each row execute function public.set_updated_at();

drop trigger if exists habit_instances_set_updated_at on public.habit_instances;
create trigger habit_instances_set_updated_at
  before update on public.habit_instances
  for each row execute function public.set_updated_at();

alter table public.habit_templates enable row level security;
alter table public.habit_instances enable row level security;

-- Habit templates RLS
drop policy if exists "Users can read own habit_templates" on public.habit_templates;
create policy "Users can read own habit_templates"
  on public.habit_templates for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own habit_templates" on public.habit_templates;
create policy "Users can create own habit_templates"
  on public.habit_templates for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own habit_templates" on public.habit_templates;
create policy "Users can update own habit_templates"
  on public.habit_templates for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Habit instances RLS
drop policy if exists "Users can read own habit_instances" on public.habit_instances;
create policy "Users can read own habit_instances"
  on public.habit_instances for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own habit_instances" on public.habit_instances;
create policy "Users can create own habit_instances"
  on public.habit_instances for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own habit_instances" on public.habit_instances;
create policy "Users can update own habit_instances"
  on public.habit_instances for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
