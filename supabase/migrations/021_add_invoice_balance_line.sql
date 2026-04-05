-- Guthaben-Hinweiszeile auf der Rechnungs-PDF (manueller Betrag)
alter table public.invoices
  add column if not exists show_balance_line boolean not null default false,
  add column if not exists balance_line_amount numeric(12, 2);

comment on column public.invoices.show_balance_line is 'Zeile „Ihr restliches Guthaben beträgt …“ in der PDF anzeigen.';
comment on column public.invoices.balance_line_amount is 'Manuell eingegebener Betrag für die Guthaben-Zeile (EUR).';
