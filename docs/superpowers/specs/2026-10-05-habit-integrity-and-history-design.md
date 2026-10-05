# Habit integrity and complete history

The existing Supabase account and row policies remain the data boundary. A recurrence is anchored to the base task's original planned date, or its creation date for backlog tasks. Every frequency applies its integer interval and never generates before that anchor. Week selection only determines which due dates are examined.

Startup loads tasks and templates before attempting habit generation. The selected week's instances load before generation. Week changes repeat only the week-specific part. A failed load must not be treated as successful initialization.

Two authenticated, security-invoker Postgres functions protect multi-table habit changes. One creates a generated task, event, and habit instance in one database transaction and returns their rows. It locks the template, checks that it belongs to the caller and is active, and returns no row if the date already exists. The other removes a template and soft-deletes all future generated tasks linked to its instances across every week, with deletion events, in one transaction. Past generated tasks remain in history. Existing rows are preserved; the functions require a migration before the new frontend is deployed.

Habit save actions report persistence failure to the UI. The popover shows Saved only after the template change succeeds. Generation failure is reported separately and does not misrepresent the template save.

Tasks, events, and reviews load through ordered pages. State is replaced only after every page succeeds, so an API error cannot show a partial history as complete.
