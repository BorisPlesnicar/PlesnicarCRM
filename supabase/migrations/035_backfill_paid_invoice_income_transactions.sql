-- Bestehende bezahlte Rechnungen nachträglich als Bank-Einnahmen sicherstellen.
-- Idempotent: nur einfügen, wenn es noch keine income-Transaktion mit invoice_id gibt.

insert into public.transactions (
  user_id,
  type,
  amount,
  description,
  category,
  date,
  notes,
  affects_bank_balance,
  invoice_id
)
select
  i.user_id,
  'income',
  coalesce(i.total_amount, 0),
  'Rechnung ' || i.invoice_number,
  'Rechnung',
  coalesce(i.invoice_date, current_date),
  'Backfill: bezahlte Rechnung ' || i.invoice_number || ' nachträglich als Bank-Einnahme erfasst.',
  true,
  i.id
from public.invoices i
where i.status = 'paid'
  and coalesce(i.total_amount, 0) > 0
  and not exists (
    select 1 from public.transactions t
    where t.invoice_id = i.id and t.type = 'income'
  );

-- Doppelte legacy-Einträge ohne invoice_id (description = 'Rechnung <nr>') aufräumen,
-- wenn es schon eine verknüpfte Auto-Buchung gibt.
delete from public.transactions t
using public.invoices i
where t.invoice_id is null
  and t.type = 'income'
  and t.description = 'Rechnung ' || i.invoice_number
  and exists (
    select 1 from public.transactions t2
    where t2.invoice_id = i.id and t2.type = 'income'
  );
