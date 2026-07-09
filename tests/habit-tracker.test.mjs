import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8");
const migrationFiles = [
  new URL("../supabase/migrations/20260709000000_add_habit_tables.sql", import.meta.url),
];

for (const path of migrationFiles) {
  test(`migration exists and defines habit tables`, () => {
    const migration = readFileSync(path, "utf8");
    assert.match(migration, /create table if not exists public\.habit_templates/);
    assert.match(migration, /create table if not exists public\.habit_instances/);
    assert.match(migration, /habit_template_id text not null references public\.habit_templates/);
    assert.match(migration, /task_id text not null references public\.tasks/);
    assert.match(migration, /unique \(habit_template_id, for_date\)/);
  });

  test(`migration scopes habit data to authenticated users`, () => {
    const migration = readFileSync(path, "utf8");
    for (const table of ["habit_templates", "habit_instances"]) {
      assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
      assert.match(migration, new RegExp(`Users can read own ${table}`));
      assert.match(migration, new RegExp(`Users can create own ${table}`));
      assert.match(migration, new RegExp(`Users can update own ${table}`));
    }
  });
}

test("schema references habit tables", () => {
  assert.match(schema, /habit_templates/);
  assert.match(schema, /habit_instances/);
});

const types = readFileSync(new URL("../src/types.ts", import.meta.url), "utf8");

test("TypeScript exports habit types", () => {
  assert.match(types, /export type RecurrencePreset =/);
  assert.match(types, /export type RecurrenceRule =/);
  assert.match(types, /export type HabitTemplate =/);
  assert.match(types, /export type HabitInstance =/);
});

const habitsSource = readFileSync(new URL("../src/lib/habits.ts", import.meta.url), "utf8");

test("habit helpers export required functions", () => {
  assert.match(habitsSource, /export function getDueDatesForWeek/);
  assert.match(habitsSource, /export function formatRecurrenceSummary/);
  assert.match(habitsSource, /export function getHabitProgress/);
  assert.match(habitsSource, /export function getNextMondayMidnight/);
  assert.match(habitsSource, /export function presetToRule/);
});

const scheduler = readFileSync(new URL("../src/lib/scheduler.ts", import.meta.url), "utf8");

test("scheduler helper exports weekly timeout", () => {
  assert.match(scheduler, /export function startWeeklyHabitScheduler/);
  assert.match(scheduler, /setTimeout/);
  assert.match(scheduler, /getNextMondayMidnight/);
});

const store = readFileSync(new URL("../src/store.ts", import.meta.url), "utf8");

test("store manages habit state and actions", () => {
  assert.match(store, /habitTemplates/);
  assert.match(store, /habitInstances/);
  assert.match(store, /loadHabitTemplates/);
  assert.match(store, /loadHabitInstancesForWeek/);
  assert.match(store, /generateHabitInstancesForWeek/);
  assert.match(store, /upsertHabitTemplate/);
  assert.match(store, /archiveHabitTemplate/);
  assert.match(store, /deleteHabitTemplateForTask/);
});

test("generateHabitInstancesForWeek skips past dates", () => {
  assert.match(store, /dateKey < todayKey/);
  assert.match(store, /continue/);
});

const popover = readFileSync(new URL("../src/components/HabitRepeatPopover.tsx", import.meta.url), "utf8");

test("HabitRepeatPopover renders preset and custom controls", () => {
  assert.match(popover, /Never/);
  assert.match(popover, /Daily/);
  assert.match(popover, /Weekly/);
  assert.match(popover, /Biweekly/);
  assert.match(popover, /Custom/);
  assert.match(popover, /byWeekdays/);
  assert.match(popover, /target_per_period/);
  assert.match(popover, /upsertHabitTemplate/);
});
