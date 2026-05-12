-- Transactions optional einem Kunden zuordnen.
-- Brauchen wir, um Bank-Anzahlungen vom CRM-Guthaben gegenzurechnen
-- (sonst würde der "Kundenguthaben im Saldo"-Toggle doppelt zählen).

alter table public.transactions
  add column if not exists client_id uuid references public.clients(id) on delete set null;

create index if not exists transactions_client_id_idx on public.transactions(client_id);

comment on column public.transactions.client_id is
  'Optionaler FK zum Kunden. Wird gesetzt z. B. bei Anzahlungs-Einnahmen, damit doppeltes Zählen mit credit_balance vermieden werden kann.';

-- Backfill: bestehende Anzahlungs-Einnahmen über die Beschreibung an Kunden hängen.
-- Format der Beschreibung: "Anzahlung – {client.name}" (en-dash).
update public.transactions t
set client_id = c.id
from public.clients c
where t.client_id is null
  and t.category = 'Anzahlung'
  and (
    t.description = 'Anzahlung – ' || c.name
    or t.description ilike 'Anzahlung – ' || c.name || '%'
  );
