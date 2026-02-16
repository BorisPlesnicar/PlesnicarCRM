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
import { Offer, OfferItem, Client } from "@/lib/types";
import { OfferCalculation } from "@/lib/calculations";
import { Button } from "@/components/ui/button";
import { Download, X, Loader2 } from "lucide-react";

const RED = "#DC2626";

const s = StyleSheet.create({
  page: {
    paddingTop: 35,
    paddingBottom: 100,
    paddingHorizontal: 45,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: "#222",
  },
  /* ---- HEADER / LOGO ---- */
  logo: {
    width: 180,
    marginBottom: 18,
  },
  /* ---- TITLE ---- */
  title: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 4,
    color: "#111",
  },
  titleUnderline: {
    width: "100%",
    height: 2,
    backgroundColor: RED,
    marginBottom: 18,
  },
  /* ---- INFO BOX ---- */
  infoBox: {
    borderWidth: 1,
    borderColor: "#ccc",
    marginBottom: 18,
  },
  infoRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
  },
  infoLabel: {
    width: 80,
    padding: 6,
    fontWeight: 700,
    fontSize: 9,
    backgroundColor: "#f9f9f9",
    borderRightWidth: 0.5,
    borderRightColor: "#ddd",
  },
  infoValue: {
    flex: 1,
    padding: 6,
    fontSize: 9,
  },
  /* ---- SECTION HEADING ---- */
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 8,
    color: "#111",
  },
  /* ---- DESCRIPTION ---- */
  description: {
    fontSize: 9,
    lineHeight: 1.5,
    marginBottom: 18,
    color: "#333",
  },
  /* ---- TABLE ---- */
  tableHeader: {
    flexDirection: "row",
    backgroundColor: RED,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableHeaderCell: {
    color: "#fff",
    fontWeight: 700,
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableRowAlt: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
    paddingVertical: 5,
    paddingHorizontal: 4,
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
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  extrasLabel: { fontSize: 8.5, color: "#555" },
  extrasValue: { fontSize: 9, fontWeight: 600 },
  /* ---- HINT LINE ---- */
  hint: {
    fontSize: 7.5,
    color: "#888",
    marginTop: 8,
    marginBottom: 2,
  },
  /* ---- TOTAL ---- */
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 18,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: RED,
    marginRight: 12,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: 700,
    color: RED,
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
    borderTopWidth: 1,
    borderTopColor: RED,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerCol: {
    width: "25%",
  },
  footerTitle: {
    fontSize: 7,
    fontWeight: 700,
    marginBottom: 3,
    color: "#333",
  },
  footerText: {
    fontSize: 6.5,
    color: "#666",
    lineHeight: 1.5,
  },
});

function formatEur(value: number): string {
  return (
    value.toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function formatDateDE(dateStr: string): string {
  if (!dateStr) return "–";
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
  return dateStr;
}

interface Props {
  offer: Offer;
  items: OfferItem[];
  client: Client | null;
  calc: OfferCalculation;
  onClose: () => void;
}

function OfferDocument({
  offer,
  items,
  client,
  calc,
  logoUrl,
}: Omit<Props, "onClose"> & { logoUrl: string }) {
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

        {/* ========== PROJEKTUMFANG ========== */}
        {offer.offer_type !== "bau" && (
          <>
            <Text style={s.sectionTitle}>Projektumfang</Text>
            <Text style={s.description}>
              Konzeption und Umsetzung einer professionellen Unternehmenswebsite,
              optimiert für alle Endgeräte. Optimiert für Desktop, Tablet und
              Smartphone.
            </Text>
          </>
        )}

        {/* ========== LEISTUNGEN ========== */}
        <Text style={s.sectionTitle}>Leistungen</Text>

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

        {/* Table Rows */}
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

        {/* ========== EXTRAS (if any) ========== */}
        {hasExtras && (
          <View style={{ marginTop: 8 }}>
            {offer.global_discount_percent > 0 && (
              <View style={s.extrasRow}>
                <Text style={s.extrasLabel}>
                  Rabatt ({offer.global_discount_percent}%)
                </Text>
                <Text style={[s.extrasValue, { color: "#16a34a" }]}>
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
                  <Text style={s.extrasLabel}>Netto</Text>
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
          </View>
        )}

        {/* ========== Kleinunternehmer HINT ========== */}
        <Text style={s.hint}>
          Hinweis Umsatzsteuerbefreit – Kleinunternehmer gem. § 6 Abs 1 Z 27
          UStG
        </Text>

        {/* ========== GESAMT ========== */}
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Gesamt:</Text>
          <Text style={s.totalValue}>{formatEur(calc.total)}</Text>
        </View>

        {/* ========== TEXT BLOCKS ========== */}
        <Text style={s.textBlock}>
          Falls weitere Fragen bestehen zögern Sie nicht uns zu kontaktieren. Die
          Kontaktdaten sind in der Fußzeile aufzufinden.
        </Text>
        <Text style={s.textBlock}>
          Vielen Dank für Ihr Vertrauen in Plesnicar Solutions.
        </Text>

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
  client,
  calc,
  onClose,
}: Props) {
  const [generating, setGenerating] = useState(false);

  async function downloadPdf() {
    setGenerating(true);
    try {
      const logoUrl = `${window.location.origin}/LogoTEXTB.png`;
      const blob = await pdf(
        <OfferDocument
          offer={offer}
          items={items}
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
