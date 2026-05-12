-- Pro Rechnung steuerbar, ob Bau-Kundenguthaben automatisch angerechnet wird
alter table public.invoices
  add column if not exists apply_bau_credit boolean not null default true;

comment on column public.invoices.apply_bau_credit is
  'Wenn true und Rechnung=BAU + Kunde=BAU: Guthaben wird automatisch bis zur Rechnungssumme angerechnet. Wenn false: keine Anrechnung (normale Zahlung).';

