-- Buchhaltungs-Logik vereinheitlicht:
-- Bezahlte Rechnung -> IMMER eine normale Bank-Einnahme über den VOLLEN Rechnungsbetrag.
-- Kundenguthaben wird unabhängig davon vom Kundenkonto reduziert (clients.credit_balance).

create or replace function public.sync_invoice_income_transaction()
returns trigger
language plpgsql
as $$
declare
  v_desc text;
  v_total numeric;
begin
  v_desc := 'Rechnung ' || new.invoice_number;
  v_total := coalesce(new.total_amount, 0);

  -- Cleanup: alte Verrechnungs-/Guthaben-Transaktionen (ohne Bank) zur Rechnung entfernen
  delete from public.transactions
   where type = 'income'
     and category = 'Kundenguthaben (ohne Bank)'
     and description ilike (v_desc || '%');

  if new.status = 'paid' then
    if v_total <= 0 then
      delete from public.transactions where invoice_id = new.id and type = 'income';
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
      v_total,
      v_desc,
      'Rechnung',
      coalesce(new.invoice_date, current_date),
      'Automatisch erstellt bei Bezahlung der Rechnung ' || new.invoice_number || '.',
      true,
      new.id
    )
    on conflict (invoice_id, type) where invoice_id is not null
    do update set
      amount = excluded.amount,
      description = excluded.description,
      category = excluded.category,
      date = excluded.date,
      notes = excluded.notes,
      affects_bank_balance = true;

    delete from public.transactions where invoice_id is null and type = 'income' and description = v_desc;
  else
    delete from public.transactions where invoice_id = new.id and type = 'income';
    delete from public.transactions where invoice_id is null and type = 'income' and description = v_desc;
  end if;

  return new;
end;
$$;
