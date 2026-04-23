import {
  bauLineTotal,
  defaultBauPositionRow,
  type BauFormRow,
  bauRowsToCalcLineItems,
} from "@/lib/bau-invoice-rows";
import type { InvoiceItem, OfferItem } from "@/lib/types";

export { defaultBauPositionRow } from "@/lib/bau-invoice-rows";
export type { BauFormRow } from "@/lib/bau-invoice-rows";

function hasStoredBauDimensions(item: OfferItem): boolean {
  return (
    item.unit_price !== undefined &&
    item.unit_price !== null &&
    !Number.isNaN(Number(item.unit_price)) &&
    item.quantity !== undefined &&
    item.quantity !== null &&
    !Number.isNaN(Number(item.quantity))
  );
}

/** Angebots-Positionen (BAU) → gleiche Formularstruktur wie Rechnung BAU. */
export function offerItemsToBauFormRows(items: OfferItem[]): BauFormRow[] {
  if (!items?.length) return [defaultBauPositionRow("1")];
  return items.map((it, idx) => {
    const id = (it.id as string | undefined) ?? `row-${idx}-${it.position}`;
    const d = Math.max(0, Math.min(100, Number(it.discount_percent ?? 0)));
    const net = Number(it.net_total ?? 0);

    if (hasStoredBauDimensions(it)) {
      return {
        id,
        kind: "position" as const,
        description: it.service_name ?? "",
        quantity: Number(it.quantity),
        unit: (it.unit as string) || "Stk",
        price: Number(it.unit_price),
        discount_percent: d,
      };
    }

    const legacyUnit = d >= 100 ? net : net === 0 ? 0 : net / (1 - d / 100);
    return {
      id,
      kind: "position" as const,
      description: it.service_name ?? "",
      quantity: 1,
      unit: "Stk",
      price: legacyUnit,
      discount_percent: d,
    };
  });
}

/** Insert-Payload für offer_items (nur Leistungszeilen). */
export function buildBauOfferItemInserts(
  offerId: string,
  rows: BauFormRow[]
): Array<{
  offer_id: string;
  position: number;
  service_name: string;
  hours: number;
  hourly_rate: number;
  discount_percent: number;
  net_total: number;
  quantity: number;
  unit: string;
  unit_price: number;
}> {
  const out: Array<{
    offer_id: string;
    position: number;
    service_name: string;
    hours: number;
    hourly_rate: number;
    discount_percent: number;
    net_total: number;
    quantity: number;
    unit: string;
    unit_price: number;
  }> = [];
  let pos = 0;
  for (const row of rows) {
    if (row.kind !== "position") continue;
    const q = row.quantity ?? 1;
    const p = row.price ?? 0;
    const disc = row.discount_percent ?? 0;
    if (!row.description.trim() || q * p * (1 - disc / 100) <= 0) continue;
    pos += 1;
    out.push({
      offer_id: offerId,
      position: pos,
      service_name: row.description.trim(),
      hours: 0,
      hourly_rate: 0,
      discount_percent: disc,
      net_total: bauLineTotal(q, p, disc),
      quantity: q,
      unit: row.unit || "Stk",
      unit_price: p,
    });
  }
  return out;
}

/** Summenzeilen für calculateOffer (net_total pro Zeile). */
export function bauFormRowsToOfferCalcLineItems(rows: BauFormRow[]) {
  return bauRowsToCalcLineItems(rows).map((inv, idx) => ({
    position: idx + 1,
    service_name: inv.description,
    discount_percent: inv.discount_percent,
    net_total: inv.total,
  }));
}

/** IT-Angebot → Rechnungs-Positionen (Stunden / Satz aus DB-Spiegeln). */
export function offerItemsToItInvoiceItems(items: OfferItem[], vatPercent: number): InvoiceItem[] {
  return items.map((it, idx) => {
    const h = Number(it.quantity ?? it.hours ?? 0);
    const r = Number(it.unit_price ?? it.hourly_rate ?? 0);
    const d = Number(it.discount_percent ?? 0);
    const total = Number(
      it.net_total ?? h * r * (d >= 100 ? 0 : 1 - d / 100)
    );
    return {
      position: idx + 1,
      description: it.service_name,
      quantity: h,
      unit: (it.unit as string) || "Std.",
      unit_price: r,
      vat_percent: vatPercent,
      discount_percent: d,
      total,
    };
  });
}
