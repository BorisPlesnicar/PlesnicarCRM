-- Text oberhalb der Leistungen (z.B. bei BAU-Rechnungen)
alter table public.invoices
  add column if not exists intro_text text;
