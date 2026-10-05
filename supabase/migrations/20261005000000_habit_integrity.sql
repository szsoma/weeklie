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
  if p_for_date <> to_char(p_for_date::date, 'YYYY-MM-DD')
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

create or replace function public.remove_habit_template_for_task(p_task_id text)
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
            and for_date >= current_date::text
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

revoke all on function public.remove_habit_template_for_task(text) from public;
grant execute on function public.remove_habit_template_for_task(text) to authenticated;
