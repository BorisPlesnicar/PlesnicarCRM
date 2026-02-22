-- Storage buckets need to be created manually in Supabase Dashboard:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create bucket "employees" (Public)
-- 3. Create bucket "notes" (Public)
-- Then run this migration to set up the policies

-- Policies for employees bucket
-- Drop existing policies if they exist
drop policy if exists "Employees bucket upload policy" on storage.objects;
drop policy if exists "Employees bucket read policy" on storage.objects;
drop policy if exists "Employees bucket update policy" on storage.objects;
drop policy if exists "Employees bucket delete policy" on storage.objects;

-- Drop existing policies for notes if they exist
drop policy if exists "Notes bucket upload policy" on storage.objects;
drop policy if exists "Notes bucket read policy" on storage.objects;
drop policy if exists "Notes bucket update policy" on storage.objects;
drop policy if exists "Notes bucket delete policy" on storage.objects;

-- Policies for employees bucket
-- Allow authenticated users to upload files
create policy "Employees bucket upload policy"
on storage.objects for insert
with check (
  bucket_id = 'employees' and
  auth.role() = 'authenticated'
);

-- Allow authenticated users to read files
create policy "Employees bucket read policy"
on storage.objects for select
using (
  bucket_id = 'employees' and
  auth.role() = 'authenticated'
);

-- Allow authenticated users to update their own files
create policy "Employees bucket update policy"
on storage.objects for update
using (
  bucket_id = 'employees' and
  auth.role() = 'authenticated'
)
with check (
  bucket_id = 'employees' and
  auth.role() = 'authenticated'
);

-- Allow authenticated users to delete their own files
create policy "Employees bucket delete policy"
on storage.objects for delete
using (
  bucket_id = 'employees' and
  auth.role() = 'authenticated'
);

-- Policies for notes bucket
-- Allow authenticated users to upload files
create policy "Notes bucket upload policy"
on storage.objects for insert
with check (
  bucket_id = 'notes' and
  auth.role() = 'authenticated'
);

-- Allow authenticated users to read files
create policy "Notes bucket read policy"
on storage.objects for select
using (
  bucket_id = 'notes' and
  auth.role() = 'authenticated'
);

-- Allow authenticated users to update their own files
create policy "Notes bucket update policy"
on storage.objects for update
using (
  bucket_id = 'notes' and
  auth.role() = 'authenticated'
)
with check (
  bucket_id = 'notes' and
  auth.role() = 'authenticated'
);

-- Allow authenticated users to delete their own files
create policy "Notes bucket delete policy"
on storage.objects for delete
using (
  bucket_id = 'notes' and
  auth.role() = 'authenticated'
);
