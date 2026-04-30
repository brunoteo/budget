create table public.import_mappings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  wallet_category text not null,
  app_category_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, wallet_category)
);

alter table public.import_mappings enable row level security;

create policy "import_mappings_select_own" on public.import_mappings
  for select using (auth.uid() = user_id);
create policy "import_mappings_insert_own" on public.import_mappings
  for insert with check (auth.uid() = user_id);
create policy "import_mappings_update_own" on public.import_mappings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "import_mappings_delete_own" on public.import_mappings
  for delete using (auth.uid() = user_id);

create index idx_import_mappings_user on public.import_mappings (user_id);
