-- Freitext für "auf welche Rechnung weiterverrechnet" (Eingabefeld statt Auswahl)
alter table public.invoices
  add column if not exists recharged_to_invoice_ref text;
