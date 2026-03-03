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
  Font,
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

// Use Helvetica as default font (built-in, clean and modern)

const s = StyleSheet.create({
  page: {
    paddingTop: 35,
    paddingBottom: 100,
    paddingHorizontal: 45,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
    backgroundColor: "#ffffff",
  },
  /* ---- HEADER / LOGO ---- */
  logo: {
    width: 200,
    height: 50,
    marginBottom: 18,
    objectFit: "contain",
  },
  /* ---- TITLE ---- */
  title: {
    fontSize: 17,
    fontWeight: 700,
    marginBottom: 5,
    color: "#1a1a1a",
    letterSpacing: 0.5,
  },
  titleUnderline: {
    width: "100%",
    height: 3,
    backgroundColor: RED,
    marginBottom: 18,
  },
  /* ---- INFO BOX ---- */
  infoBox: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    marginBottom: 18,
    borderRadius: 2,
  },
  infoRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  infoLabel: {
    width: 85,
    padding: 7,
    fontWeight: 700,
    fontSize: 8.5,
    backgroundColor: "#f9f9f9",
    borderRightWidth: 1,
    borderRightColor: "#e5e5e5",
    color: "#1a1a1a",
  },
  infoValue: {
    flex: 1,
    padding: 7,
    fontSize: 9,
    color: "#1a1a1a",
  },
  /* ---- SECTION HEADING ---- */
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 8,
    color: "#1a1a1a",
    letterSpacing: 0.3,
    marginTop: 4,
  },
  /* ---- DESCRIPTION ---- */
  description: {
    fontSize: 9,
    lineHeight: 1.5,
    marginBottom: 16,
    color: "#333",
  },
  /* ---- TABLE ---- */
  tableHeader: {
    flexDirection: "row",
    backgroundColor: RED,
    paddingVertical: 8,
    paddingHorizontal: 5,
  },
  tableHeaderCell: {
    color: "#fff",
    fontWeight: 700,
    fontSize: 9,
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    paddingVertical: 6,
    paddingHorizontal: 5,
    backgroundColor: "#ffffff",
  },
  tableRowAlt: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    paddingVertical: 6,
    paddingHorizontal: 5,
    backgroundColor: "#fafafa",
  },
  colPos: { width: "8%" },
  colLeistung: { width: "42%" },
  colStd: { width: "13%", textAlign: "right" },
  colRate: { width: "15%", textAlign: "right" },
  colPreis: { width: "22%", textAlign: "right" },
  /* ---- EXTRAS / SUMMARY ---- */
  extrasRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    paddingHorizontal: 5,
    marginBottom: 1,
  },
  extrasLabel: { fontSize: 8.5, color: "#555", letterSpacing: 0.2 },
  extrasValue: { fontSize: 9, fontWeight: 600, color: "#1a1a1a" },
  /* ---- HINT LINE ---- */
  hint: {
    fontSize: 7.5,
    color: "#666",
    marginTop: 8,
    marginBottom: 3,
    fontStyle: "italic",
    lineHeight: 1.4,
  },
  /* ---- TOTAL ---- */
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 18,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: "#e5e5e5",
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: RED,
    marginRight: 12,
    letterSpacing: 0.5,
  },
  totalValue: {
    fontSize: 15,
    fontWeight: 700,
    color: RED,
    letterSpacing: 0.5,
  },
  /* ---- TEXT BLOCKS ---- */
  textBlock: {
    fontSize: 9,
    lineHeight: 1.5,
    color: "#333",
    marginBottom: 6,
  },
  /* ---- FOOTER ---- */
  footer: {
    position: "absolute",
    bottom: 25,
    left: 45,
    right: 45,
    borderTopWidth: 3,
    borderTopColor: RED,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerCol: {
    width: "25%",
  },
  footerTitle: {
    fontSize: 8,
    fontWeight: 700,
    marginBottom: 5,
    color: "#1a1a1a",
    letterSpacing: 0.3,
  },
  footerText: {
    fontSize: 7,
    color: "#555",
    lineHeight: 1.5,
    marginBottom: 2,
  },
});

function formatEur(value: number): string {
  return formatNumberDE(value, 2);
}

function formatDateDE(dateStr: string): string {
  if (!dateStr) return "–";
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
  return dateStr;
}

