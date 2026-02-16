-- Add offer_type column to offers table
alter table public.offers
add column offer_type text default 'it'
  check (offer_type in ('it', 'bau'));

-- Update existing offers to 'it' type
update public.offers set offer_type = 'it' where offer_type is null;

-- Make hours and hourly_rate nullable for BAU offers
alter table public.offer_items
alter column hours drop not null;

alter table public.offer_items
alter column hourly_rate drop not null;
