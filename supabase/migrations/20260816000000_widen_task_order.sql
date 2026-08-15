-- Widen tasks."order" so drag-to-reorder can persist fractional indices.
-- Lossless widening: every existing integer value is representable exactly.

alter table public.tasks
  alter column "order" type double precision;