// Einfache Formatierung im Projektumfang: **fett**, # Überschrift, ## Unterüberschrift
function parseInlineBold(
  line: string,
  baseStyle: Record<string, number | string>,
  boldStyle: Record<string, string | number>
) {
  const parts: Array<{ text: string; bold: boolean }> = [];
  let rest = line;
  while (rest.length > 0) {
    const idx = rest.indexOf("**");
    if (idx === -1) {
      if (rest) parts.push({ text: rest, bold: false });
      break;
    }
    if (idx > 0) parts.push({ text: rest.slice(0, idx), bold: false });
    const end = rest.indexOf("**", idx + 2);
    if (end === -1) {
      parts.push({ text: rest.slice(idx), bold: false });
      break;
    }
    parts.push({ text: rest.slice(idx + 2, end), bold: true });
    rest = rest.slice(end + 2);
  }
  return (
    <Text style={baseStyle}>
      {parts.map((p, i) =>
        p.bold ? (
          <Text key={i} style={boldStyle}>
            {p.text}
          </Text>
        ) : (
          p.text
        )
      )}
    </Text>
  );
}

function renderProjectScope(text: string) {
  const fallback =
    "Konzeption und Umsetzung einer professionellen Unternehmenswebsite, optimiert für alle Endgeräte. Optimiert für Desktop, Tablet und Smartphone.";
  const raw = (text || "").trim().length > 0 ? text : fallback;
  const lines = raw.split(/\r?\n/);
  const baseStyle: Record<string, number | string> = { fontSize: 9, lineHeight: 1.5, color: "#333", marginBottom: 4 };
  const boldStyle: Record<string, string | number> = { fontWeight: 700 };
  const heading1Style = { fontSize: 10, fontWeight: 700, color: "#1a1a1a", marginTop: 6, marginBottom: 2 };
  const heading2Style = { fontSize: 9.5, fontWeight: 700, color: "#1a1a1a", marginTop: 4, marginBottom: 2 };

  return (
    <View style={{ marginBottom: 12 }}>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("## ")) {
          return (
            <Text key={i} style={heading2Style}>
              {trimmed.slice(3)}
            </Text>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <Text key={i} style={heading1Style}>
              {trimmed.slice(2)}
            </Text>
          );
        }
        if (trimmed === "") return <View key={i} style={{ height: 6 }} />;
        return (
          <View key={i} style={{ marginBottom: 2 }}>
            {parseInlineBold(line, baseStyle, boldStyle)}
          </View>
        );
      })}
    </View>
  );
}

interface Props {
  offer: Offer;
  items: OfferItem[];
  addons?: OfferAddon[];
  client: Client | null;
  calc: OfferCalculation;
  onClose: () => void;
}

