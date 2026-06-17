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
  on public.week_shares
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can create own week shares" on public.week_shares;
create policy "Users can create own week shares"
  on public.week_shares
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update own week shares" on public.week_shares;
create policy "Users can update own week shares"
  on public.week_shares
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own week shares" on public.week_shares;
create policy "Users can delete own week shares"
  on public.week_shares
  for delete
  to authenticated
  using (user_id = auth.uid());

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
