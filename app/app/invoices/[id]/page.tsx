"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Invoice, InvoiceItem, Client, INVOICE_STATUSES } from "@/lib/types";
import { formatCurrency } from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  Loader2,
  Pencil,
  FileText,
} from "lucide-react";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const InvoicePDF = dynamic(() => import("@/components/invoices/invoice-pdf"), {
  ssr: false,
});

const statusLabels: Record<string, string> = {
  draft: "Entwurf",
  sent: "Gesendet",
  paid: "Bezahlt",
  overdue: "Überfällig",
  cancelled: "Storniert",
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  sent: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  paid: "bg-green-500/10 text-green-400 border-green-500/20",
  overdue: "bg-red-500/10 text-red-400 border-red-500/20",
  cancelled: "bg-gray-500/10 text-gray-300 border-gray-500/20",
};

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPdf, setShowPdf] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    async function load() {
      const id = params.id as string;

      const [invoiceRes, itemsRes] = await Promise.all([
        supabase
          .from("invoices")
          .select("*, clients(*), projects(title), offers(offer_number)")
          .eq("id", id)
          .single(),
        supabase
          .from("invoice_items")
          .select("*")
          .eq("invoice_id", id)
          .order("position"),
      ]);

      if (invoiceRes.error) {
        toast.error("Rechnung nicht gefunden");
        router.push("/app/invoices");
        return;
      }

      setInvoice(invoiceRes.data);
      setItems(itemsRes.data || []);
      setClient(invoiceRes.data.clients as unknown as Client);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function updateStatus(newStatus: string) {
    if (!invoice) return;
    setUpdatingStatus(true);
    const { error } = await supabase
      .from("invoices")
      .update({ status: newStatus })
      .eq("id", invoice.id);
    if (error) {
      toast.error("Fehler", { description: error.message });
    } else {
      setInvoice({ ...invoice, status: newStatus as Invoice["status"] });
      toast.success("Status aktualisiert");
    }
    setUpdatingStatus(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice) return null;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/app/invoices")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-6 w-6" />
              {invoice.invoice_number}
            </h1>
            <p className="text-sm text-muted-foreground">
              {client?.name} {client?.company ? `(${client.company})` : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select
            value={invoice.status}
            onValueChange={updateStatus}
            disabled={updatingStatus}
          >
            <SelectTrigger className="w-40 bg-secondary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INVOICE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabels[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => router.push(`/app/invoices/${invoice.id}/edit`)}
            variant="outline"
            className="border-border"
          >
            <Pencil className="mr-2 h-4 w-4" />
            Bearbeiten
          </Button>
          <Button
            onClick={() => setShowPdf(true)}
            className="bg-primary text-primary-foreground hover:bg-red-700"
          >
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Rechnungsdatum</p>
            <p className="font-medium">
              {format(new Date(invoice.invoice_date), "dd.MM.yyyy", { locale: de })}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Fälligkeitsdatum</p>
            <p className="font-medium">
              {format(new Date(invoice.due_date), "dd.MM.yyyy", { locale: de })}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Status</p>
            <Badge variant="outline" className={statusColors[invoice.status]}>
              {statusLabels[invoice.status]}
            </Badge>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Rechnungsbetrag</p>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(invoice.total_amount)}
            </p>
            {invoice.is_partial_payment && (
              <p className="text-xs text-muted-foreground mt-1">
                Teilanzahlung von {formatCurrency(invoice.partial_payment_of_total || 0)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card className="border-border bg-card overflow-hidden">
        <CardHeader>
          <CardTitle>Positionen</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Pos.</TableHead>
                <TableHead>Bezeichnung</TableHead>
                <TableHead className="text-right">Anzahl</TableHead>
                <TableHead className="text-center">Einheit</TableHead>
                <TableHead className="text-right">Einheitspreis</TableHead>
                <TableHead className="text-center">Ust.</TableHead>
                <TableHead className="text-right">Rabatt</TableHead>
                <TableHead className="text-right">Gesamt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className="border-border">
                  <TableCell className="text-muted-foreground">{item.position}</TableCell>
                  <TableCell className="font-medium">{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity.toFixed(2)}</TableCell>
                  <TableCell className="text-center">{item.unit}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                  <TableCell className="text-center">{item.vat_percent}%</TableCell>
                  <TableCell className="text-right">
                    {item.discount_percent > 0 ? `${item.discount_percent}%` : "–"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Zusammenfassung</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-md space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Nettobetrag</span>
              <span>{formatCurrency(invoice.net_amount)}</span>
            </div>
            {invoice.vat_percent > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Umsatzsteuer ({invoice.vat_percent}%)
                </span>
                <span>+{formatCurrency(invoice.vat_amount)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-border" />
            <div className="flex justify-between text-lg font-bold">
              <span>Rechnungsbetrag</span>
              <span className="text-primary">{formatCurrency(invoice.total_amount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PDF Modal */}
      {showPdf && (
        <InvoicePDF
          invoice={invoice}
          items={items}
          client={client}
          onClose={() => setShowPdf(false)}
        />
      )}
    </div>
  );
}
