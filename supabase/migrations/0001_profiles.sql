-- Profile row keyed by Supabase auth.users.id.
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  cycle_start_day smallint not null check (cycle_start_day between 1 and 31),
  default_salary numeric(12,2),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Trigger: when a new auth.users row appears, create a placeholder profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, cycle_start_day)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', 'Utente'), 1)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
