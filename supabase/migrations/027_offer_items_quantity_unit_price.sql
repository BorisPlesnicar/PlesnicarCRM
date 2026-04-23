-- BAU-Angebote: Menge, Einheit, Einheitspreis wie bei invoice_items (eigene Tabelle, gleiche Logik).

alter table public.offer_items
  add column if not exists quantity numeric(10, 2) not null default 1,
  add column if not exists unit text not null default 'Stk',
  add column if not exists unit_price numeric(10, 2) not null default 0;

comment on column public.offer_items.quantity is 'BAU: Stückzahl; IT: meist = Stunden (hours).';
comment on column public.offer_items.unit_price is 'BAU: Einheitspreis netto; IT: Stundensatz (hourly_rate).';

-- Alt-BAU: nur net_total gespeichert → Menge 1, Einheitspreis aus Rabatt rückgerechnet
update public.offer_items oi
set
  quantity = 1,
  unit = 'Stk',
  unit_price = case
    when coalesce(oi.discount_percent, 0) >= 100 then coalesce(oi.net_total, 0)
    else coalesce(oi.net_total, 0) / nullif(1 - (coalesce(oi.discount_percent, 0) / 100.0), 0)
  end
from public.offers o
where oi.offer_id = o.id
  and o.offer_type = 'bau';

-- IT: Stunden und Satz in die neuen Spiegeln
update public.offer_items oi
set
  quantity = coalesce(oi.hours, 0),
  unit = 'Std.',
  unit_price = coalesce(oi.hourly_rate, 0)
from public.offers o
where oi.offer_id = o.id
  and (o.offer_type is null or o.offer_type = 'it');
