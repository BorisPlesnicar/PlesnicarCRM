/**
 * PDF-Smoke-Test: rendert Rechnung (IT/BAU) und Angebot (IT/BAU) mit Alt-Daten und
 * schreibt SHA-Hashes, um Layout-Regressionen gegen den Stand vor dem Umbau zu prüfen.
 *
 * Aufruf: npx tsx scripts/pdf-smoke.tsx <out-dir>
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { InvoicePDFDocument } from "../components/invoices/invoice-pdf";
import { OfferDocument } from "../components/offers/offer-pdf";
import type { Client, Invoice, InvoiceItem, Offer, OfferItem } from "../lib/types";
import { calculateOffer } from "../lib/calculations";

const outDir = process.argv[2] ?? "/tmp/pdf-smoke";
mkdirSync(outDir, { recursive: true });

const client: Client = {
  id: "c1",
  user_id: "u1",
  name: "Muster GmbH",
  company: "Muster GmbH",
  email: "a@b.c",
  phone: "",
  address: "Musterstraße 1\n1010 Wien",
  notes: "",
  status: "customer",
  customer_number: "K-001",
  created_at: "2025-01-01",
};

const baseInvoice = {
  id: "i1",
  user_id: "u1",
  client_id: "c1",
  project_id: null,
  offer_id: null,
  invoice_number: "BP-2248-07",
  invoice_date: "2025-03-01",
  due_date: "2025-03-15",
  payment_term_days: 14,
  skonto_days: null,
  skonto_percent: null,
  show_discount_column: true,
  customer_number: "K-001",
  net_amount: 1000,
  vat_amount: 200,
  total_amount: 1200,
  vat_percent: 20,
  currency: "EUR",
  is_partial_payment: false,
  partial_payment_of_total: null,
  status: "sent",
  notes: null,
  recharged_to_invoice_id: null,
  recharged_to_invoice_ref: null,
  recharged_at: null,
  recharged_note: null,
  created_at: "2025-03-01",
  updated_at: "2025-03-01",
} satisfies Partial<Invoice> as Invoice;

/** Alt-Datenstand: IT-Rechnung ohne intro_text und ohne row_kind. */
const legacyItInvoice: Invoice = { ...baseInvoice, invoice_type: "it", intro_text: null };
const legacyItItems: InvoiceItem[] = [
  {
    position: 1,
    description: "Grafische Entwerfung einer Website",
    quantity: 2,
    unit: "Stk",
    unit_price: 400,
    vat_percent: 20,
    discount_percent: 0,
    total: 800,
  },
  {
    position: 2,
    description: "SEO Basics",
    quantity: 4,
    unit: "Std.",
    unit_price: 50,
    vat_percent: 20,
    discount_percent: 0,
    total: 200,
  },
];

/** BAU-Rechnung mit Einleitung + Abschnittstext (unveränderte Darstellung). */
const bauInvoice: Invoice = {
  ...baseInvoice,
  invoice_type: "bau",
  intro_text: "Leistungen gemäß Auftrag vom 12.02.2025.",
};
const bauItems: InvoiceItem[] = [
  { ...legacyItItems[0], row_kind: "position" },
  {
    position: 2,
    description: "Zweiter Auftrag – Dachgeschoss",
    quantity: 0,
    unit: "",
    unit_price: 0,
    vat_percent: 0,
    discount_percent: 0,
    total: 0,
    row_kind: "text_block",
  },
  { ...legacyItItems[1], position: 3, row_kind: "position" },
];

const baseOffer = {
  id: "o1",
  user_id: "u1",
  client_id: "c1",
  project_id: null,
  offer_number: "BPA-2248-05",
  date: "2025-03-01",
  valid_until: "2025-03-31",
  consultant_name: "",
  consultant_phone: "",
  hourly_rate: 55,
  global_discount_percent: 0,
  vat_percent: 20,
  express_enabled: false,
  express_surcharge_percent: 20,
  hosting_setup_enabled: false,
  hosting_setup_fee: 150,
  maintenance_enabled: false,
  maintenance_months: 12,
  maintenance_monthly_fee: 49,
  project_scope: null,
  project_scope_images: null,
  total: 1200,
  currency: "EUR",
  status: "sent",
  created_at: "2025-03-01",
} satisfies Partial<Offer> as Offer;

/** Alt-Datenstand: IT-Angebot mit hours/hourly_rate, ohne project_scope_short. */
const legacyItOffer: Offer = { ...baseOffer, offer_type: "it", project_scope_short: null };
const legacyItOfferItems: OfferItem[] = [
  {
    position: 1,
    service_name: "Beratung & Konzept",
    hours: 3,
    hourly_rate: 55,
    discount_percent: 0,
    net_total: 165,
  },
  {
    position: 2,
    service_name: "Frontend Umsetzung",
    hours: 10,
    hourly_rate: 55,
    discount_percent: 0,
    net_total: 550,
  },
];

