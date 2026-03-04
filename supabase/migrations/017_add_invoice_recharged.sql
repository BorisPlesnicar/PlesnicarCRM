-- Weiterverrechnet: Diese Rechnung wurde auf eine andere Rechnung weiterverrechnet
alter table public.invoices
  add column if not exists recharged_to_invoice_id uuid references public.invoices(id) on delete set null,
  add column if not exists recharged_at timestamptz,
  add column if not exists recharged_note text;

create index if not exists invoices_recharged_to_invoice_id_idx on public.invoices(recharged_to_invoice_id);
