-- ============================================================
-- Plesnicar CRM – Database Schema with RLS
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. PROFILES
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2. CLIENTS
-- ============================================================
create table public.clients (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  name text not null,
  company text default '',
  email text default '',
  phone text default '',
  address text default '',
  notes text default '',
  status text not null default 'lead'
    check (status in ('lead', 'customer', 'archived')),
  created_at timestamptz default now()
);

create index idx_clients_user_id on public.clients(user_id);

alter table public.clients enable row level security;

create policy "Users can view own clients"
  on public.clients for select using (auth.uid() = user_id);
create policy "Users can insert own clients"
  on public.clients for insert with check (auth.uid() = user_id);
create policy "Users can update own clients"
  on public.clients for update using (auth.uid() = user_id);
create policy "Users can delete own clients"
  on public.clients for delete using (auth.uid() = user_id);

-- ============================================================
-- 3. PROJECTS
-- ============================================================
create table public.projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  client_id uuid not null references public.clients on delete cascade,
  title text not null,
  status text not null default 'planned'
    check (status in ('planned', 'active', 'done')),
  start_date date,
  end_date date,
  notes text default '',
  created_at timestamptz default now()
);

create index idx_projects_user_id on public.projects(user_id);
create index idx_projects_client_id on public.projects(client_id);

alter table public.projects enable row level security;

create policy "Users can view own projects"
  on public.projects for select using (auth.uid() = user_id);
create policy "Users can insert own projects"
  on public.projects for insert with check (auth.uid() = user_id);
create policy "Users can update own projects"
  on public.projects for update using (auth.uid() = user_id);
create policy "Users can delete own projects"
  on public.projects for delete using (auth.uid() = user_id);

-- ============================================================
-- 4. OFFERS
-- ============================================================
create table public.offers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  client_id uuid not null references public.clients on delete cascade,
  project_id uuid references public.projects on delete set null,
  offer_number text not null,
  date date not null default current_date,
  valid_until date,
  consultant_name text default '',
  consultant_phone text default '',
  hourly_rate numeric not null default 55,
  global_discount_percent numeric default 0,
  vat_percent numeric default 0,
  express_enabled boolean default false,
  express_surcharge_percent numeric default 0,
  hosting_setup_enabled boolean default false,
  hosting_setup_fee numeric default 0,
  maintenance_enabled boolean default false,
  maintenance_months int default 0,
  maintenance_monthly_fee numeric default 0,
  total numeric default 0,
  currency text default 'EUR',
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'accepted', 'rejected')),
  created_at timestamptz default now()
);

create index idx_offers_user_id on public.offers(user_id);
create index idx_offers_client_id on public.offers(client_id);
create index idx_offers_project_id on public.offers(project_id);

alter table public.offers enable row level security;

create policy "Users can view own offers"
  on public.offers for select using (auth.uid() = user_id);
create policy "Users can insert own offers"
  on public.offers for insert with check (auth.uid() = user_id);
create policy "Users can update own offers"
  on public.offers for update using (auth.uid() = user_id);
create policy "Users can delete own offers"
  on public.offers for delete using (auth.uid() = user_id);

-- ============================================================
-- 5. OFFER ITEMS
-- ============================================================
create table public.offer_items (
  id uuid primary key default uuid_generate_v4(),
  offer_id uuid not null references public.offers on delete cascade,
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  position int not null,
  service_name text not null,
  hours numeric not null default 0,
  hourly_rate numeric not null default 55,
  discount_percent numeric default 0,
  net_total numeric default 0,
  created_at timestamptz default now()
);

create index idx_offer_items_offer_id on public.offer_items(offer_id);
create index idx_offer_items_user_id on public.offer_items(user_id);

alter table public.offer_items enable row level security;

create policy "Users can view own offer items"
  on public.offer_items for select using (auth.uid() = user_id);
create policy "Users can insert own offer items"
  on public.offer_items for insert with check (auth.uid() = user_id);
create policy "Users can update own offer items"
  on public.offer_items for update using (auth.uid() = user_id);
create policy "Users can delete own offer items"
  on public.offer_items for delete using (auth.uid() = user_id);

-- ============================================================
-- 6. TIME ENTRIES
-- ============================================================
create table public.time_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  project_id uuid not null references public.projects on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz,
  duration_minutes int,
  note text default '',
  created_at timestamptz default now()
);

create index idx_time_entries_user_id on public.time_entries(user_id);
create index idx_time_entries_project_id on public.time_entries(project_id);

alter table public.time_entries enable row level security;

create policy "Users can view own time entries"
  on public.time_entries for select using (auth.uid() = user_id);
create policy "Users can insert own time entries"
  on public.time_entries for insert with check (auth.uid() = user_id);
create policy "Users can update own time entries"
  on public.time_entries for update using (auth.uid() = user_id);
create policy "Users can delete own time entries"
  on public.time_entries for delete using (auth.uid() = user_id);
