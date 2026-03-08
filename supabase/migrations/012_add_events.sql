-- Create events table for calendar integration
create table if not exists public.events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  location text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint valid_dates check (end_at > start_at)
);

-- Indexes
create index if not exists events_user_id_idx on public.events(user_id);
create index if not exists events_start_at_idx on public.events(start_at);
create index if not exists events_created_at_idx on public.events(created_at);

-- RLS
alter table public.events enable row level security;

-- Policies
create policy "Users can view their own events"
  on public.events
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own events"
  on public.events
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own events"
  on public.events
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own events"
  on public.events
  for delete
  using (auth.uid() = user_id);

-- Trigger to auto-set user_id on insert
create or replace function public.handle_new_event()
returns trigger as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_event_created
  before insert on public.events
  for each row
  execute function public.handle_new_event();

-- Trigger to update updated_at
create or replace function public.handle_event_updated()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger on_event_updated
  before update on public.events
  for each row
  execute function public.handle_event_updated();
