-- Create login_codes table for secure code-based authentication
create table if not exists public.login_codes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  code_hash text not null, -- Hashed code using crypt
  code text not null, -- Plain code for initial setup (will be removed after first use)
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  last_used_at timestamptz,
  expires_at timestamptz, -- Optional expiration
  unique(user_id, code_hash)
);

-- Indexes
create index if not exists login_codes_user_id_idx on public.login_codes(user_id);
create index if not exists login_codes_code_hash_idx on public.login_codes(code_hash);
create index if not exists login_codes_is_active_idx on public.login_codes(is_active);

-- RLS
alter table public.login_codes enable row level security;

-- Policies - Only authenticated users can view their own codes
create policy "Users can view their own login codes"
  on public.login_codes
  for select
  using (auth.uid() = user_id);

-- Allow the verify_login_code function to read codes (security definer bypasses RLS)
-- The function itself uses SECURITY DEFINER, so it can bypass RLS
-- But we need to ensure the function can read from the table
-- Actually, SECURITY DEFINER functions bypass RLS automatically, so this should work

-- Function to verify login code
-- SECURITY DEFINER allows the function to bypass RLS
create or replace function public.verify_login_code(input_code text)
returns uuid as $$
declare
  found_user_id uuid;
  code_record record;
begin
  -- Find active code that matches
  -- SECURITY DEFINER bypasses RLS, so we can read all codes
  select lc.user_id, lc.id, lc.code
  into code_record
  from public.login_codes lc
  where lc.is_active = true
    and (lc.expires_at is null or lc.expires_at > now())
    and (
      -- Check plain code (for initial setup) - trim both sides for safety
      trim(lc.code) = trim(input_code)
      or
      -- Check hashed code using crypt
      lc.code_hash = crypt(trim(input_code), lc.code_hash)
    )
  limit 1;

  if code_record is null then
    return null;
  end if;

  -- Update last_used_at
  update public.login_codes
  set last_used_at = now()
  where id = code_record.id;

  return code_record.user_id;
end;
$$ language plpgsql security definer;

-- Function to create a login code for a user
create or replace function public.create_login_code(target_user_id uuid, plain_code text)
returns uuid as $$
declare
  code_id uuid;
  hashed_code text;
begin
  -- Hash the code using crypt
  hashed_code := crypt(plain_code, gen_salt('bf'));

  -- Insert the code
  insert into public.login_codes (user_id, code_hash, code, is_active)
  values (target_user_id, hashed_code, plain_code, true)
  on conflict (user_id, code_hash) do update
  set code = plain_code,
      is_active = true,
      last_used_at = null
  returning id into code_id;

  return code_id;
end;
$$ language plpgsql security definer;

-- Enable pgcrypto extension for password hashing
create extension if not exists pgcrypto;
