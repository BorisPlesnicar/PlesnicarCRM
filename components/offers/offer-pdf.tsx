"use client";

import { useState } from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import { Offer, OfferItem, OfferAddon, Client } from "@/lib/types";
import { OfferCalculation } from "@/lib/calculations";
import { Button } from "@/components/ui/button";
import { Download, X, Loader2 } from "lucide-react";

const RED = "#DC2626";

// Format number with German format (25.000,00)
function formatNumberDE(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function formatDateDE(dateStr: string): string {
  if (!dateStr) return "–";
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
  return dateStr;
}

// Gleiche Styles wie Rechnung (1:1)
const s = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 82,
    paddingHorizontal: 50,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: RED,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  logoContainer: {
    alignItems: "flex-end",
    justifyContent: "flex-start",
  },
  logo: {
    width: 200,
    height: 50,
    objectFit: "contain",
  },
  headerLine: {
    width: "100%",
    height: 3,
    backgroundColor: RED,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  senderInfo: {
    width: "50%",
    paddingRight: 15,
    paddingTop: 0,
  },
  invoiceInfoBox: {
    width: "45%",
    borderWidth: 1,
    borderColor: "#e5e5e5",
    backgroundColor: "#f9f9f9",
    padding: 10,
    borderRadius: 2,
  },
  invoiceInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
  },
  invoiceInfoRowLast: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 0,
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  infoLabel: {
    fontSize: 8.5,
    color: "#666",
    letterSpacing: 0.2,
  },
  infoValue: {
    fontSize: 10,
    fontWeight: 600,
    color: "#1a1a1a",
    textAlign: "right",
  },
  infoValueBold: {
    fontSize: 10.5,
    fontWeight: 700,
    color: "#1a1a1a",
    textAlign: "right",
  },
  recipient: {
    marginBottom: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
  },
  recipientLabel: {
    fontSize: 8.5,
    color: "#666",
    marginBottom: 5,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  recipientName: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 3,
    color: "#1a1a1a",
  },
  recipientAddress: {
    fontSize: 9.5,
    lineHeight: 1.4,
    color: "#333",
  },
  table: {
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: RED,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  tableHeaderText: {
    color: "#fff",
    fontSize: 8.5,
    fontWeight: 700,
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    paddingVertical: 7,
    paddingHorizontal: 6,
    backgroundColor: "#ffffff",
  },
  tableRowAlt: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    paddingVertical: 7,
    paddingHorizontal: 6,
    backgroundColor: "#fafafa",
  },
  tableCell: {
    fontSize: 9,
    color: "#1a1a1a",
    lineHeight: 1.3,
  },
  colBezeichnung: { width: "35%" },
  colAnzahl: { width: "8%", textAlign: "right" },
  colEinheit: { width: "8%", textAlign: "center" },
  colEinheitspreis: { width: "12%", textAlign: "right" },
  colUst: { width: "8%", textAlign: "center" },
  colRabatt: { width: "10%", textAlign: "right" },
  colGesamt: { width: "19%", textAlign: "right", fontWeight: "bold" },
  totalsWrap: {
    position: "relative",
  },
  totals: {
    alignItems: "flex-end",
    marginBottom: 18,
    width: "100%",
    marginTop: 8,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 250,
    marginBottom: 5,
    paddingRight: 12,
  },
  totalLabel: {
    fontSize: 9.5,
    color: "#666",
    letterSpacing: 0.2,
  },
  totalValue: {
    fontSize: 10,
    fontWeight: 600,
    color: "#1a1a1a",
  },
  totalFinal: {
    fontSize: 15,
    fontWeight: 700,
    color: RED,
    letterSpacing: 0.5,
  },
  legalNote: {
    fontSize: 7.5,
    color: "#666",
    marginTop: 10,
    marginBottom: 0,
    fontStyle: "italic",
    lineHeight: 1.4,
  },
  legalSection: {
    position: "relative",
    marginTop: 8,
  },
  footerContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 50,
    paddingBottom: 22,
    paddingTop: 12,
    backgroundColor: "#ffffff",
  },
  footerBar: {
    width: "100%",
    height: 3,
    backgroundColor: RED,
    marginBottom: 10,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: "#666",
  },
  footerColumn: {
    width: "25%",
  },
  footerTitle: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#1a1a1a",
    letterSpacing: 0.3,
  },
  footerText: {
    fontSize: 7.5,
    lineHeight: 1.4,
    marginBottom: 2,
    color: "#555",
  },
});

