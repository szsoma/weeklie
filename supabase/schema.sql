-- weeklie schema (reference; applied via Supabase migration 'create_weeklie_schema')
-- Note: last_rolled_over_at is TEXT (date-only string used in equality comparisons).

-- weeklie schema (applied via Supabase migration 'create_weeklie_schema')
-- Note: last_rolled_over_at is TEXT (date-only string used in equality comparisons).

-- ============================================================
-- Base tables
-- ============================================================

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

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  color text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.habit_entries (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid references public.habits(id) on delete cascade not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, date)
);

create table if not exists public.day_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  energy smallint,
  mood text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date),
  check (energy is null or energy between 1 and 5)
);

create index if not exists habits_user_id_idx
  on public.habits (user_id);

create index if not exists habit_entries_user_id_date_idx
  on public.habit_entries (user_id, date);

create index if not exists habit_entries_habit_id_date_idx
  on public.habit_entries (habit_id, date);

create index if not exists day_checkins_user_id_date_idx
  on public.day_checkins (user_id, date);

-- ============================================================
-- updated_at trigger function
-- ============================================================

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

drop trigger if exists habits_set_updated_at on public.habits;
create trigger habits_set_updated_at
  before update on public.habits
  for each row execute function public.set_updated_at();

drop trigger if exists habit_entries_set_updated_at on public.habit_entries;
create trigger habit_entries_set_updated_at
  before update on public.habit_entries
  for each row execute function public.set_updated_at();

drop trigger if exists day_checkins_set_updated_at on public.day_checkins;
create trigger day_checkins_set_updated_at
  before update on public.day_checkins
  for each row execute function public.set_updated_at();

-- ============================================================
-- RLS: enable on all tables
-- ============================================================

alter table public.tasks enable row level security;
alter table public.task_events enable row level security;
alter table public.week_reviews enable row level security;
alter table public.habits enable row level security;
alter table public.habit_entries enable row level security;
alter table public.day_checkins enable row level security;

-- Tasks RLS
drop policy if exists "Users can read own tasks" on public.tasks;
create policy "Users can read own tasks"
  on public.tasks for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can create own tasks" on public.tasks;
create policy "Users can create own tasks"
  on public.tasks for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update own tasks" on public.tasks;
create policy "Users can update own tasks"
  on public.tasks for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own tasks" on public.tasks;
create policy "Users can delete own tasks"
  on public.tasks for delete to authenticated
  using (user_id = auth.uid());

-- Task events RLS
drop policy if exists "Users can read own task events" on public.task_events;
create policy "Users can read own task events"
  on public.task_events for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can create own task events" on public.task_events;
create policy "Users can create own task events"
  on public.task_events for insert to authenticated
  with check (user_id = auth.uid());

-- Week reviews RLS
drop policy if exists "Users can read own week reviews" on public.week_reviews;
create policy "Users can read own week reviews"
  on public.week_reviews for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can create own week reviews" on public.week_reviews;
create policy "Users can create own week reviews"
  on public.week_reviews for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update own week reviews" on public.week_reviews;
create policy "Users can update own week reviews"
  on public.week_reviews for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Habits RLS
drop policy if exists "Users can read own habits" on public.habits;
create policy "Users can read own habits"
  on public.habits for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own habits" on public.habits;
create policy "Users can create own habits"
  on public.habits for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own habits" on public.habits;
create policy "Users can update own habits"
  on public.habits for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Habit entries RLS
drop policy if exists "Users can read own habit_entries" on public.habit_entries;
create policy "Users can read own habit_entries"
  on public.habit_entries for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own habit_entries" on public.habit_entries;
create policy "Users can create own habit_entries"
  on public.habit_entries for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own habit_entries" on public.habit_entries;
create policy "Users can update own habit_entries"
  on public.habit_entries for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Day check-ins RLS
drop policy if exists "Users can read own day_checkins" on public.day_checkins;
create policy "Users can read own day_checkins"
  on public.day_checkins for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own day_checkins" on public.day_checkins;
create policy "Users can create own day_checkins"
  on public.day_checkins for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own day_checkins" on public.day_checkins;
create policy "Users can update own day_checkins"
  on public.day_checkins for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ============================================================
-- Week shares
-- ============================================================

create table if not exists public.week_shares (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  week_id text not null,
  week_start text not null,
  token text not null unique,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create index if not exists week_shares_user_week_start_idx
  on public.week_shares (user_id, week_start);

drop trigger if exists week_shares_set_updated_at on public.week_shares;
create trigger week_shares_set_updated_at
  before update on public.week_shares
  for each row execute function public.set_updated_at();

alter table public.week_shares enable row level security;

drop policy if exists "Users can read own week shares" on public.week_shares;
create policy "Users can read own week shares"
  on public.week_shares for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can create own week shares" on public.week_shares;
create policy "Users can create own week shares"
  on public.week_shares for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update own week shares" on public.week_shares;
create policy "Users can update own week shares"
  on public.week_shares for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own week shares" on public.week_shares;
create policy "Users can delete own week shares"
  on public.week_shares for delete to authenticated
  using (user_id = auth.uid());

-- ============================================================
-- Shared week RPC (security definer, anon-accessible)
-- ============================================================

create or replace function public.get_shared_week(share_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  share_record public.week_shares%rowtype;
  week_end text;
begin
  select *
    into share_record
    from public.week_shares
    where token = share_token
      and revoked_at is null
    limit 1;

  if share_record.id is null then
    return jsonb_build_object(
      'ok', false,
      'reason', 'unavailable'
    );
  end if;

  week_end := to_char((share_record.week_start::date + interval '7 days'), 'YYYY-MM-DD');

  return jsonb_build_object(
    'ok', true,
    'week_id', share_record.week_id,
    'week_start', share_record.week_start,
    'tasks', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', t.id,
            'title', t.title,
            'date', t.date,
            'done', t.done,
            'color', t.color,
            'order', t."order"
          )
          order by t.date, t."order"
        )
        from public.tasks t
        where t.user_id = share_record.user_id
          and t.deleted_at is null
          and t.date is not null
          and t.date >= share_record.week_start
          and t.date < week_end
      ),
      '[]'::jsonb
    )
  );
end;
$$;

revoke all on function public.get_shared_week(text) from public;
grant execute on function public.get_shared_week(text) to anon, authenticated;
