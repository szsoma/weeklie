-- Drop the habit tracker feature (habits + habit_entries tables).
-- Cascade removes indexes, triggers, and RLS policies bound to these tables.
-- This is destructive: any habit check-in data users have entered is deleted.

drop table if exists public.habit_entries cascade;
drop table if exists public.habits cascade;