interface TableRowLike {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  vat_percent: number;
  discount_percent: number;
  total: number;
}

function buildOfferTableRows(
  offer: Offer,
  items: OfferItem[],
  addons: OfferAddon[],
  calc: OfferCalculation
): TableRowLike[] {
  const vatPct = offer.vat_percent ?? 0;
  const rows: TableRowLike[] = [];
  const isBau = offer.offer_type === "bau";

  items.forEach((item) => {
    if (isBau) {
      const d = item.discount_percent ?? 0;
      const net = Number(item.net_total ?? 0);
      const qty =
        item.quantity != null && !Number.isNaN(Number(item.quantity))
          ? Number(item.quantity)
          : 1;
      const unit = (item.unit as string) || "Stk";
      const unitPrice =
        item.unit_price != null && !Number.isNaN(Number(item.unit_price))
          ? Number(item.unit_price)
          : d >= 100
            ? net
            : net === 0
              ? 0
              : net / (1 - d / 100);
      rows.push({
        description: item.service_name,
        quantity: qty,
        unit,
        unit_price: unitPrice,
        vat_percent: vatPct,
        discount_percent: d,
        total: net,
      });
    } else {
      const hours = item.hours ?? 0;
      const rate = item.hourly_rate ?? 0;
      rows.push({
        description: item.service_name,
        quantity: hours,
        unit: "Std.",
        unit_price: rate,
        vat_percent: vatPct,
        discount_percent: item.discount_percent ?? 0,
        total: item.net_total,
      });
    }
  });

  addons.forEach((addon) => {
    const price = Number(addon.price) || 0;
    rows.push({
      description: addon.title,
      quantity: 1,
      unit: "Stk",
      unit_price: price,
      vat_percent: 0,
      discount_percent: 0,
      total: price,
    });
  });

  if (offer.global_discount_percent > 0 && calc.global_discount_eur > 0) {
    rows.push({
      description: `Rabatt (${offer.global_discount_percent}%)`,
      quantity: 1,
      unit: "–",
      unit_price: -calc.global_discount_eur,
      vat_percent: 0,
      discount_percent: 0,
      total: -calc.global_discount_eur,
    });
  }
  if (offer.express_enabled && calc.express_surcharge_eur > 0) {
    rows.push({
      description: "Express-Zuschlag",
      quantity: 1,
      unit: "–",
      unit_price: calc.express_surcharge_eur,
      vat_percent: 0,
      discount_percent: 0,
      total: calc.express_surcharge_eur,
    });
  }
  if (offer.hosting_setup_enabled && calc.hosting_total > 0) {
    rows.push({
      description: "Hosting-Setup",
      quantity: 1,
      unit: "–",
      unit_price: calc.hosting_total,
      vat_percent: 0,
      discount_percent: 0,
      total: calc.hosting_total,
    });
  }
  if (offer.maintenance_enabled && calc.maintenance_total > 0) {
    rows.push({
      description: `Wartung & Support (${offer.maintenance_months} Monate)`,
      quantity: 1,
      unit: "–",
      unit_price: calc.maintenance_total,
      vat_percent: 0,
      discount_percent: 0,
      total: calc.maintenance_total,
    });
  }

  return rows;
}

interface Props {
  offer: Offer;
  items: OfferItem[];
  addons?: OfferAddon[];
  client: Client | null;
  calc: OfferCalculation;
  onClose: () => void;
}

