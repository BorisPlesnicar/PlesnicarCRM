-- Einnahmen aus Rechtungen der Rechnung zuordnen (zuverlässige Sync-/Löschlogik)
alter table public.transactions
  add column if not exists invoice_id uuid references public.invoices(id) on delete set null;

create index if not exists transactions_invoice_id_idx on public.transactions(invoice_id);

comment on column public.transactions.invoice_id is
  'Bei automatischer Einnahme aus Rechnungszahlung: FK zur Rechnung; ermöglicht Upsert statt Dubletten per Beschreibung.';

-- Bestehende Einnahmen anhand „Rechnung {Nummer}“ verknüpfen
update public.transactions t
set invoice_id = i.id
from public.invoices i
where t.invoice_id is null
  and t.type = 'income'
  and t.description = 'Rechnung ' || i.invoice_number;
