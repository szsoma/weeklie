# Habit Integrity and History Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for inline execution. Each task uses a failing behavior test before implementation.

**Goal:** Resolve the five P1 and P2 findings in the 2026-10-05 review without changing the existing account or data ownership.

**Architecture:** Pure recurrence and pagination helpers cover deterministic behavior. App startup orchestrates its dependent loads. Security-invoker Postgres RPCs make habit generation and removal atomic under existing RLS; the store uses their returned rows and propagates save failures.

**Tech Stack:** TypeScript, React, Zustand, Supabase JavaScript v2, Postgres, Node test runner.

## Task 1: Recurrence intervals

- Add behavior tests for daily, weekly, monthly, yearly intervals, anchor boundaries, and biweekly weekday selection.
- Update `src/lib/habits.ts` to accept the base task's stable date and calculate due dates from it.
- Pass that date from `src/store.ts` generation.
- Run focused tests and commit.

## Task 2: Startup ordering

- Test an extracted async coordinator with deliberately delayed task loading.
- Make `src/App.tsx` load tasks and templates successfully before week instances and generation; avoid reloading the full task history on week changes.
- Run focused tests, typecheck, and commit.

## Task 3: Transactional habit operations and truthful save feedback

- Add a migration and update `supabase/schema.sql` with authenticated security-invoker functions for atomic task/instance creation and template removal across all weeks. Add the missing template delete RLS policy.
- Test the SQL against a disposable local Postgres fixture, including an injected instance failure, duplicate generation, and removal of future tasks outside the visible week.
- Replace the store's multi-request write paths with RPC calls. Propagate template save errors; show Failed rather than Saved in the popover.
- Run focused tests, typecheck, and commit.

## Task 4: Complete history

- Test a page loader over more than 1,000 records and a later-page error.
- Page ordered task, event, and review reads in `src/store.ts`, preserving prior state on error.
- Run focused tests, typecheck, and commit.

## Task 5: Verification and integration

- Run `npm run test:all`, `npm run build`, and `git diff --check`.
- Review the migration and document that it must be applied before deploying the frontend.
- Merge the verified branch to `main` and report live database validation separately from local fixture validation.
