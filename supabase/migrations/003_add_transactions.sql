-- Create transactions table for income/expenses tracking
create table if not exists public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('income', 'expense')),
  amount numeric(10, 2) not null check (amount > 0),
  description text not null,
  category text,
  date date not null default current_date,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Indexes
create index if not exists transactions_user_id_idx on public.transactions(user_id);
create index if not exists transactions_date_idx on public.transactions(date);
create index if not exists transactions_type_idx on public.transactions(type);

-- RLS
alter table public.transactions enable row level security;

-- Policies
create policy "Users can view their own transactions"
  on public.transactions
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own transactions"
  on public.transactions
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own transactions"
  on public.transactions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own transactions"
  on public.transactions
  for delete
  using (auth.uid() = user_id);

-- Trigger to auto-set user_id on insert
create or replace function public.handle_new_transaction()
returns trigger as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_transaction_created
  before insert on public.transactions
  for each row
  execute function public.handle_new_transaction();

-- Trigger to update updated_at
create or replace function public.handle_transaction_updated()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger on_transaction_updated
  before update on public.transactions
  for each row
  execute function public.handle_transaction_updated();
