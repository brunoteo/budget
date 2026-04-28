create table public.cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  salary numeric(12,2),
  extra_income jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, start_date)
);

alter table public.cycles enable row level security;

create policy "cycles_select_own" on public.cycles for select using (auth.uid() = user_id);
create policy "cycles_insert_own" on public.cycles for insert with check (auth.uid() = user_id);
create policy "cycles_update_own" on public.cycles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cycles_delete_own" on public.cycles for delete using (auth.uid() = user_id);
