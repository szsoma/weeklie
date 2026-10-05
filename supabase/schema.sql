-- weekly schema (reference; applied via Supabase migrations)
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
  "order" double precision not null default 0,
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

create index if not exists day_checkins_user_id_date_idx
  on public.day_checkins (user_id, date);

create index if not exists week_shares_user_week_start_idx
  on public.week_shares (user_id, week_start);

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

drop trigger if exists day_checkins_set_updated_at on public.day_checkins;
create trigger day_checkins_set_updated_at
  before update on public.day_checkins
  for each row execute function public.set_updated_at();

drop trigger if exists week_shares_set_updated_at on public.week_shares;
create trigger week_shares_set_updated_at
  before update on public.week_shares
  for each row execute function public.set_updated_at();

drop trigger if exists habit_templates_set_updated_at on public.habit_templates;
create trigger habit_templates_set_updated_at
  before update on public.habit_templates
  for each row execute function public.set_updated_at();

drop trigger if exists habit_instances_set_updated_at on public.habit_instances;
create trigger habit_instances_set_updated_at
  before update on public.habit_instances
  for each row execute function public.set_updated_at();

-- ============================================================
-- RLS
-- ============================================================

alter table public.tasks enable row level security;
alter table public.task_events enable row level security;
alter table public.week_reviews enable row level security;
alter table public.day_checkins enable row level security;
alter table public.week_shares enable row level security;
alter table public.habit_templates enable row level security;
alter table public.habit_instances enable row level security;

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

drop policy if exists "Users can read own task events" on public.task_events;
create policy "Users can read own task events"
  on public.task_events for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can create own task events" on public.task_events;
create policy "Users can create own task events"
  on public.task_events for insert to authenticated
  with check (user_id = auth.uid());

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

-- ============================================================
-- Habit integrity RPCs (also applied by the 2026-10-05 migration)
-- ============================================================

-- Apply before deploying the frontend that calls these functions.

drop policy if exists "Users can delete own habit_templates" on public.habit_templates;
create policy "Users can delete own habit_templates"
  on public.habit_templates for delete to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.create_habit_occurrence(
  p_template_id text,
  p_task_id text,
  p_instance_id text,
  p_event_id text,
  p_for_date text,
  p_period_start text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  template_record public.habit_templates%rowtype;
  base_task public.tasks%rowtype;
  created_task public.tasks%rowtype;
  created_instance public.habit_instances%rowtype;
  created_event public.task_events%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_for_date is null or p_period_start is null
    or p_for_date <> to_char(p_for_date::date, 'YYYY-MM-DD')
    or p_period_start <> to_char(p_period_start::date, 'YYYY-MM-DD') then
    raise exception 'Habit dates must use YYYY-MM-DD' using errcode = '22007';
  end if;

  select * into template_record
    from public.habit_templates
    where id = p_template_id and user_id = auth.uid() and active
    for update;
  if not found then
    raise exception 'Habit template unavailable' using errcode = '42501';
  end if;

  select * into base_task
    from public.tasks
    where id = template_record.task_id and user_id = auth.uid() and deleted_at is null;
  if not found then
    raise exception 'Habit base task unavailable' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.habit_instances
    where habit_template_id = p_template_id and for_date = p_for_date
  ) then
    return null;
  end if;

  insert into public.tasks (
    id, title, date, done, color, recurrence, note, due_time, "order", planned_date
  ) values (
    p_task_id, base_task.title, p_for_date, false, base_task.color, null,
    base_task.note, base_task.due_time,
    coalesce((
      select max("order") + 1 from public.tasks
      where user_id = auth.uid() and date = p_for_date and deleted_at is null
    ), 1),
    p_for_date
  ) returning * into created_task;

  insert into public.habit_instances (
    id, habit_template_id, task_id, for_date, period_start
  ) values (
    p_instance_id, p_template_id, p_task_id, p_for_date, p_period_start
  ) returning * into created_instance;

  insert into public.task_events (id, task_id, type, from_date, to_date)
    values (p_event_id, p_task_id, 'created', null, p_for_date)
    returning * into created_event;

  return jsonb_build_object(
    'task', to_jsonb(created_task),
    'instance', to_jsonb(created_instance),
    'event', to_jsonb(created_event)
  );
end;
$$;

revoke all on function public.create_habit_occurrence(text, text, text, text, text, text) from public;
grant execute on function public.create_habit_occurrence(text, text, text, text, text, text) to authenticated;

create or replace function public.remove_habit_template_for_task(
  p_task_id text,
  p_from_date text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  template_record public.habit_templates%rowtype;
  removed_task public.tasks%rowtype;
  removed_ids text[] := '{}';
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_from_date is null or p_from_date <> to_char(p_from_date::date, 'YYYY-MM-DD') then
    raise exception 'Habit dates must use YYYY-MM-DD' using errcode = '22007';
  end if;

  select * into template_record
    from public.habit_templates
    where task_id = p_task_id and user_id = auth.uid()
    for update;
  if not found then
    return jsonb_build_object('deleted_task_ids', '[]'::jsonb);
  end if;

  for removed_task in
    update public.tasks
      set deleted_at = now()
      where user_id = auth.uid()
        and deleted_at is null
        and id in (
          select task_id from public.habit_instances
          where habit_template_id = template_record.id
            and for_date >= p_from_date
        )
      returning *
  loop
    removed_ids := array_append(removed_ids, removed_task.id);
    insert into public.task_events (id, task_id, type, from_date, to_date)
      values (gen_random_uuid()::text, removed_task.id, 'deleted', removed_task.date, null);
  end loop;

  delete from public.habit_templates where id = template_record.id and user_id = auth.uid();

  return jsonb_build_object('deleted_task_ids', to_jsonb(removed_ids));
end;
$$;

revoke all on function public.remove_habit_template_for_task(text, text) from public;
grant execute on function public.remove_habit_template_for_task(text, text) to authenticated;

-- Supabase default privileges grant anon EXECUTE directly on new functions.
revoke execute on function public.create_habit_occurrence(text, text, text, text, text, text) from anon;
revoke execute on function public.remove_habit_template_for_task(text, text) from anon;
