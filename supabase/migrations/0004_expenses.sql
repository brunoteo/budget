create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  amount numeric(12,2) not null check (amount >= 0),
  occurred_on date not null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.expenses enable row level security;

create policy "expenses_select_own"
  on public.expenses for select
  using (exists (select 1 from public.cycles c where c.id = cycle_id and c.user_id = auth.uid()));

create policy "expenses_insert_own"
  on public.expenses for insert
  with check (exists (select 1 from public.cycles c where c.id = cycle_id and c.user_id = auth.uid()));

create policy "expenses_update_own"
  on public.expenses for update
  using (exists (select 1 from public.cycles c where c.id = cycle_id and c.user_id = auth.uid()));

create policy "expenses_delete_own"
  on public.expenses for delete
  using (exists (select 1 from public.cycles c where c.id = cycle_id and c.user_id = auth.uid()));
