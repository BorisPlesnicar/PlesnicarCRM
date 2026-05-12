import type { SupabaseClient } from "@supabase/supabase-js";

const CREDIT_CATEGORY = "Kundenguthaben (ohne Bank)";

/** Anzeige-/Löschschlüssel wie bisher: „Rechnung BP-2248-07“ */
export function invoiceIncomeDescription(invoiceNumber: string): string {
  return `Rechnung ${invoiceNumber.trim()}`;
}

/** Heutiges Kalenderdatum im lokalen Browser (kein UTC-Vortag). */
export function localDateYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type InvoiceIncomeSyncSource = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: number | string | null | undefined;
  credit_applied_amount?: number | string | null | undefined;
  apply_bau_credit?: boolean | null | undefined;
  status: string;
};

/**
 * Buchhaltungslogik (vereinheitlicht):
 * - Bezahlte Rechnung => IMMER eine ganz normale Bank-Einnahme über den vollen Rechnungsbetrag
 *   (Beschreibung "Rechnung {Nummer}", Kategorie "Rechnung", affects_bank_balance = true).
 * - Kundenguthaben wird unabhängig davon vom Kundenkonto reduziert (clients.credit_balance) –
 *   das passiert in der jeweiligen Rechnungs-Save-Logik, nicht hier.
 * - Nicht bezahlt => Auto-Einnahme entfernen.
 */
export async function syncInvoiceIncomeTransaction(
  client: SupabaseClient,
  invoice: InvoiceIncomeSyncSource,
  options?: { bookingDate?: string }
): Promise<{ ok: boolean; errorMessage?: string }> {
  const desc = invoiceIncomeDescription(invoice.invoice_number);

  const { error: delLinkedErr } = await client
    .from("transactions")
    .delete()
    .eq("invoice_id", invoice.id)
    .eq("type", "income");
  if (delLinkedErr) {
    return { ok: false, errorMessage: delLinkedErr.message };
  }

  // Cleanup: alte „Verrechnung"/Guthaben-Buchungen, die zur Rechnung gehören
  const { error: delCreditErr } = await client
    .from("transactions")
    .delete()
    .eq("type", "income")
    .eq("category", CREDIT_CATEGORY)
    .ilike("description", `${desc}%`);
  if (delCreditErr) {
    return { ok: false, errorMessage: delCreditErr.message };
  }

  const { error: legacyErr } = await client
    .from("transactions")
    .delete()
    .eq("description", desc)
    .eq("type", "income")
    .is("invoice_id", null);
  if (legacyErr) {
    return { ok: false, errorMessage: legacyErr.message };
  }

  if (invoice.status !== "paid") {
    return { ok: true };
  }

  const total = Math.round(Number(invoice.total_amount ?? 0) * 100) / 100;
  if (total <= 0) {
    return { ok: true };
  }

  const bookedDate =
    options?.bookingDate && /^\d{4}-\d{2}-\d{2}$/.test(options.bookingDate)
      ? options.bookingDate
      : invoice.invoice_date?.slice(0, 10) || localDateYmd();

  const { error: insErr } = await client.from("transactions").insert({
    type: "income",
    amount: total,
    description: desc,
    category: "Rechnung",
    date: bookedDate,
    notes: `Automatisch erstellt bei Bezahlung der Rechnung ${invoice.invoice_number}.`,
    affects_bank_balance: true,
    invoice_id: invoice.id,
  });

  if (insErr) {
    return { ok: false, errorMessage: insErr.message };
  }
  return { ok: true };
}
