alter table public.expenses
  add column fingerprint text,
  add column import_id uuid;

create index idx_expenses_cycle_fingerprint
  on public.expenses (cycle_id, fingerprint);
