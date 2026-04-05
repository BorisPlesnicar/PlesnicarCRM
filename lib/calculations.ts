export interface OfferCalculation {
  sum_positions: number;
  after_global_discount: number;
  global_discount_eur: number;
  after_express: number;
  express_surcharge_eur: number;
  hosting_total: number;
  maintenance_total: number;
  subtotal_before_vat: number;
  vat_amount: number;
  total: number;
  total_hours: number;
  effective_eur_per_hour: number;
}

export interface PositionInput {
  hours?: number;
  hourly_rate?: number;
  discount_percent: number;
  net_total?: number; // For BAU items with direct price
}

export function calculateOffer(
  items: PositionInput[],
  globalDiscountPercent: number,
  expressEnabled: boolean,
  expressSurchargePercent: number,
  hostingSetupEnabled: boolean,
  hostingSetupFee: number,
  maintenanceEnabled: boolean,
  maintenanceMonths: number,
  maintenanceMonthlyFee: number,
  vatPercent: number
): OfferCalculation {
  // Sum of position net totals
  const sum_positions = items.reduce((sum, item) => {
    // If net_total is provided (BAU), use it directly without applying discount again
    // The net_total for BAU items is already the final price
    if (item.net_total !== undefined) {
      return sum + item.net_total;
    }
    // Otherwise calculate from hours/rate (IT) and apply discount
    const hours = item.hours || 0;
    const rate = item.hourly_rate || 0;
    const net = hours * rate * (1 - item.discount_percent / 100);
    return sum + net;
  }, 0);

  // Global discount
  const global_discount_eur = sum_positions * (globalDiscountPercent / 100);
  const after_global_discount = sum_positions - global_discount_eur;

  // Express surcharge
  const express_surcharge_eur = expressEnabled
    ? after_global_discount * (expressSurchargePercent / 100)
    : 0;
  const after_express = after_global_discount + express_surcharge_eur;

  // Extras
  const hosting_total = hostingSetupEnabled ? hostingSetupFee : 0;
  const maintenance_total = maintenanceEnabled
    ? maintenanceMonths * maintenanceMonthlyFee
    : 0;

  // Subtotal
  const subtotal_before_vat = after_express + hosting_total + maintenance_total;

  // VAT
  const vat_amount = subtotal_before_vat * (vatPercent / 100);
  const total = subtotal_before_vat + vat_amount;

  // Hours (only for IT items)
  const total_hours = items.reduce(
    (sum, item) => sum + (item.hours || 0),
    0
  );
  const effective_eur_per_hour = total_hours > 0 ? total / total_hours : 0;

  return {
    sum_positions,
    after_global_discount,
    global_discount_eur,
    after_express,
    express_surcharge_eur,
    hosting_total,
    maintenance_total,
    subtotal_before_vat,
    vat_amount,
    total,
    total_hours,
    effective_eur_per_hour,
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Parses form input like "1.234,56" or "1234.5" into a number. */
export function parseGermanAmount(input: string): number | null {
  const s = input.trim().replace(/\s/g, "");
  if (!s) return null;
  if (s.includes(",") && s.includes(".")) {
    const normalized = s.replace(/\./g, "").replace(",", ".");
    const n = parseFloat(normalized);
    return Number.isFinite(n) ? n : null;
  }
  const normalized = s.replace(",", ".");
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Guthaben-Anrechnung nur bei BAU-Rechnung und Bau-Kunde. */
export function computeBauCreditApplied(
  invoiceType: "it" | "bau",
  clientType: "it" | "bau" | undefined,
  clientCreditBalance: number,
  invoiceTotal: number,
  previousAppliedOnThisInvoice = 0
): number {
  if (invoiceType !== "bau" || clientType !== "bau") return 0;
  const avail = Math.max(0, Number(clientCreditBalance) + Number(previousAppliedOnThisInvoice));
  const total = Math.max(0, Number(invoiceTotal));
  return Math.min(avail, total);
}

export function amountDueAfterCredit(
  totalAmount: number,
  creditApplied: number
): number {
  return Math.max(0, Math.round((Number(totalAmount) - Number(creditApplied)) * 100) / 100);
}

/**
 * Restliches Kundenguthaben nach Abzug der auf dieser Rechnung angewandten Guthaben-Anrechnung
 * (für PDF-Zeile „Ihr restliches Guthaben beträgt …“ bei BAU + Bau-Kunde).
 * Bei Bearbeitung: DB-Guthaben enthält bereits den Abzug der gespeicherten Rechnung → vorherigen Abzug addieren.
 */
export function balanceLineAmountAfterBauCredit(params: {
  clientCreditBalance: number;
  creditAppliedOnInvoice: number;
  creditPreviouslyAppliedOnSameInvoice: number;
}): number {
  const c = Number(params.clientCreditBalance);
  const applied = Number(params.creditAppliedOnInvoice);
  const prev = Number(params.creditPreviouslyAppliedOnSameInvoice);
  return Math.max(0, Math.round((c + prev - applied) * 100) / 100);
}
