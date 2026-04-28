create index cycles_user_start_idx on public.cycles (user_id, start_date desc);
create index categories_cycle_idx on public.categories (cycle_id, sort_order);
create index expenses_cycle_date_idx on public.expenses (cycle_id, occurred_on desc);
create index expenses_category_idx on public.expenses (category_id);
