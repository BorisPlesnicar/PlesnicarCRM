-- Add project scope text and optional images to offers
alter table public.offers
  add column if not exists project_scope text,
  add column if not exists project_scope_images text[];

