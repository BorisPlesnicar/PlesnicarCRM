-- Wenn Rechnung vollständig per Kundenguthaben bezahlt wurde, soll sie trotzdem in Transaktionen sichtbar sein
-- (aber NICHT den Bank-Saldo beeinflussen).

create or replace function public.sync_invoice_income_transaction()
returns trigger
language plpgsql
as $$
declare
  v_desc text;
  v_total numeric;
  v_credit numeric;
  v_cash numeric;
  v_apply_credit boolean;
begin
  v_desc := 'Rechnung ' || new.invoice_number;
  v_total := coalesce(new.total_amount, 0);
  v_apply_credit := coalesce(new.apply_bau_credit, false);
  v_credit := case when v_apply_credit then coalesce(new.credit_applied_amount, 0) else 0 end;
  v_cash := greatest(0, round((v_total - v_credit) * 100) / 100);

  -- Cleanup: alte Verrechnungs-/Guthaben-Transaktionen (ohne Bank) zur Rechnung entfernen
  delete from public.transactions
   where type = 'income'
     and category = 'Kundenguthaben (ohne Bank)'
     and description ilike (v_desc || '%');

  if new.status = 'paid' then
    -- Vollständig per Guthaben verrechnet: trotzdem eine sichtbare "Rechnung"-Buchung, aber ohne Bankabgleich.
    if v_apply_credit and v_cash <= 0 and v_total > 0 then
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
        'Automatisch erstellt: Rechnung vollständig per Kundenguthaben verrechnet (keine Bankbewegung).',
        false,
        new.id
      )
      on conflict (invoice_id, type) where invoice_id is not null
      do update set
        amount = excluded.amount,
        description = excluded.description,
        category = excluded.category,
        date = excluded.date,
        notes = excluded.notes,
        affects_bank_balance = false;

      delete from public.transactions where invoice_id is null and type = 'income' and description = v_desc;
      return new;
    end if;

    -- Normalfall: echter Bank-Geldeingang (nach Guthaben)
    if v_cash > 0 then
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
      on conflict (invoice_id, type) where invoice_id is not null
      do update set
        amount = excluded.amount,
        description = excluded.description,
        category = excluded.category,
        date = excluded.date,
        notes = excluded.notes,
        affects_bank_balance = true;

      delete from public.transactions where invoice_id is null and type = 'income' and description = v_desc;
      return new;
    end if;

    -- Sicherheitsnetz: wenn weder Guthaben- noch Bank-Variante greift, löschen
    delete from public.transactions where invoice_id = new.id and type = 'income';
    delete from public.transactions where invoice_id is null and type = 'income' and description = v_desc;
  else
    -- nicht bezahlt → Auto-Buchung entfernen
    delete from public.transactions where invoice_id = new.id and type = 'income';
    delete from public.transactions where invoice_id is null and type = 'income' and description = v_desc;
  end if;

  return new;
end;
$$;

