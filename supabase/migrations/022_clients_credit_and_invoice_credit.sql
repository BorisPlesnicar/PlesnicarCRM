-- Bau-Kunden: Guthaben (wird bei BAU-Rechnungen automatisch angerechnet)
alter table public.clients
  add column if not exists client_type text not null default 'it'
    check (client_type in ('it', 'bau')),
  add column if not exists credit_balance numeric(12, 2) not null default 0;

comment on column public.clients.client_type is 'it = Standardkunde, bau = Bau-Kunde mit Guthaben-Funktion';
comment on column public.clients.credit_balance is 'Verfügbares Guthaben in EUR (nur für client_type = bau relevant)';

update public.clients set credit_balance = 0 where credit_balance is null;

-- Auf Rechnung gespeichertes, vom Kundenguthaben abgezogenes Betrags
alter table public.invoices
  add column if not exists credit_applied_amount numeric(12, 2) not null default 0;

comment on column public.invoices.credit_applied_amount is 'Betrag in EUR, der bei Speichern vom clients.credit_balance abgezogen wurde (BAU-Kunde + BAU-Rechnung).';
