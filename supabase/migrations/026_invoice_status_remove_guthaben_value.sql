-- Falls zuvor Status 'guthaben' genutzt wurde: zurück auf Entwurf, Check wieder ohne guthaben
update public.invoices set status = 'draft' where status = 'guthaben';

do $$
declare
  cname text;
begin
  select con.conname into cname
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'invoices'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) like '%status%';
  if cname is not null then
    execute format('alter table public.invoices drop constraint %I', cname);
  end if;
end $$;

alter table public.invoices
  add constraint invoices_status_check
  check (status in ('draft', 'sent', 'paid', 'overdue', 'cancelled'));
