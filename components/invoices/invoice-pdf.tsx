"use client";

import { useState, useEffect } from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import QRCode from "qrcode";
import { Invoice, InvoiceItem, Client } from "@/lib/types";
import { formatCurrency } from "@/lib/calculations";
import { Button } from "@/components/ui/button";
import { Download, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { de } from "date-fns/locale";

const RED = "#DC2626";

// EPC QR (SEPA Credit Transfer) – Bankdaten wie im Footer
const EPC_BCD = "BCD";
const EPC_VERSION = "002";
const EPC_CHARSET = "1";
const EPC_IDENT = "SCT";
const EPC_BIC = "RLNWATWW426";
const EPC_NAME = "Boris Plesnicar"; // Kontoinhaber (nicht Firmenname)
const EPC_IBAN = "AT373242600000081968";

function buildEPCString(
  totalAmount: number,
  invoiceNumber: string
): string {
  const amount = Math.round(totalAmount * 100) / 100;
  const eur = `EUR${amount.toFixed(2)}`;
  const ref = (invoiceNumber || "").trim() || "Rechnung";
  return [
    EPC_BCD,
    EPC_VERSION,
    EPC_CHARSET,
    EPC_IDENT,
    EPC_BIC,
    EPC_NAME,
    EPC_IBAN,
    eur,
    "",
    ref,
    "",
    "",
  ].join("\n");
}

export async function getInvoiceQRDataUrl(
  totalAmount: number,
  invoiceNumber: string
): Promise<string> {
  const epc = buildEPCString(totalAmount, invoiceNumber);
  return QRCode.toDataURL(epc, { margin: 1, width: 140, errorCorrectionLevel: "M" });
}

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
    paddingTop: 32,
    paddingBottom: 120,
    paddingHorizontal: 50,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
    backgroundColor: "#ffffff",
  },
  // Header
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
  // Sender/Invoice Info Row
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
  // Zahlungsvereinbarung (Skonto)
  paymentSection: {
    marginTop: 12,
    marginBottom: 14,
  },
  paymentSectionTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: "#1a1a1a",
    marginBottom: 6,
  },
  paymentTable: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    backgroundColor: "#fafafa",
  },
  paymentTableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#f0f0f0",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  paymentTableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderColor: "#e8e8e8",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  paymentTableRowLast: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  paymentColZahlbetrag: { width: "18%", fontSize: 9 },
  paymentColBasisdatum: { width: "22%", fontSize: 9 },
  paymentColBedingung: { width: "32%", fontSize: 9 },
  paymentColFaellig: { width: "18%", fontSize: 9 },
  paymentColEur: { width: "10%", fontSize: 9, textAlign: "right" as const },
  paymentHeaderText: { fontSize: 8.5, fontWeight: 700, color: "#444" },
  // Recipient
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
  // Table
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
  // Totals
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
  // Legal Note
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
  qrAbsolute: {
    position: "absolute",
    left: 0,
    top: 0,
    alignItems: "flex-start",
  },
  qrImage: {
    width: 72,
    height: 72,
    marginBottom: 2,
  },
  qrCaption: {
    fontSize: 6.5,
    color: "#666",
  },
  // Footer (fixed am unteren Seitenrand)
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

interface InvoicePDFProps {
  invoice: Invoice | Partial<Invoice>; // Allow partial for drafts
  items: InvoiceItem[];
  client: Client | null;
  onClose: () => void;
  previewMode?: boolean; // If true, show preview instead of download
  qrDataUrl?: string | null; // QR-Code für SEPA-Zahlung (Betrag + Rechnungsnummer)
}

