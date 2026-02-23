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
import { Invoice, InvoiceItem, Client } from "@/lib/types";
import { formatCurrency } from "@/lib/calculations";
import { Button } from "@/components/ui/button";
import { Download, X, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

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
    paddingTop: 40,
    paddingBottom: 60,
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
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 700,
    color: RED,
    marginBottom: 8,
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
    marginBottom: 20,
  },
  // Sender/Invoice Info Row
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
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
    padding: 12,
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
  // Recipient
  recipient: {
    marginBottom: 20,
    paddingTop: 12,
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
    marginTop: 15,
    marginBottom: 18,
    fontStyle: "italic",
    lineHeight: 1.4,
  },
  // Footer
  footerBar: {
    width: "100%",
    height: 3,
    backgroundColor: RED,
    marginBottom: 15,
    marginTop: 18,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: "#666",
    paddingTop: 12,
  },
  footerColumn: {
    width: "30%",
  },
  footerTitle: {
    fontSize: 9.5,
    fontWeight: "bold",
    marginBottom: 6,
    color: "#1a1a1a",
    letterSpacing: 0.3,
  },
  footerText: {
    fontSize: 8,
    lineHeight: 1.5,
    marginBottom: 3,
    color: "#555",
  },
});

interface InvoicePDFProps {
  invoice: Invoice;
  items: InvoiceItem[];
  client: Client | null;
  onClose: () => void;
}

function InvoicePDFDocument({ invoice, items, client }: Omit<InvoicePDFProps, "onClose">) {
  const invoiceDate = invoice.invoice_date ? new Date(invoice.invoice_date) : new Date();
  const dueDate = invoice.due_date ? new Date(invoice.due_date) : new Date();

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
              <Text style={s.infoValue}>{invoice.invoice_number}</Text>
            </View>
            <View style={s.invoiceInfoRow}>
              <Text style={s.infoLabel}>Kundennummer:</Text>
              <Text style={s.infoValue}>{invoice.customer_number || "–"}</Text>
            </View>
            <View style={s.invoiceInfoRow}>
              <Text style={s.infoLabel}>Zahlungsziel:</Text>
              <Text style={s.infoValue}>{invoice.payment_term_days} Tage</Text>
            </View>
            <View style={s.invoiceInfoRowLast}>
              <Text style={s.infoLabel}>Fälligkeitsdatum:</Text>
              <Text style={s.infoValueBold}>{format(dueDate, "dd.MM.yyyy", { locale: de })}</Text>
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

        {/* Totals */}
        <View style={s.totals}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Nettobetrag:</Text>
            <Text style={s.totalValue}>{formatNumberDE(invoice.net_amount, 2)} €</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Umsatzsteuer:</Text>
            <Text style={s.totalValue}>{formatNumberDE(invoice.vat_amount, 2)} €</Text>
          </View>
          <View style={[s.totalRow, { marginTop: 10, borderTopWidth: 2, borderTopColor: "#ddd", paddingTop: 10 }]}>
            <Text style={[s.totalLabel, { fontSize: 10.5, fontWeight: 700 }]}>Rechnungsbetrag:</Text>
            <Text style={[s.totalValue, s.totalFinal]}>{formatNumberDE(invoice.total_amount, 2)} €</Text>
          </View>
        </View>

        {/* Legal Note */}
        <Text style={s.legalNote}>
          Hinweis: Kleinunternehmer gem. § 6 Abs. 1 Z 27 UStG
        </Text>

        {/* Footer */}
        <View style={s.footerBar} />
        <View style={s.footer}>
          <View style={s.footerColumn}>
            <Text style={s.footerTitle}>Boris Plesnicar e.U.</Text>
            <Text style={s.footerText}>Hartriegelstraße 12</Text>
            <Text style={s.footerText}>3550 Langenlois, Österreich</Text>
            <Text style={s.footerText}>Telefon: 0664/4678382 / 0676/3206308</Text>
            <Text style={s.footerText}>Kleinunternehmer</Text>
          </View>
          <View style={s.footerColumn}>
            <Text style={s.footerTitle}>Kontaktinformation</Text>
            <Text style={s.footerText}>Boris Plesnicar</Text>
            <Text style={s.footerText}>Email: plesnicaroffice@gmail.com</Text>
            <Text style={s.footerText}>www.plesnicarsolutions.at</Text>
          </View>
          <View style={s.footerColumn}>
            <Text style={s.footerTitle}>Bankverbindung</Text>
            <Text style={s.footerText}>Kontoname: Boris Plesnicar</Text>
            <Text style={s.footerText}>Geldinstitut: Raiba Langenlois</Text>
            <Text style={s.footerText}>IBAN: AT373242600000081968</Text>
            <Text style={s.footerText}>SWIFT/BIC: RLNWATWW426</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export default function InvoicePDF({ invoice, items, client, onClose }: InvoicePDFProps) {
  const [generating, setGenerating] = useState(false);

  async function handleDownload() {
    setGenerating(true);
    try {
      const doc = <InvoicePDFDocument invoice={invoice} items={items} client={client} />;
      const asPdf = pdf(doc);
      const blob = await asPdf.toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Rechnung_${invoice.invoice_number}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-4xl bg-background border border-border rounded-lg shadow-xl p-6 m-4 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-foreground">Rechnung PDF</h2>
          <div className="flex gap-2">
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
            <Button variant="outline" onClick={onClose}>
              <X className="mr-2 h-4 w-4" />
              Schließen
            </Button>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          Die PDF wird generiert. Klicken Sie auf "PDF herunterladen" um die Datei zu speichern.
        </div>
      </div>
    </div>
  );
}
