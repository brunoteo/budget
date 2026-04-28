create table public.categories (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  name text not null,
  expected_amount numeric(12,2) not null default 0 check (expected_amount >= 0),
  is_fixed boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

create policy "categories_select_own"
  on public.categories for select
  using (exists (select 1 from public.cycles c where c.id = cycle_id and c.user_id = auth.uid()));

create policy "categories_insert_own"
  on public.categories for insert
  with check (exists (select 1 from public.cycles c where c.id = cycle_id and c.user_id = auth.uid()));

create policy "categories_update_own"
  on public.categories for update
  using (exists (select 1 from public.cycles c where c.id = cycle_id and c.user_id = auth.uid()));

create policy "categories_delete_own"
  on public.categories for delete
  using (exists (select 1 from public.cycles c where c.id = cycle_id and c.user_id = auth.uid()));