export function InvoicePDFDocument({
  invoice,
  items,
  client,
  qrDataUrl,
}: Omit<InvoicePDFProps, "onClose" | "previewMode">) {
  const invoiceDate = invoice.invoice_date ? new Date(invoice.invoice_date) : new Date();
  const dueDate = invoice.due_date ? new Date(invoice.due_date) : new Date();
  const hasSkonto =
    invoice.skonto_days != null &&
    invoice.skonto_percent != null &&
    invoice.skonto_days > 0 &&
    invoice.skonto_percent > 0;
  const dueDateSkonto = hasSkonto ? addDays(invoiceDate, invoice.skonto_days!) : dueDate;
  const dueDateFull = addDays(invoiceDate, invoice.payment_term_days || 14);
  const totalWithSkonto = hasSkonto
    ? Math.round(invoice.total_amount * (1 - invoice.skonto_percent! / 100) * 100) / 100
    : invoice.total_amount;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Rechnung</Text>
          </View>
          <View style={s.logoContainer}>
            <Image src="/LogoTEXTBLACK.png" style={s.logo} />
          </View>
        </View>
        <View style={s.headerLine} />

        {/* Sender / Invoice Info Row */}
        <View style={s.infoRow}>
          <View style={s.senderInfo}>
            <Text style={[s.infoValue, { fontSize: 11, marginBottom: 4, fontWeight: 700, textAlign: "left" }]}>Boris Plesnicar e.U</Text>
            <Text style={[s.tableCell, { marginBottom: 2 }]}>Hartriegelstraße 12</Text>
            <Text style={[s.tableCell, { marginBottom: 2 }]}>3550 Langenlois, Österreich</Text>
            <Text style={s.tableCell}>0664/4678382 / 0676/3206308</Text>
          </View>
          <View style={s.invoiceInfoBox}>
            <View style={s.invoiceInfoRow}>
              <Text style={s.infoLabel}>Rechnungsdatum:</Text>
              <Text style={s.infoValue}>{format(invoiceDate, "dd.MM.yyyy", { locale: de })}</Text>
            </View>
            <View style={s.invoiceInfoRow}>
              <Text style={s.infoLabel}>Rechnungsnummer:</Text>
              <Text style={s.infoValue}>{invoice.invoice_number || "DRAFT"}</Text>
            </View>
            <View style={s.invoiceInfoRowLast}>
              <Text style={s.infoLabel}>Kundennummer:</Text>
              <Text style={s.infoValue}>{invoice.customer_number || "–"}</Text>
            </View>
          </View>
        </View>

        {/* Recipient */}
        <View style={s.recipient}>
          <Text style={s.recipientLabel}>Empfänger:</Text>
          <Text style={s.recipientName}>{client?.name || ""}</Text>
          {client?.company && <Text style={s.recipientAddress}>{client.company}</Text>}
          <Text style={s.recipientAddress}>{client?.address || ""}</Text>
        </View>

        {/* BAU: Text oberhalb der Leistungen */}
        {invoice.invoice_type === "bau" && invoice.intro_text && invoice.intro_text.trim() && (
          <View style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 9, lineHeight: 1.5, color: "#333" }}>
              {invoice.intro_text.trim()}
            </Text>
          </View>
        )}

        {/* Table */}
        <View style={s.table}>
          {/* Header */}
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderText, s.colBezeichnung]}>Bezeichnung</Text>
            <Text style={[s.tableHeaderText, s.colAnzahl]}>Anzahl</Text>
            <Text style={[s.tableHeaderText, s.colEinheit]}>Einheit</Text>
            <Text style={[s.tableHeaderText, s.colEinheitspreis]}>Einheitspreis</Text>
            <Text style={[s.tableHeaderText, s.colUst]}>Ust.</Text>
            <Text style={[s.tableHeaderText, s.colRabatt]}>Rabatt</Text>
            <Text style={[s.tableHeaderText, s.colGesamt]}>Gesamt</Text>
          </View>
          {/* Rows */}
          {items.map((item, index) => (
            <View key={item.id || item.position} style={index % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <Text style={[s.tableCell, s.colBezeichnung]}>{item.description}</Text>
              <Text style={[s.tableCell, s.colAnzahl]}>{formatNumberDE(item.quantity, 2)}</Text>
              <Text style={[s.tableCell, s.colEinheit]}>{item.unit}</Text>
              <Text style={[s.tableCell, s.colEinheitspreis]}>€ {formatNumberDE(item.unit_price, 2)}</Text>
              <Text style={[s.tableCell, s.colUst]}>{item.vat_percent.toFixed(0)}%</Text>
              <Text style={[s.tableCell, s.colRabatt]}>{item.discount_percent > 0 ? `${formatNumberDE(item.discount_percent, 2)}%` : "0,00%"}</Text>
              <Text style={[s.tableCell, s.colGesamt]}>{formatNumberDE(item.total, 2)} €</Text>
            </View>
          ))}
        </View>

        {/* Totals + QR auf Höhe Nettobetrag (links) */}
        <View style={s.totalsWrap}>
          {qrDataUrl && (
            <View style={s.qrAbsolute}>
              <Image style={s.qrImage} src={qrDataUrl} />
              <Text style={s.qrCaption}>Zahlung mit Banking-App scannen</Text>
            </View>
          )}
          <View style={s.totals}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Nettobetrag:</Text>
              <Text style={s.totalValue}>{formatNumberDE(invoice.net_amount || 0, 2)} €</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Umsatzsteuer:</Text>
              <Text style={s.totalValue}>{formatNumberDE(invoice.vat_amount || 0, 2)} €</Text>
            </View>
            <View style={[s.totalRow, { marginTop: 10, borderTopWidth: 2, borderTopColor: "#ddd", paddingTop: 10 }]}>
              <Text style={[s.totalLabel, { fontSize: 10.5, fontWeight: 700 }]}>Rechnungsbetrag:</Text>
              <Text style={[s.totalValue, s.totalFinal]}>{formatNumberDE(invoice.total_amount || 0, 2)} €</Text>
            </View>
          </View>
        </View>

        {/* Zahlungsziel / Zahlungsvereinbarung unter der Summe */}
        {hasSkonto ? (
          <View style={s.paymentSection}>
            <Text style={s.paymentSectionTitle}>Zahlungsvereinbarung</Text>
            <View style={s.paymentTable}>
              <View style={s.paymentTableHeader}>
                <Text style={[s.paymentColZahlbetrag, s.paymentHeaderText]}>Zahlbetrag</Text>
                <Text style={[s.paymentColBasisdatum, s.paymentHeaderText]}>Basisdatum</Text>
                <Text style={[s.paymentColBedingung, s.paymentHeaderText]}>Zahlungsbedingung</Text>
                <Text style={[s.paymentColFaellig, s.paymentHeaderText]}>Fällig am</Text>
                <Text style={[s.paymentColEur, s.paymentHeaderText]}>EUR</Text>
              </View>
              <View style={s.paymentTableRow}>
                <Text style={s.paymentColZahlbetrag} />
                <Text style={s.paymentColBasisdatum}>{format(invoiceDate, "dd.MM.yyyy", { locale: de })}</Text>
                <Text style={s.paymentColBedingung}>
                  {invoice.skonto_days} Tage {formatNumberDE(invoice.skonto_percent!, 2)} % Skonto
                </Text>
                <Text style={s.paymentColFaellig}>{format(dueDateSkonto, "dd.MM.yyyy", { locale: de })}</Text>
                <Text style={s.paymentColEur}>{formatNumberDE(totalWithSkonto, 2)}</Text>
              </View>
              <View style={s.paymentTableRowLast}>
                <Text style={s.paymentColZahlbetrag}>oder</Text>
                <Text style={s.paymentColBasisdatum}>{format(invoiceDate, "dd.MM.yyyy", { locale: de })}</Text>
                <Text style={s.paymentColBedingung}>
                  {invoice.payment_term_days || 14} Tage ohne Abzug
                </Text>
                <Text style={s.paymentColFaellig}>{format(dueDateFull, "dd.MM.yyyy", { locale: de })}</Text>
                <Text style={s.paymentColEur}>{formatNumberDE(invoice.total_amount || 0, 2)}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={s.paymentSection}>
            <View style={s.paymentTable}>
              <View style={s.paymentTableRowLast}>
                <Text style={[s.paymentColZahlbetrag, s.paymentHeaderText]}>Zahlungsziel:</Text>
                <Text style={s.paymentColBedingung}>{invoice.payment_term_days || 14} Tage</Text>
                <Text style={[s.paymentColFaellig, s.paymentHeaderText]}>Fällig am:</Text>
                <Text style={s.paymentColEur}>{format(dueDate, "dd.MM.yyyy", { locale: de })}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Hinweise unverändert im Fluss */}
        <View style={s.legalSection}>
          <Text style={s.legalNote}>
            Hinweis: Kleinunternehmer gem. § 6 Abs. 1 Z 27 UStG
          </Text>
          <Text style={s.legalNote}>
            Die gelieferten Waren bleiben bis zur vollständigen Begleichung des Gegenwertes uneingeschränktes Eigentum der Firma Plesnicar Solutions.
          </Text>
        </View>

        {/* Footer – fixed am unteren Seitenrand, gleiche Position auf jeder Seite */}
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

export default function InvoicePDF({ invoice, items, client, onClose, previewMode = false }: InvoicePDFProps) {
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function handleDownload() {
    setGenerating(true);
    try {
      const qrDataUrl = await getInvoiceQRDataUrl(
        invoice.total_amount ?? 0,
        invoice.invoice_number ?? ""
      );
      const doc = (
        <InvoicePDFDocument
          invoice={invoice}
          items={items}
          client={client}
          qrDataUrl={qrDataUrl}
        />
      );
      const asPdf = pdf(doc);
      const blob = await asPdf.toBlob();
      const url = URL.createObjectURL(blob);
      
      if (previewMode) {
        setPreviewUrl(url);
      } else {
        const link = document.createElement("a");
        link.href = url;
        link.download = `Rechnung_${invoice.invoice_number || "Draft"}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Fehler beim Generieren der PDF");
    } finally {
      setGenerating(false);
    }
  }

  // Auto-generate preview in preview mode
  useEffect(() => {
    if (previewMode && !previewUrl && !generating) {
      handleDownload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewMode, invoice, items]);

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-5xl bg-background border border-border rounded-lg shadow-xl p-6 m-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-foreground">
            {previewMode ? "PDF-Vorschau" : "Rechnung PDF"}
          </h2>
          <div className="flex gap-2">
            {!previewMode && (
              <Button
                onClick={handleDownload}
                disabled={generating}
                className="bg-primary text-primary-foreground hover:bg-red-700"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generiere...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    PDF herunterladen
                  </>
                )}
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              <X className="mr-2 h-4 w-4" />
              Schließen
            </Button>
          </div>
        </div>
        {previewMode ? (
          <div className="flex-1 overflow-auto border border-border rounded-lg bg-muted/50">
            {previewUrl ? (
              <iframe
                src={previewUrl}
                className="w-full h-full min-h-[600px]"
                title="PDF Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-[600px]">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">PDF wird generiert...</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Die PDF wird generiert. Klicken Sie auf "PDF herunterladen" um die Datei zu speichern.
          </div>
        )}
      </div>
    </div>
  );
}