const bauOffer: Offer = {
  ...baseOffer,
  offer_type: "bau",
  project_scope_short: "Sanierung Bauvorhaben Langenlois.",
};
/** Alt-Datenstand BAU-Angebot: nur Positionen (row_kind existierte noch nicht). */
const bauOfferLegacyItems: OfferItem[] = [
  {
    position: 1,
    service_name: "Vollwärmeschutz",
    discount_percent: 0,
    net_total: 800,
    quantity: 40,
    unit: "m²",
    unit_price: 20,
  },
  {
    position: 2,
    service_name: "Fassadenanstrich",
    discount_percent: 0,
    net_total: 400,
    quantity: 20,
    unit: "m²",
    unit_price: 20,
  },
];

const bauOfferItems: OfferItem[] = [
  { ...bauOfferLegacyItems[0], row_kind: "position" },
  {
    position: 2,
    service_name: "Zweiter Bauabschnitt",
    discount_percent: 0,
    net_total: 0,
    quantity: 0,
    unit: "",
    unit_price: 0,
    row_kind: "text_block",
  },
  { ...bauOfferLegacyItems[1], position: 3, row_kind: "position" },
];

function offerCalc(items: OfferItem[], offer: Offer) {
  return calculateOffer(
    items
      .filter((i) => i.row_kind !== "text_block")
      .map((i) => ({
        net_total: Number(i.net_total ?? 0),
        discount_percent: i.discount_percent,
        hours: Number(i.quantity ?? i.hours ?? 0),
      })),
    offer.global_discount_percent,
    offer.express_enabled,
    offer.express_surcharge_percent,
    offer.hosting_setup_enabled,
    offer.hosting_setup_fee,
    offer.maintenance_enabled,
    offer.maintenance_months,
    offer.maintenance_monthly_fee,
    offer.vat_percent
  );
}

/**
 * Zeichen-Anweisungen aus den Content-Streams extrahieren. Rohe PDF-Bytes sind
 * nicht deterministisch (IDs/Datum/Kompression), die Content-Streams schon –
 * sie beschreiben Text, Positionen und Linien und damit das sichtbare Layout.
 */
function contentStreams(buf: Buffer): string {
  const raw = buf.toString("latin1");
  const out: string[] = [];
  const marker = /stream\r?\n/g;
  let m: RegExpExecArray | null;
  while ((m = marker.exec(raw)) !== null) {
    const start = m.index + m[0].length;
    const end = raw.indexOf("endstream", start);
    if (end < 0) continue;
    try {
      const text = inflateSync(Buffer.from(raw.slice(start, end), "latin1")).toString("latin1");
      if (/(\bTj\b|\bTJ\b|\bTd\b|\bTm\b|\bre\b)/.test(text)) out.push(text);
    } catch {
      // Font-Subsets / Bilder sind nicht relevant fürs Layout.
    }
  }
  return out.join("\n--\n");
}

async function render(name: string, element: React.ReactElement<DocumentProps>) {
  const buf = await renderToBuffer(element);
  writeFileSync(`${outDir}/${name}.pdf`, buf);
  const content = contentStreams(buf);
  writeFileSync(`${outDir}/${name}.ops.txt`, content);
  const hash = createHash("sha256").update(content).digest("hex").slice(0, 16);
  console.log(`${hash}  ${name}`);
}

async function main() {
  await render(
    "invoice-it-legacy",
    <InvoicePDFDocument invoice={legacyItInvoice} items={legacyItItems} client={client} />
  );
  await render(
    "invoice-bau",
    <InvoicePDFDocument invoice={bauInvoice} items={bauItems} client={client} />
  );
  await render(
    "offer-it-legacy",
    <OfferDocument
      offer={legacyItOffer}
      items={legacyItOfferItems}
      addons={[]}
      client={client}
      calc={offerCalc(legacyItOfferItems, legacyItOffer)}
      logoUrl="public/LogoTEXTBLACK.png"
    />
  );
  await render(
    "offer-bau-legacy",
    <OfferDocument
      offer={bauOffer}
      items={bauOfferLegacyItems}
      addons={[]}
      client={client}
      calc={offerCalc(bauOfferLegacyItems, bauOffer)}
      logoUrl="public/LogoTEXTBLACK.png"
    />
  );
  await render(
    "offer-bau",
    <OfferDocument
      offer={bauOffer}
      items={bauOfferItems}
      addons={[]}
      client={client}
      calc={offerCalc(bauOfferItems, bauOffer)}
      logoUrl="public/LogoTEXTBLACK.png"
    />
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
