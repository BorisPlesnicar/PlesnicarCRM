-- Create employees table
create table if not exists public.employees (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  role text not null check (role in ('owner', 'supporter', 'employee')), -- owner = Unternehmensinhaber, supporter = Unterstützer, employee = Mitarbeiter
  description text, -- e.g., "IT & Bau", "Bau Unterstützung"
  profile_image_url text, -- URL to profile image
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Indexes
create index if not exists employees_user_id_idx on public.employees(user_id);

-- RLS
alter table public.employees enable row level security;

-- Policies
create policy "Users can view their own employees"
  on public.employees
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own employees"
  on public.employees
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own employees"
  on public.employees
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own employees"
  on public.employees
  for delete
  using (auth.uid() = user_id);

-- Trigger to auto-set user_id on insert
create or replace function public.handle_new_employee()
returns trigger as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_employee_created
  before insert on public.employees
  for each row
  execute function public.handle_new_employee();

-- Trigger to update updated_at
create or replace function public.handle_employee_updated()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger on_employee_updated
  before update on public.employees
  for each row
  execute function public.handle_employee_updated();

-- Add employee_id to notes table
alter table public.notes
add column if not exists employee_id uuid references public.employees(id) on delete set null;

create index if not exists notes_employee_id_idx on public.notes(employee_id);
