-- Supabase grants anon EXECUTE on new functions through default privileges.
-- The habit RPCs use authenticated owner policies, so remove that direct grant.

revoke execute on function public.create_habit_occurrence(text, text, text, text, text, text) from anon;
revoke execute on function public.remove_habit_template_for_task(text, text) from anon;
