-- Zukunftssicher: Bezahlte Rechnung erzeugt/updated die Bank-Einnahme automatisch in DB

-- 1) Eindeutigkeit: pro Rechnung genau eine Auto-Einnahme
create unique index if not exists transactions_unique_invoice_income_idx
  on public.transactions(invoice_id)
  where invoice_id is not null and type = 'income';

create or replace function public.sync_invoice_income_transaction()
returns trigger
language plpgsql
as $$
declare
  v_desc text;
  v_total numeric;
  v_credit numeric;
  v_cash numeric;
begin
  v_desc := 'Rechnung ' || new.invoice_number;
  v_total := coalesce(new.total_amount, 0);
  v_credit := case when coalesce(new.apply_bau_credit, false) then coalesce(new.credit_applied_amount, 0) else 0 end;
  v_cash := greatest(0, round((v_total - v_credit) * 100) / 100);

  -- Cleanup: alte Verrechnungs-/Guthaben-Transaktionen (ohne Bank) zur Rechnung entfernen
  delete from public.transactions
   where type = 'income'
     and category = 'Kundenguthaben (ohne Bank)'
     and description ilike (v_desc || '%');

  if new.status = 'paid' then
    -- Wenn kein echter Geldeingang (voll per Guthaben), dann keine Bank-Einnahme
    if v_cash <= 0 then
      delete from public.transactions where invoice_id = new.id and type = 'income';
      -- auch legacy ohne invoice_id entfernen
      delete from public.transactions where invoice_id is null and type = 'income' and description = v_desc;
      return new;
    end if;

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
    ) values (
      new.user_id,
      'income',
      v_cash,
      v_desc,
      'Rechnung',
      coalesce(new.invoice_date, current_date),
      'Automatisch erstellt bei Bezahlung der Rechnung ' || new.invoice_number || '.',
      true,
      new.id
    )
    on conflict (invoice_id) where type = 'income'
    do update set
      amount = excluded.amount,
      description = excluded.description,
      category = excluded.category,
      date = excluded.date,
      notes = excluded.notes,
      affects_bank_balance = true;

    -- legacy doppelte Einträge ohne invoice_id entfernen
    delete from public.transactions where invoice_id is null and type = 'income' and description = v_desc;
  else
    -- nicht bezahlt → Auto-Einnahme entfernen
    delete from public.transactions where invoice_id = new.id and type = 'income';
    delete from public.transactions where invoice_id is null and type = 'income' and description = v_desc;
  end if;

  return new;
end;
$$;

drop trigger if exists on_invoices_sync_income_transaction on public.invoices;

create trigger on_invoices_sync_income_transaction
after insert or update of status, total_amount, credit_applied_amount, apply_bau_credit, invoice_number, invoice_date
on public.invoices
for each row
execute function public.sync_invoice_income_transaction();

