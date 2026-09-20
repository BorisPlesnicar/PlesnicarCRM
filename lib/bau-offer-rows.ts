import {
  bauLineTotal,
  defaultBauPositionRow,
  nextRowId,
  type BauFormRow,
  bauRowsToCalcLineItems,
} from "@/lib/bau-invoice-rows";
import type { OfferItem } from "@/lib/types";

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

/**
 * Angebots-Positionen → Formularzeilen, identisch zur Rechnung.
 * IT-Altbestand nutzt hours/hourly_rate als Menge/Einheitspreis (Einheit „Std.“).
 */
export function offerItemsToFormRows(
  items: OfferItem[],
  offerType: "it" | "bau"
): BauFormRow[] {
  const fallbackUnit = offerType === "bau" ? "Stk" : "Std.";
  if (!items?.length) return [defaultBauPositionRow(nextRowId(), fallbackUnit)];

  return items.map((it, idx) => {
    const id = (it.id as string | undefined) ?? `row-${idx}-${it.position}`;
    const d = Math.max(0, Math.min(100, Number(it.discount_percent ?? 0)));
    const net = Number(it.net_total ?? 0);

    if (it.row_kind === "text_block") {
      return { id, kind: "text_block" as const, text: it.service_name ?? "" };
    }

    if (hasStoredBauDimensions(it)) {
      return {
        id,
        kind: "position" as const,
        description: it.service_name ?? "",
        quantity: Number(it.quantity),
        unit: (it.unit as string) || fallbackUnit,
        price: Number(it.unit_price),
        discount_percent: d,
      };
    }

    if (offerType === "it") {
      return {
        id,
        kind: "position" as const,
        description: it.service_name ?? "",
        quantity: Number(it.hours ?? 0),
        unit: (it.unit as string) || fallbackUnit,
        price: Number(it.hourly_rate ?? 0),
        discount_percent: d,
      };
    }

    const legacyUnit = d >= 100 ? net : net === 0 ? 0 : net / (1 - d / 100);
    return {
      id,
      kind: "position" as const,
      description: it.service_name ?? "",
      quantity: 1,
      unit: fallbackUnit,
      price: legacyUnit,
      discount_percent: d,
    };
  });
}

export interface OfferItemInsert {
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
  row_kind: "position" | "text_block";
}

/**
 * Insert-Payload für offer_items – identische Struktur wie invoice_items.
 * IT spiegelt Menge/Einheitspreis zusätzlich auf hours/hourly_rate (Stunden-KPIs).
 */
export function buildOfferItemInserts(
  offerId: string,
  rows: BauFormRow[],
  offerType: "it" | "bau"
): OfferItemInsert[] {
  const fallbackUnit = offerType === "bau" ? "Stk" : "Std.";
  const out: OfferItemInsert[] = [];
  let pos = 0;

  for (const row of rows) {
    if (row.kind === "text_block") {
      const text = row.text.trim();
      if (!text) continue;
      pos += 1;
      out.push({
        offer_id: offerId,
        position: pos,
        service_name: text,
        hours: 0,
        hourly_rate: 0,
        discount_percent: 0,
        net_total: 0,
        quantity: 0,
        unit: "",
        unit_price: 0,
        row_kind: "text_block",
      });
      continue;
    }

    const q = row.quantity ?? 1;
    const p = row.price ?? 0;
    const disc = row.discount_percent ?? 0;
    if (!row.description.trim() || bauLineTotal(q, p, disc) <= 0) continue;
    pos += 1;
    out.push({
      offer_id: offerId,
      position: pos,
      service_name: row.description.trim(),
      hours: offerType === "it" ? q : 0,
      hourly_rate: offerType === "it" ? p : 0,
      discount_percent: disc,
      net_total: bauLineTotal(q, p, disc),
      quantity: q,
      unit: row.unit || fallbackUnit,
      unit_price: p,
      row_kind: "position",
    });
  }
  return out;
}

/** Mindestens eine verrechenbare Position vorhanden. */
export function offerRowsHaveBillablePosition(rows: BauFormRow[]): boolean {
  return rows.some(
    (row) =>
      row.kind === "position" &&
      row.description.trim() !== "" &&
      bauLineTotal(row.quantity ?? 1, row.price ?? 0, row.discount_percent ?? 0) > 0
  );
}

type MinimalSupabase = {
  from: (table: string) => {
    insert: (rows: unknown[]) => Promise<{ error: { message: string; code?: string } | null }>;
  };
};

/**
 * Schreibt offer_items. Fällt zurück auf ein Insert ohne `row_kind`, solange die
 * Migration 037 (offer_items.row_kind) noch nicht eingespielt ist – Abschnittstexte
 * werden dann übersprungen, Positionen bleiben unverändert.
 */
export async function insertOfferItems(
  supabase: MinimalSupabase,
  rows: OfferItemInsert[]
): Promise<{ error: { message: string } | null; textBlocksSkipped: boolean }> {
  if (rows.length === 0) return { error: null, textBlocksSkipped: false };

  const { error } = await supabase.from("offer_items").insert(rows);
  if (!error) return { error: null, textBlocksSkipped: false };

  const missingColumn =
    error.code === "PGRST204" ||
    error.code === "42703" ||
    /row_kind/i.test(error.message || "");
  if (!missingColumn) return { error, textBlocksSkipped: false };

  const hadTextBlocks = rows.some((r) => r.row_kind === "text_block");
  const legacyRows = rows
    .filter((r) => r.row_kind === "position")
    .map((r, idx) => {
      const legacy: Partial<OfferItemInsert> = { ...r, position: idx + 1 };
      delete legacy.row_kind;
      return legacy;
    });

  const retry = await supabase.from("offer_items").insert(legacyRows);
  return { error: retry.error, textBlocksSkipped: hadTextBlocks };
}

/**
 * Summenzeilen für calculateOffer (net_total pro Zeile).
 * `hours` wird mitgegeben, damit die IT-Kennzahlen (Gesamtstunden, €/Std.) stimmen;
 * die Summenbildung nutzt weiterhin net_total.
 */
export function bauFormRowsToOfferCalcLineItems(rows: BauFormRow[]) {
  return bauRowsToCalcLineItems(rows).map((inv, idx) => ({
    position: idx + 1,
    service_name: inv.description,
    discount_percent: inv.discount_percent,
    net_total: inv.total,
    hours: inv.quantity,
  }));
}