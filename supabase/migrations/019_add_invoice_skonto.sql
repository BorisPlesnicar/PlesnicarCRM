-- Skonto: Zahlungsziel mit Skonto (Tage + %) – optional
alter table public.invoices
  add column if not exists skonto_days int,
  add column if not exists skonto_percent numeric(5, 2);

comment on column public.invoices.skonto_days is 'Tage für Skonto-Rabatt (z.B. 10). Leer = kein Skonto.';
comment on column public.invoices.skonto_percent is 'Skonto in % (z.B. 3). Leer = kein Skonto.';