function OfferDocument({
  offer,
  items,
  addons = [],
  client,
  calc,
  logoUrl,
}: Omit<Props, "onClose"> & { logoUrl: string }) {
  const addonsSum = addons.reduce((s, a) => s + (Number(a.price) || 0), 0);
  const totalWithAddons = calc.total + addonsSum;
  const hasExtras =
    offer.global_discount_percent > 0 ||
    offer.express_enabled ||
    offer.hosting_setup_enabled ||
    offer.maintenance_enabled;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ========== LOGO ========== */}
        <Image src={logoUrl} style={s.logo} />

        {/* ========== TITLE ========== */}
        <Text style={s.title}>Pauschalangebot – Webprojekt</Text>
        <View style={s.titleUnderline} />

        {/* ========== INFO BOX ========== */}
        <View style={s.infoBox}>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Angebots-Nr.:</Text>
            <Text style={s.infoValue}>{offer.offer_number || "–"}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Kunde:</Text>
            <Text style={s.infoValue}>
              {client?.name || "–"}
              {client?.company ? `  (${client.company})` : ""}
            </Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Datum:</Text>
            <Text style={s.infoValue}>{formatDateDE(offer.date)}</Text>
          </View>
          <View style={[s.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={s.infoLabel}>Berater:</Text>
            <Text style={s.infoValue}>
              {offer.consultant_name || "Boris Plesnicar"}
              {offer.consultant_phone
                ? `  |  ${offer.consultant_phone}`
                : "  |  +43 664 4678382"}
            </Text>
          </View>
        </View>

        {/* ========== 1. PROJEKTUMFANG (Kurzfassung, eigener Text) ========== */}
        {offer.offer_type !== "bau" && (
          <>
            <Text style={s.sectionTitle}>1. Projektumfang</Text>
            <Text style={s.description}>
              {offer.project_scope_short && offer.project_scope_short.trim().length > 0
                ? offer.project_scope_short
                : "Kurzbeschreibung des Projekts. Der detaillierte Projektumfang ist unter Punkt 3 beschrieben."}
            </Text>
          </>
        )}

        {/* ========== 2. LEISTUNGEN (wrap={false}: Tabelle bricht nicht mittendurch, springt geschlossen auf nächste Seite) ========== */}
        <View wrap={false}>
          <Text style={s.sectionTitle}>2. Leistungen</Text>

          {/* Table Header */}
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderCell, s.colPos]}>Pos.</Text>
            <Text style={[s.tableHeaderCell, s.colLeistung]}>Leistung</Text>
            {offer.offer_type !== "bau" && (
              <>
                <Text style={[s.tableHeaderCell, s.colStd]}>Std.</Text>
                <Text style={[s.tableHeaderCell, s.colRate]}>€/h</Text>
              </>
            )}
            <Text
              style={[
                s.tableHeaderCell,
                offer.offer_type === "bau" ? { width: "50%", textAlign: "right" } : s.colPreis,
              ]}
            >
              Preis (€)
            </Text>
          </View>

          {/* Table Rows – reguläre Leistungen */}
          {items.map((item, i) => (
          <View
            key={item.id || i}
            style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}
          >
            <Text style={s.colPos}>{item.position}</Text>
            <Text
              style={
                offer.offer_type === "bau"
                  ? { width: "42%", paddingRight: 5 }
                  : s.colLeistung
              }
            >
              {item.service_name}
            </Text>
            {offer.offer_type !== "bau" && (
              <>
                <Text style={s.colStd}>
                  {formatEur(item.hours || 0)}
                </Text>
                <Text style={s.colRate}>
                  {formatEur(item.hourly_rate || 0)}
                </Text>
              </>
            )}
            <Text
              style={
                offer.offer_type === "bau"
                  ? { width: "50%", textAlign: "right" as const, fontWeight: 600 }
                  : [s.colPreis, { fontWeight: 600 }]
              }
            >
              {formatEur(item.net_total)}
            </Text>
          </View>
        ))}

        {/* Table Rows – Zusatzleistungen (werden an „Leistungen“ angehängt) */}
        {addons.map((addon, i) => (
          <View
            key={addon.id || `addon-${i}`}
            style={
              (items.length + i) % 2 === 0 ? s.tableRow : s.tableRowAlt
            }
          >
            <Text style={s.colPos}>
              {items.length + i + 1}
            </Text>
            <Text
              style={
                offer.offer_type === "bau"
                  ? { width: "42%", paddingRight: 5 }
                  : s.colLeistung
              }
            >
              {addon.title}
            </Text>
            {offer.offer_type !== "bau" && (
              <>
                <Text style={s.colStd} />
                <Text style={s.colRate} />
              </>
            )}
            <Text
              style={
                offer.offer_type === "bau"
                  ? { width: "50%", textAlign: "right" as const, fontWeight: 600 }
                  : [s.colPreis, { fontWeight: 600 }]
              }
            >
              {formatEur(Number(addon.price))}
            </Text>
          </View>
        ))}
        </View>

        {/* ========== ZUSAMMENFASSUNG (nicht umbrechen, damit Gesamt nicht auf nächste Seite rutscht) ========== */}
        <View wrap={false} style={{ marginTop: 8 }}>
          <View style={s.extrasRow}>
            <Text style={s.extrasLabel}>Summe Positionen</Text>
            <Text style={s.extrasValue}>
              {formatEur(calc.sum_positions + addonsSum)} €
            </Text>
          </View>
          {offer.global_discount_percent > 0 && (
            <View style={s.extrasRow}>
              <Text
                style={[
                  s.extrasLabel,
                  { color: "#16a34a" }, // Grün für das Label
                ]}
              >
                Rabatt ({offer.global_discount_percent}%)
              </Text>
              <Text
                style={[
                  s.extrasValue,
                  { color: "#16a34a" }, // Grün für den Betrag
                ]}
              >
                -{formatEur(calc.global_discount_eur)} €
              </Text>
            </View>
          )}
            {offer.express_enabled && (
              <View style={s.extrasRow}>
                <Text style={s.extrasLabel}>
                  Express-Zuschlag ({offer.express_surcharge_percent}%)
                </Text>
                <Text style={s.extrasValue}>
                  +{formatEur(calc.express_surcharge_eur)} €
                </Text>
              </View>
            )}
            {offer.hosting_setup_enabled && (
              <View style={s.extrasRow}>
                <Text style={s.extrasLabel}>Hosting-Setup</Text>
                <Text style={s.extrasValue}>
                  +{formatEur(calc.hosting_total)} €
                </Text>
              </View>
            )}
            {offer.maintenance_enabled && (
              <View style={s.extrasRow}>
                <Text style={s.extrasLabel}>
                  Wartung & Support ({offer.maintenance_months} Monate ×{" "}
                  {formatEur(offer.maintenance_monthly_fee)} €)
                </Text>
                <Text style={s.extrasValue}>
                  +{formatEur(calc.maintenance_total)} €
                </Text>
              </View>
            )}
            {offer.vat_percent > 0 && (
              <>
                <View style={s.extrasRow}>
                  <Text style={s.extrasLabel}>Zwischensumme (Netto)</Text>
                  <Text style={s.extrasValue}>
                    {formatEur(calc.subtotal_before_vat)} €
                  </Text>
                </View>
                <View style={s.extrasRow}>
                  <Text style={s.extrasLabel}>
                    MwSt. ({offer.vat_percent}%)
                  </Text>
                  <Text style={s.extrasValue}>
                    +{formatEur(calc.vat_amount)} €
                  </Text>
                </View>
              </>
            )}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Gesamt:</Text>
            <Text style={s.totalValue}>{formatEur(totalWithAddons)} €</Text>
          </View>

          {/* Kleinunternehmer-Hinweis direkt bei der Summe */}
          <Text style={s.hint}>
            Hinweis Umsatzsteuerbefreit – Kleinunternehmer gem. § 6 Abs 1 Z 27 UStG
          </Text>
        </View>

        {/* ========== 3. DETAILLIERTER PROJEKTUMFANG (eigener, gut formatierbarer Block – immer nach der Summe, auf neuer Seite) ========== */}
        {offer.offer_type !== "bau" && (
          <View wrap={false} break style={{ marginTop: 16 }}>
            <Text style={s.sectionTitle}>3. Detaillierter Projektumfang</Text>
            {renderProjectScope(offer.project_scope || "")}
          </View>
        )}

        {/* ========== FOOTER ========== */}
        <View style={s.footer} fixed>
          <View style={s.footerCol}>
            <Text style={s.footerTitle}>Plesnicar Solutions</Text>
            <Text style={s.footerText}>Hartriegelstraße 12</Text>
            <Text style={s.footerText}>3550 Langenlois</Text>
            <Text style={s.footerText}>Österreich</Text>
            <Text style={s.footerText}>GF Boris Plesnicar</Text>
          </View>
          <View style={s.footerCol}>
            <Text style={s.footerTitle}>Kontaktinformation</Text>
            <Text style={s.footerText}>Boris Plesnicar</Text>
            <Text style={s.footerText}>Telefon +43 664 4678382</Text>
            <Text style={s.footerText}>Email: plesnicaroffice@gmail.com</Text>
            <Text style={s.footerText}>www.plesnicarsolutions.at</Text>
          </View>
          <View style={s.footerCol}>
            <Text style={s.footerTitle}>Bankverbindung</Text>
            <Text style={s.footerText}>Raiba Langenlois</Text>
            <Text style={s.footerText}>AT37 3242 6000 0008 1968</Text>
            <Text style={s.footerText}>BIC: RLNWATWW426</Text>
          </View>
          <View style={s.footerCol}>
            <Text style={s.footerTitle}>Gerichtsstand</Text>
            <Text style={s.footerText}>3500 Krems a.d. Donau</Text>
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
      a.download = `${offer.offer_number}.pdf`;
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
