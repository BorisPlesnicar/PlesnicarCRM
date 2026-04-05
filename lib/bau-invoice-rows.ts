import type { InvoiceItem } from "@/lib/types";

export type BauFormRowPosition = {
  id: string;
  kind: "position";
  description: string;
  quantity: number;
  unit: string;
  price: number;
  discount_percent: number;
};

export type BauFormRowText = {
  id: string;
  kind: "text_block";
  text: string;
};

export type BauFormRow = BauFormRowPosition | BauFormRowText;

export function bauLineTotal(quantity: number, unitPrice: number, discountPercent: number): number {
  const d = Math.max(0, Math.min(100, Number(discountPercent) || 0));
  return quantity * unitPrice * (1 - d / 100);
}

export function defaultBauPositionRow(id: string): BauFormRowPosition {
  return {
    id,
    kind: "position",
    description: "",
    quantity: 1,
    unit: "Stk",
    price: 0,
    discount_percent: 0,
  };
}

/** Nur Leistungszeilen für Netto-/Summenberechnung. */
export function bauRowsToCalcLineItems(rows: BauFormRow[]): InvoiceItem[] {
  return rows
    .filter((r): r is BauFormRowPosition => r.kind === "position")
    .map((item, idx) => ({
      position: idx + 1,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.price,
      vat_percent: 0,
      discount_percent: item.discount_percent ?? 0,
      total: bauLineTotal(item.quantity, item.price, item.discount_percent ?? 0),
    }));
}

/** Mindestens eine gültige Leistungszeile (Beschreibung + Preis > 0). */
export function bauRowsHaveBillablePosition(rows: BauFormRow[]): boolean {
  return rows.some(
    (r) => r.kind === "position" && r.description.trim() !== "" && r.price > 0
  );
}

/** Vorschau/PDF: Reihenfolge inkl. Abschnittstexten (leere Blöcke ausgelassen). */
export function bauRowsToPreviewPdfItems(rows: BauFormRow[]): InvoiceItem[] {
  const out: InvoiceItem[] = [];
  let pos = 0;
  for (const row of rows) {
    if (row.kind === "text_block") {
      const t = row.text.trim();
      if (!t) continue;
      pos += 1;
      out.push({
        position: pos,
        description: t,
        quantity: 0,
        unit: "",
        unit_price: 0,
        vat_percent: 0,
        discount_percent: 0,
        total: 0,
        row_kind: "text_block",
      });
    } else {
      if (!row.description.trim() || row.price <= 0) continue;
      pos += 1;
      const disc = row.discount_percent ?? 0;
      out.push({
        position: pos,
        description: row.description.trim(),
        quantity: row.quantity,
        unit: row.unit,
        unit_price: row.price,
        vat_percent: 0,
        discount_percent: disc,
        total: bauLineTotal(row.quantity, row.price, disc),
        row_kind: "position",
      });
    }
  }
  return out;
}

/** DB insert payload (ohne invoice_id). */
export function buildBauInvoiceItemRows(
  rows: BauFormRow[]
): Array<{
  position: number;
  row_kind: "position" | "text_block";
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  vat_percent: number;
  discount_percent: number;
  total: number;
}> {
  const out: Array<{
    position: number;
    row_kind: "position" | "text_block";
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    vat_percent: number;
    discount_percent: number;
    total: number;
  }> = [];
  let p = 0;
  for (const row of rows) {
    if (row.kind === "text_block") {
      const t = row.text.trim();
      if (!t) continue;
      p += 1;
      out.push({
        position: p,
        row_kind: "text_block",
        description: t,
        quantity: 0,
        unit: "",
        unit_price: 0,
        vat_percent: 0,
        discount_percent: 0,
        total: 0,
      });
    } else {
      if (!row.description.trim() || row.price <= 0) continue;
      p += 1;
      const disc = row.discount_percent ?? 0;
      out.push({
        position: p,
        row_kind: "position",
        description: row.description.trim(),
        quantity: row.quantity,
        unit: row.unit,
        unit_price: row.price,
        vat_percent: 0,
        discount_percent: disc,
        total: bauLineTotal(row.quantity, row.price, disc),
      });
    }
  }
  return out;
}

export function invoiceItemsToBauFormRows(loaded: InvoiceItem[]): BauFormRow[] {
  if (loaded.length === 0) {
    return [defaultBauPositionRow("1")];
  }
  return loaded.map((it, idx) => {
    const id = it.id ?? `row-${idx}-${it.position}`;
    if (it.row_kind === "text_block") {
      return { id, kind: "text_block", text: it.description ?? "" } satisfies BauFormRowText;
    }
    return {
      id,
      kind: "position",
      description: it.description ?? "",
      quantity: it.quantity,
      unit: it.unit ?? "Stk",
      price: it.unit_price,
      discount_percent: it.discount_percent ?? 0,
    } satisfies BauFormRowPosition;
  });
}
