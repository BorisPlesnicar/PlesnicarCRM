-- Create notes table
create table if not exists public.notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text not null,
  images text[], -- Array of image URLs/paths
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Indexes
create index if not exists notes_user_id_idx on public.notes(user_id);
create index if not exists notes_created_at_idx on public.notes(created_at);

-- RLS
alter table public.notes enable row level security;

-- Policies
create policy "Users can view their own notes"
  on public.notes
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own notes"
  on public.notes
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own notes"
  on public.notes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own notes"
  on public.notes
  for delete
  using (auth.uid() = user_id);

-- Trigger to auto-set user_id on insert
create or replace function public.handle_new_note()
returns trigger as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_note_created
  before insert on public.notes
  for each row
  execute function public.handle_new_note();

-- Trigger to update updated_at
create or replace function public.handle_note_updated()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger on_note_updated
  before update on public.notes
  for each row
  execute function public.handle_note_updated();