export function OfferDocument({
  offer,
  items,
  addons = [],
  client,
  calc,
  logoUrl,
}: Omit<Props, "onClose"> & { logoUrl: string }) {
  const addonsSum = addons.reduce((s, a) => s + (Number(a.price) || 0), 0);
  const totalWithAddons = calc.total + addonsSum;
  const netAmount = (calc.subtotal_before_vat ?? 0) + addonsSum;
  const vatAmount = calc.vat_amount ?? 0;
  const totalAmount = totalWithAddons;

  const tableRows = buildOfferTableRows(offer, items, addons, calc);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header – wie Rechnung, Titel "Angebot" */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Angebot</Text>
          </View>
          <View style={s.logoContainer}>
            <Image src={logoUrl} style={s.logo} />
          </View>
        </View>
        <View style={s.headerLine} />

        {/* Sender / Info-Box – 1:1 wie Rechnung */}
        <View style={s.infoRow}>
          <View style={s.senderInfo}>
            <Text style={[s.infoValue, { fontSize: 11, marginBottom: 4, fontWeight: 700, textAlign: "left" }]}>
              Boris Plesnicar e.U
            </Text>
            <Text style={[s.tableCell, { marginBottom: 2 }]}>Hartriegelstraße 12</Text>
            <Text style={[s.tableCell, { marginBottom: 2 }]}>3550 Langenlois, Österreich</Text>
            <Text style={s.tableCell}>0664/4678382 / 0676/3206308</Text>
          </View>
          <View style={s.invoiceInfoBox}>
            <View style={s.invoiceInfoRow}>
              <Text style={s.infoLabel}>Angebotsdatum:</Text>
              <Text style={s.infoValue}>{formatDateDE(offer.date)}</Text>
            </View>
            <View style={s.invoiceInfoRowLast}>
              <Text style={s.infoLabel}>Angebotsnummer:</Text>
              <Text style={s.infoValue}>{offer.offer_number || "–"}</Text>
            </View>
          </View>
        </View>

        {/* Empfänger – wie Rechnung */}
        <View style={s.recipient}>
          <Text style={s.recipientLabel}>Empfänger:</Text>
          <Text style={s.recipientName}>{client?.name || ""}</Text>
          {client?.company ? <Text style={s.recipientAddress}>{client.company}</Text> : null}
          <Text style={s.recipientAddress}>{client?.address || ""}</Text>
        </View>

        {/* BAU: Text oberhalb der Leistungen (wie Rechnung intro_text) */}
        {offer.offer_type === "bau" && offer.project_scope_short?.trim() && (
          <View style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 9, lineHeight: 1.5, color: "#333" }}>
              {offer.project_scope_short.trim()}
            </Text>
          </View>
        )}

        {/* Tabelle – gleiche Spalten wie Rechnung */}
        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderText, s.colBezeichnung]}>Bezeichnung</Text>
            <Text style={[s.tableHeaderText, s.colAnzahl]}>Anzahl</Text>
            <Text style={[s.tableHeaderText, s.colEinheit]}>Einheit</Text>
            <Text style={[s.tableHeaderText, s.colEinheitspreis]}>Einheitspreis</Text>
            <Text style={[s.tableHeaderText, s.colUst]}>Ust.</Text>
            <Text style={[s.tableHeaderText, s.colRabatt]}>Rabatt</Text>
            <Text style={[s.tableHeaderText, s.colGesamt]}>Gesamt</Text>
          </View>
          {tableRows.map((row, index) => (
            <View key={index} style={index % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <Text style={[s.tableCell, s.colBezeichnung]}>{row.description}</Text>
              <Text style={[s.tableCell, s.colAnzahl]}>{formatNumberDE(row.quantity, 2)}</Text>
              <Text style={[s.tableCell, s.colEinheit]}>{row.unit}</Text>
              <Text style={[s.tableCell, s.colEinheitspreis]}>
                € {formatNumberDE(row.unit_price, 2)}
              </Text>
              <Text style={[s.tableCell, s.colUst]}>{row.vat_percent.toFixed(0)}%</Text>
              <Text style={[s.tableCell, s.colRabatt]}>
                {row.discount_percent > 0 ? `${formatNumberDE(row.discount_percent, 2)}%` : "0,00%"}
              </Text>
              <Text style={[s.tableCell, s.colGesamt]}>{formatNumberDE(row.total, 2)} €</Text>
            </View>
          ))}
        </View>

        {/* Summen – wie Rechnung */}
        <View style={s.totalsWrap}>
          <View style={s.totals}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Nettobetrag:</Text>
              <Text style={s.totalValue}>{formatNumberDE(netAmount, 2)} €</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Umsatzsteuer:</Text>
              <Text style={s.totalValue}>{formatNumberDE(vatAmount, 2)} €</Text>
            </View>
            <View style={[s.totalRow, { marginTop: 10, borderTopWidth: 2, borderTopColor: "#ddd", paddingTop: 10 }]}>
              <Text style={[s.totalLabel, { fontSize: 10.5, fontWeight: 700 }]}>Angebotsbetrag:</Text>
              <Text style={[s.totalValue, s.totalFinal]}>{formatNumberDE(totalAmount, 2)} €</Text>
            </View>
          </View>
        </View>

        {/* Hinweise – wie Rechnung */}
        <View style={s.legalSection}>
          <Text style={s.legalNote}>
            Hinweis: Kleinunternehmer gem. § 6 Abs. 1 Z 27 UStG
          </Text>
          <Text style={s.legalNote}>
            Die gelieferten Waren bleiben bis zur vollständigen Begleichung des Gegenwertes uneingeschränktes Eigentum der Firma Plesnicar Solutions.
          </Text>
        </View>

        {/* Fußzeile – 1:1 wie Rechnung */}
        <View fixed style={s.footerContainer}>
          <View style={s.footerBar} />
          <View style={s.footer}>
            <View style={s.footerColumn}>
              <Text style={s.footerTitle}>Plesnicar Solutions</Text>
              <Text style={s.footerText}>Hartriegelstraße 12</Text>
              <Text style={s.footerText}>3550 Langenlois</Text>
              <Text style={s.footerText}>Österreich</Text>
              <Text style={s.footerText}>GF Boris Plesnicar</Text>
            </View>
            <View style={s.footerColumn}>
              <Text style={s.footerTitle}>Kontaktinformation</Text>
              <Text style={s.footerText}>Boris Plesnicar</Text>
              <Text style={s.footerText}>Telefon +43 664 4678382</Text>
              <Text style={s.footerText}>Email: plesnicaroffice@gmail.com</Text>
              <Text style={s.footerText}>www.plesnicarsolutions.at</Text>
            </View>
            <View style={s.footerColumn}>
              <Text style={s.footerTitle}>Bankverbindung</Text>
              <Text style={s.footerText}>Raiba Langenlois</Text>
              <Text style={s.footerText}>AT37 3242 6000 0008 1968</Text>
              <Text style={s.footerText}>BIC: RLNWATWW426</Text>
            </View>
            <View style={s.footerColumn}>
              <Text style={s.footerTitle}>Gerichtsstand</Text>
              <Text style={s.footerText}>3500 Krems a.d. Donau</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export default function OfferPDFWrapper({
  offer,
  items,
  addons = [],
  client,
  calc,
  onClose,
}: Props) {
  const [generating, setGenerating] = useState(false);

  async function downloadPdf() {
    setGenerating(true);
    try {
      const logoUrl = `${window.location.origin}/LogoTEXTBLACK.png`;
      const blob = await pdf(
        <OfferDocument
          offer={offer}
          items={items}
          addons={addons}
          client={client}
          calc={calc}
          logoUrl={logoUrl}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Angebot_${offer.offer_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation error:", err);
    }
    setGenerating(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">PDF Export</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Angebot{" "}
          <span className="font-medium text-foreground">
            {offer.offer_number}
          </span>{" "}
          als PDF herunterladen.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            onClick={downloadPdf}
            disabled={generating}
            className="bg-primary text-primary-foreground hover:bg-red-700"
          >
            {generating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            PDF herunterladen
          </Button>
        </div>
      </div>
    </div>
  );
}
