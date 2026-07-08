import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8");
const types = readFileSync(new URL("../src/types.ts", import.meta.url), "utf8");

test("Weeklie 2.1 schema defines persisted habit and check-in tables", () => {
  assert.match(schema, /create table if not exists public\.habits/);
  assert.match(schema, /create table if not exists public\.habit_entries/);
  assert.match(schema, /create table if not exists public\.day_checkins/);
  assert.match(schema, /unique \(habit_id, date\)/);
  assert.match(schema, /unique \(user_id, date\)/);
  assert.match(schema, /check \(energy is null or energy between 1 and 5\)/);
});

test("Weeklie 2.1 schema scopes new data to authenticated users", () => {
  for (const table of ["habits", "habit_entries", "day_checkins"]) {
    assert.match(schema, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(schema, new RegExp(`Users can read own ${table}`));
    assert.match(schema, new RegExp(`Users can create own ${table}`));
    assert.match(schema, new RegExp(`Users can update own ${table}`));
  }
});

test("Weeklie 2.1 TypeScript contracts are present", () => {
  assert.match(types, /export type Habit =/);
  assert.match(types, /export type HabitEntry =/);
  assert.match(types, /export type DayCheckin =/);
  assert.match(types, /export type QuickCaptureDestination =/);
  assert.match(types, /export type FocusColumnId =/);
});
