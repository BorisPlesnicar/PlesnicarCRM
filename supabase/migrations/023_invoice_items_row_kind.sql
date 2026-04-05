-- BAU: Abschnittstext / Zwischenüberschrift zwischen Positionen (wie Einleitung über der Tabelle)
alter table public.invoice_items
  add column if not exists row_kind text not null default 'position'
    check (row_kind in ('position', 'text_block'));

comment on column public.invoice_items.row_kind is 'position = normale Zeile; text_block = freier Text/Abschnitt in der PDF zwischen Positionen (nur BAU).';

update public.invoice_items set row_kind = 'position' where row_kind is null;
