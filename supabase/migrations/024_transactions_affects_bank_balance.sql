-- Buchungen, die keinen Bankkontostand abbilden (z. B. Kundenguthaben-Verrechnung)
alter table public.transactions
  add column if not exists affects_bank_balance boolean not null default true;

comment on column public.transactions.affects_bank_balance is
  'false = nur Verrechnung/Guthaben, fließt nicht in den Bank-Saldo der App ein';
