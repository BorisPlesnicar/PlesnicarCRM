"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Client, Invoice, InvoiceItem, Offer, OfferItem, OfferAddon } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Download, ArrowLeft, FileArchive } from "lucide-react";
import { useRouter } from "next/navigation";
import JSZip from "jszip";
import { pdf } from "@react-pdf/renderer";
import { getInvoiceQRDataUrl, InvoicePDFDocument } from "@/components/invoices/invoice-pdf";
import { OfferDocument } from "@/components/offers/offer-pdf";
import { calculateOffer } from "@/lib/calculations";

function safeFolderName(name: string, company: string): string {
  const part = [name, company].filter(Boolean).join("_");
  return part
    .replace(/[^\w\säöüÄÖÜß\-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 60);
}

function safePdfFileName(label: string): string {
  return (label || "Dokument").replace(/[/\\?%*:|"]/g, "_").trim();
}

export default function ExportPage() {
  const router = useRouter();
  const supabase = createClient();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const loadClients = useCallback(async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("name");
    if (error) {
      toast.error("Fehler beim Laden der Kunden");
      return;
    }
    setClients(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const filtered = clients.filter(
    (c) =>
      !search.trim() ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.company && c.company.toLowerCase().includes(search.toLowerCase())) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((c) => c.id)));
    }
  }

  async function runExport() {
    if (selectedIds.size === 0) {
      toast.error("Bitte mindestens einen Kunden auswählen");
      return;
    }
    setExporting(true);
    try {
      const clientIds = Array.from(selectedIds);
      const zip = new JSZip();
      const dateStr = new Date().toISOString().slice(0, 10);
      const rootName = `Kunden_Export_${dateStr}`;

      const [
        { data: clientsData },
        { data: offersData },
        { data: offerItemsData },
        { data: offerAddonsData },
        { data: invoicesData },
        { data: invoiceItemsData },
      ] = await Promise.all([
        supabase.from("clients").select("*").in("id", clientIds),
        supabase.from("offers").select("*").in("client_id", clientIds),
        supabase.from("offer_items").select("*"),
        supabase.from("offer_addons").select("*"),
        supabase.from("invoices").select("*").in("client_id", clientIds),
        supabase.from("invoice_items").select("*"),
      ]);

      const clientsList = clientsData || [];
      const offersList = offersData || [];
      const invoicesList = invoicesData || [];
      const offerIds = new Set((offersList as { id?: string }[]).map((o) => o.id).filter(Boolean));
      const invoiceIds = new Set((invoicesList as { id?: string }[]).map((i) => i.id).filter(Boolean));

      const offerItems = (offerItemsData || []).filter((item: { offer_id?: string }) => item.offer_id && offerIds.has(item.offer_id));
      const offerAddons = (offerAddonsData || []).filter((addon: { offer_id?: string }) => addon.offer_id && offerIds.has(addon.offer_id));
      const invoiceItems = (invoiceItemsData || []).filter((item: { invoice_id?: string }) => item.invoice_id && invoiceIds.has(item.invoice_id));

      function isMahnung(inv: { invoice_number?: string }) {
        return (inv.invoice_number || "").endsWith("-Mahnung");
      }

      for (const client of clientsList as Client[]) {
        const folder = safeFolderName(client.name, client.company || "");
        const cid = client.id;
        const clientOffers = offersList.filter((o: { client_id: string }) => o.client_id === cid);
        const clientInvoices = invoicesList.filter((i: { client_id: string }) => i.client_id === cid);
        const clientInvoiceIds = new Set(clientInvoices.map((i: { id?: string }) => i.id).filter(Boolean));
        const clientOfferIds = new Set(clientOffers.map((o: { id?: string }) => o.id).filter(Boolean));
        const clientOfferItems = offerItems.filter((item: { offer_id?: string }) => item.offer_id && clientOfferIds.has(item.offer_id));
        const clientOfferAddons = offerAddons.filter((addon: { offer_id?: string }) => addon.offer_id && clientOfferIds.has(addon.offer_id));
        const clientInvoiceItems = invoiceItems.filter((item: { invoice_id?: string }) => item.invoice_id && clientInvoiceIds.has(item.invoice_id));

        const normalInvoices = clientInvoices.filter((i) => !isMahnung(i));
        const mahnungInvoices = clientInvoices.filter((i) => isMahnung(i));

        const hasAnyPdf = clientOffers.length > 0 || normalInvoices.length > 0 || mahnungInvoices.length > 0;
        if (!hasAnyPdf) continue;

        // Rechnungs-PDFs (normale Rechnungen)
        for (const inv of normalInvoices as Invoice[]) {
          const items = clientInvoiceItems.filter((it: { invoice_id?: string }) => it.invoice_id === inv.id) as InvoiceItem[];
          const qrDataUrl = await getInvoiceQRDataUrl(inv.total_amount, inv.invoice_number);
          const doc = React.createElement(InvoicePDFDocument, {
            invoice: inv,
            items,
            client: client as Client,
            qrDataUrl,
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pdf() expects DocumentProps; our component renders Document
          const pdfBlob = await pdf(doc as any).toBlob();
          const safeNum = safePdfFileName(inv.invoice_number);
          zip.file(`${rootName}/${folder}/Rechnungen/Rechnung_${safeNum}.pdf`, pdfBlob);
        }

        // Mahnungs-PDFs
        for (const inv of mahnungInvoices as Invoice[]) {
          const items = clientInvoiceItems.filter((it: { invoice_id?: string }) => it.invoice_id === inv.id) as InvoiceItem[];
          const qrDataUrl = await getInvoiceQRDataUrl(inv.total_amount, inv.invoice_number);
          const doc = React.createElement(InvoicePDFDocument, {
            invoice: inv,
            items,
            client: client as Client,
            qrDataUrl,
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pdf() expects DocumentProps; our component renders Document
          const pdfBlob = await pdf(doc as any).toBlob();
          const safeNum = safePdfFileName(inv.invoice_number);
          zip.file(`${rootName}/${folder}/Mahnungen/Mahnung_${safeNum}.pdf`, pdfBlob);
        }

        // Angebots-PDFs
        const logoUrl = typeof window !== "undefined" ? `${window.location.origin}/LogoTEXTBLACK.png` : "";
        for (const offer of clientOffers as Offer[]) {
          const items = clientOfferItems.filter((it: { offer_id?: string }) => it.offer_id === offer.id) as OfferItem[];
          const addons = clientOfferAddons.filter((a: { offer_id?: string }) => a.offer_id === offer.id) as OfferAddon[];
          const calc = calculateOffer(
            items,
            offer.global_discount_percent ?? 0,
            offer.express_enabled ?? false,
            offer.express_surcharge_percent ?? 0,
            offer.hosting_setup_enabled ?? false,
            offer.hosting_setup_fee ?? 0,
            offer.maintenance_enabled ?? false,
            offer.maintenance_months ?? 0,
            offer.maintenance_monthly_fee ?? 0,
            offer.vat_percent ?? 20
          );
          const doc = React.createElement(OfferDocument, {
            offer,
            items,
            addons,
            client: client as Client,
            calc,
            logoUrl,
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pdf() expects DocumentProps; our component renders Document
          const pdfBlob = await pdf(doc as any).toBlob();
          const safeNum = safePdfFileName(offer.offer_number);
          zip.file(`${rootName}/${folder}/Angebote/Angebot_${safeNum}.pdf`, pdfBlob);
        }
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${rootName}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Export fertig: ${rootName}.zip`);
    } catch (err) {
      console.error(err);
      toast.error("Export fehlgeschlagen");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Export PDFs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kunden auswählen – ZIP enthält pro Kunde nur PDFs: Angebote, Rechnungen und Mahnungen (falls vorhanden)
          </p>
        </div>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileArchive className="h-5 w-5" />
            Kunden auswählen
          </CardTitle>
          <p className="text-sm text-muted-foreground font-normal">
            Der Export enthält pro Kunde: Stammdaten, Projekte, alle Angebote (mit Positionen), alle Rechnungen (mit Positionen) und zugehörige Buchhaltungs-Transaktionen (Einnahmen). Gesamtdateien liegen im ZIP-Root.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Input
                placeholder="Kunden suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-4"
              />
            </div>
            <Button variant="outline" onClick={selectAll}>
              {selectedIds.size === filtered.length ? "Keine auswählen" : "Alle auswählen"}
            </Button>
            <Button
              onClick={runExport}
              disabled={exporting || selectedIds.size === 0}
              className="bg-primary text-primary-foreground hover:bg-red-700"
            >
              {exporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Als ZIP exportieren
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="border border-border rounded-lg divide-y divide-border max-h-[60vh] overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  Keine Kunden gefunden
                </div>
              ) : (
                filtered.map((client) => (
                  <label
                    key={client.id}
                    className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(client.id)}
                      onChange={() => toggleSelection(client.id)}
                      className="h-4 w-4 rounded border-border"
                    />
                    <span className="font-medium">{client.name}</span>
                    {client.company && (
                      <span className="text-muted-foreground text-sm">({client.company})</span>
                    )}
                    {client.customer_number && (
                      <span className="text-muted-foreground text-xs ml-auto">{client.customer_number}</span>
                    )}
                  </label>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
