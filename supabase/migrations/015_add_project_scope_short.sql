-- Add separate short project scope for point 1
alter table public.offers
  add column if not exists project_scope_short text;

