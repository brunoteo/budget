-- 0009_search_indexes.sql
-- Trigram index on expenses.note for cross-cycle search.
-- gin_trgm_ops supports both LIKE and ILIKE patterns of length >= 3.

create extension if not exists pg_trgm;

create index if not exists expenses_note_trgm_idx
  on public.expenses
  using gin (coalesce(note, '') gin_trgm_ops);
