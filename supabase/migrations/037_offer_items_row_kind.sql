-- Angebote: freier Abschnittstext zwischen Positionen – identisch zu invoice_items.row_kind.
alter table public.offer_items
  add column if not exists row_kind text not null default 'position'
    check (row_kind in ('position', 'text_block'));

comment on column public.offer_items.row_kind is 'position = normale Zeile; text_block = freier Text/Abschnitt in der PDF zwischen Positionen.';

update public.offer_items set row_kind = 'position' where row_kind is null;
