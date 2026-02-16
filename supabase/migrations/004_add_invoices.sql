-- Create invoices table
create table if not exists public.invoices (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  client_id uuid not null references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  offer_id uuid references public.offers(id) on delete set null, -- Optional link to offer
  invoice_number text not null,
  invoice_date date not null default current_date,
  due_date date not null,
  payment_term_days int default 14,
  customer_number text,
  net_amount numeric(10, 2) not null default 0,
  vat_amount numeric(10, 2) not null default 0,
  total_amount numeric(10, 2) not null default 0,
  vat_percent numeric(5, 2) default 0,
  currency text default 'EUR',
  is_partial_payment boolean default false, -- True if this is a partial payment
  partial_payment_of_total numeric(10, 2), -- Total amount this partial payment is part of
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Indexes
create index if not exists invoices_user_id_idx on public.invoices(user_id);
create index if not exists invoices_client_id_idx on public.invoices(client_id);
create index if not exists invoices_project_id_idx on public.invoices(project_id);
create index if not exists invoices_offer_id_idx on public.invoices(offer_id);
create index if not exists invoices_date_idx on public.invoices(invoice_date);
create index if not exists invoices_status_idx on public.invoices(status);

-- RLS
alter table public.invoices enable row level security;

-- Policies
create policy "Users can view their own invoices"
  on public.invoices
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own invoices"
  on public.invoices
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own invoices"
  on public.invoices
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own invoices"
  on public.invoices
  for delete
  using (auth.uid() = user_id);

-- Trigger to auto-set user_id on insert
create or replace function public.handle_new_invoice()
returns trigger as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_invoice_created
  before insert on public.invoices
  for each row
  execute function public.handle_new_invoice();

-- Trigger to update updated_at
create or replace function public.handle_invoice_updated()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger on_invoice_updated
  before update on public.invoices
  for each row
  execute function public.handle_invoice_updated();

-- ============================================================
-- INVOICE ITEMS
-- ============================================================
create table if not exists public.invoice_items (
  id uuid default gen_random_uuid() primary key,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade not null,
  position int not null,
  description text not null,
  quantity numeric(10, 2) not null default 1,
  unit text default 'Stk',
  unit_price numeric(10, 2) not null,
  vat_percent numeric(5, 2) default 0,
  discount_percent numeric(5, 2) default 0,
  total numeric(10, 2) not null,
  created_at timestamptz default now() not null
);

-- Indexes
create index if not exists invoice_items_invoice_id_idx on public.invoice_items(invoice_id);
create index if not exists invoice_items_user_id_idx on public.invoice_items(user_id);

-- RLS
alter table public.invoice_items enable row level security;

-- Policies
create policy "Users can view their own invoice items"
  on public.invoice_items
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own invoice items"
  on public.invoice_items
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own invoice items"
  on public.invoice_items
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own invoice items"
  on public.invoice_items
  for delete
  using (auth.uid() = user_id);

-- Trigger to auto-set user_id on insert
create or replace function public.handle_new_invoice_item()
returns trigger as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_invoice_item_created
  before insert on public.invoice_items
  for each row
  execute function public.handle_new_invoice_item();
