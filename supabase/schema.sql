-- weeklie schema (reference; applied via Supabase migration 'create_weeklie_schema')
-- Note: last_rolled_over_at is TEXT (date-only string used in equality comparisons).

create table if not exists public.tasks (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  date text,
  done boolean not null default false,
  done_at timestamptz,
  color text,
  "order" integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  planned_date text,
  rolled_over_count integer not null default 0,
  last_rolled_over_at text
);

alter table public.tasks
  add column if not exists recurrence text,
  add column if not exists note text,
  add column if not exists due_time text;

create index if not exists tasks_user_date_idx on public.tasks (user_id, date);

create table if not exists public.task_events (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_id text references public.tasks(id) on delete cascade,
  type text not null,
  from_date text,
  to_date text,
  created_at timestamptz not null default now()
);

create index if not exists task_events_user_created_idx on public.task_events (user_id, created_at);

create table if not exists public.week_reviews (
  week_id text not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  completed_count integer not null default 0,
  planned_count integer not null default 0,
  rolled_over_count integer not null default 0,
  reflection text not null default '',
  viewed_at timestamptz,
  streak integer not null default 0,
  completed_task_ids text[] not null default '{}',
  rolled_over_task_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, week_id)
);

alter table public.week_reviews
  add column if not exists intention text;

-- updated_at maintenance
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

drop trigger if exists week_reviews_set_updated_at on public.week_reviews;
create trigger week_reviews_set_updated_at
  before update on public.week_reviews
  for each row execute function public.set_updated_at();
