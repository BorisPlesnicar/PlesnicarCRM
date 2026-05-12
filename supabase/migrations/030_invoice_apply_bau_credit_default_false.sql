-- Korrektes Standardverhalten: Guthaben NICHT automatisch anrechnen
alter table public.invoices
  alter column apply_bau_credit set default false;

