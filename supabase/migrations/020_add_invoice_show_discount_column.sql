-- Rabattspalte im PDF ein-/ausblendbar (z.B. 0 % wirkt auf Kunden komisch)
alter table public.invoices
  add column if not exists show_discount_column boolean not null default true;

comment on column public.invoices.show_discount_column is 'Wenn true, wird die Rabatt-Spalte in der Rechnungs-PDF angezeigt; wenn false, ausgeblendet.';
