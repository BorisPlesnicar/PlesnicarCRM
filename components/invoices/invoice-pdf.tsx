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

const s = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 50,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#222",
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
    fontWeight: "bold",
    color: RED,
    marginBottom: 8,
  },
  logoContainer: {
    alignItems: "flex-end",
  },
  logo: {
    width: 120,
    height: 30,
    objectFit: "contain",
  },
  headerLine: {
    width: "100%",
    height: 2,
    backgroundColor: RED,
    marginBottom: 20,
  },
  // Sender/Invoice Info Row
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  senderInfo: {
    width: "45%",
  },
  invoiceInfo: {
    width: "45%",
    alignItems: "flex-end",
  },
  infoLabel: {
    fontSize: 9,
    color: "#666",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 8,
  },
  // Recipient
  recipient: {
    marginBottom: 25,
  },
  recipientLabel: {
    fontSize: 9,
    color: "#666",
    marginBottom: 4,
  },
  recipientName: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 2,
  },
  recipientAddress: {
    fontSize: 10,
    lineHeight: 1.4,
  },
  // Table
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: RED,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  tableHeaderText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  tableCell: {
    fontSize: 9,
    color: "#222",
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
    marginBottom: 20,
    width: "100%",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 200,
    marginBottom: 4,
    paddingRight: 10,
  },
  totalLabel: {
    fontSize: 10,
    color: "#666",
  },
  totalValue: {
    fontSize: 10,
    fontWeight: "bold",
  },
  totalFinal: {
    fontSize: 14,
    fontWeight: "bold",
    color: RED,
  },
  // Legal Note
  legalNote: {
    fontSize: 8,
    color: "#666",
    marginTop: 15,
    marginBottom: 20,
  },
  // Footer
  footerBar: {
    width: "100%",
    height: 3,
    backgroundColor: RED,
    marginBottom: 15,
    marginTop: 20,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#666",
  },
  footerColumn: {
    width: "30%",
  },
  footerTitle: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#222",
  },
  footerText: {
    fontSize: 8,
    lineHeight: 1.4,
    marginBottom: 2,
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
            <Image src="/LogoTEXTB.png" style={s.logo} />
          </View>
        </View>
        <View style={s.headerLine} />

        {/* Sender / Invoice Info Row */}
        <View style={s.infoRow}>
          <View style={s.senderInfo}>
            <Text style={s.infoValue}>Boris Plesnicar e.U</Text>
            <Text style={s.tableCell}>Hartriegelstraße 12</Text>
            <Text style={s.tableCell}>3550 Langenlois, Österreich</Text>
            <Text style={s.tableCell}>0664/4678382 / 0676/3206308</Text>
          </View>
          <View style={s.invoiceInfo}>
            <View>
              <Text style={s.infoLabel}>Rechnungsdatum:</Text>
              <Text style={s.infoValue}>{format(invoiceDate, "dd.MM.yyyy", { locale: de })}</Text>
            </View>
            <View>
              <Text style={s.infoLabel}>Rechnungsnummer:</Text>
              <Text style={s.infoValue}>{invoice.invoice_number}</Text>
            </View>
            <View>
              <Text style={s.infoLabel}>Kundennummer:</Text>
              <Text style={s.infoValue}>{invoice.customer_number || "–"}</Text>
            </View>
            <View>
              <Text style={s.infoLabel}>Zahlungsziel:</Text>
              <Text style={s.infoValue}>{invoice.payment_term_days} Tage</Text>
            </View>
            <View>
              <Text style={s.infoLabel}>Fälligkeitsdatum:</Text>
              <Text style={s.infoValue}>{format(dueDate, "dd.MM.yyyy", { locale: de })}</Text>
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
          {items.map((item) => (
            <View key={item.id || item.position} style={s.tableRow}>
              <Text style={[s.tableCell, s.colBezeichnung]}>{item.description}</Text>
              <Text style={[s.tableCell, s.colAnzahl]}>{item.quantity.toFixed(2)}</Text>
              <Text style={[s.tableCell, s.colEinheit]}>{item.unit}</Text>
              <Text style={[s.tableCell, s.colEinheitspreis]}>€ {item.unit_price.toFixed(2).replace(".", ",")}</Text>
              <Text style={[s.tableCell, s.colUst]}>{item.vat_percent.toFixed(0)}%</Text>
              <Text style={[s.tableCell, s.colRabatt]}>{item.discount_percent > 0 ? `${item.discount_percent.toFixed(2)}%` : "0,00%"}</Text>
              <Text style={[s.tableCell, s.colGesamt]}>{item.total.toFixed(2).replace(".", ",")} €</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={s.totals}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Nettobetrag:</Text>
            <Text style={s.totalValue}>{invoice.net_amount.toFixed(2).replace(".", ",")} €</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Umsatzsteuer:</Text>
            <Text style={s.totalValue}>{invoice.vat_amount.toFixed(2).replace(".", ",")} €</Text>
          </View>
          <View style={[s.totalRow, { marginTop: 8, borderTopWidth: 1, borderTopColor: "#ddd", paddingTop: 8 }]}>
            <Text style={s.totalLabel}>Rechnungsbetrag:</Text>
            <Text style={[s.totalValue, s.totalFinal]}>{invoice.total_amount.toFixed(2).replace(".", ",")} €</Text>
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
