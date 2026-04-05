"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Invoice, InvoiceItem, Client, INVOICE_STATUSES } from "@/lib/types";
import { formatCurrency, amountDueAfterCredit } from "@/lib/calculations";
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
  Mail,
  CheckCircle2,
  AlertCircle,
  Send,
  Receipt,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import dynamic from "next/dynamic";
import { format, addDays } from "date-fns";
import { de } from "date-fns/locale";
import { useAuth } from "@/app/app/AuthProvider";

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
  const { canWrite, loading: authLoading } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPdf, setShowPdf] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [creatingReminder, setCreatingReminder] = useState(false);
  const [showRechargedDialog, setShowRechargedDialog] = useState(false);
  const [rechargedTargetRef, setRechargedTargetRef] = useState("");
  const [rechargedNote, setRechargedNote] = useState("");
  const [rechargedDate, setRechargedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [savingRecharged, setSavingRecharged] = useState(false);
  const [rechargedToInvoiceNumber, setRechargedToInvoiceNumber] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const id = params.id as string;

      const [invoiceRes, itemsRes] = await Promise.all([
        supabase
          .from("invoices")
          .select("*, clients(*), projects(title), offers(offer_number), recharged_to_invoice:invoices!recharged_to_invoice_id(invoice_number)")
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

      const inv = invoiceRes.data as Invoice;
      setInvoice(inv);
      setItems(itemsRes.data || []);
      setClient(inv.clients as unknown as Client);
      if (inv.recharged_to_invoice_ref) {
        setRechargedToInvoiceNumber(inv.recharged_to_invoice_ref);
      } else if (inv.recharged_to_invoice_id && inv.recharged_to_invoice?.invoice_number) {
        setRechargedToInvoiceNumber(inv.recharged_to_invoice.invoice_number);
      } else if (inv.recharged_to_invoice_id) {
        const { data: target } = await supabase
          .from("invoices")
          .select("invoice_number")
          .eq("id", inv.recharged_to_invoice_id)
          .single();
        setRechargedToInvoiceNumber(target?.invoice_number ?? null);
      } else {
        setRechargedToInvoiceNumber(null);
      }
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function updateStatus(newStatus: string) {
    if (!canWrite || !invoice) return;
    setUpdatingStatus(true);

    const paidDesc = `Rechnung ${invoice.invoice_number}`;

    try {
      const { error: invoiceError } = await supabase
        .from("invoices")
        .update({ status: newStatus })
        .eq("id", invoice.id);

      if (invoiceError) {
        toast.error("Fehler", { description: invoiceError.message });
        setUpdatingStatus(false);
        return;
      }

      if (invoice.status === "paid" && newStatus !== "paid") {
        const { error: deleteError } = await supabase
          .from("transactions")
          .delete()
          .eq("description", paidDesc)
          .eq("type", "income");
        if (deleteError) {
          console.error("Error deleting transaction:", deleteError);
        }
      }

      if (newStatus === "paid") {
        const { data: existingTransactions, error: checkError } = await supabase
          .from("transactions")
          .select("id")
          .eq("description", paidDesc)
          .eq("type", "income");

        if (checkError) {
          console.error("Error checking existing transactions:", checkError);
        }

        if (!existingTransactions || existingTransactions.length === 0) {
          const total = Number(invoice.total_amount ?? 0);
          const creditApplied = Math.max(0, Number(invoice.credit_applied_amount ?? 0));
          const cashReceived = amountDueAfterCredit(total, creditApplied);

          if (cashReceived > 0) {
            const noteBase = `Automatisch erstellt bei Bezahlung der Rechnung ${invoice.invoice_number}.`;
            const noteCredit =
              creditApplied > 0
                ? ` Rechnungsbetrag ${formatCurrency(total)}, davon ${formatCurrency(creditApplied)} per Kundenguthaben angerechnet — als Einnahme gebucht: ${formatCurrency(cashReceived)} (Zahlbetrag). Keine separate Ausgabe für das Guthaben buchen.`
                : "";

            const { error: transactionError } = await supabase
              .from("transactions")
              .insert({
                type: "income" as const,
                amount: cashReceived,
                description: paidDesc,
                category: "Rechnung",
                date: new Date().toISOString().split("T")[0],
                notes: noteBase + noteCredit,
                affects_bank_balance: true,
              })
              .select()
              .single();

            if (transactionError) {
              console.error("Transaction creation error:", transactionError);
              toast.error("Rechnung als bezahlt markiert, aber Transaktion konnte nicht erstellt werden", {
                description: transactionError.message,
              });
            } else {
              toast.success(
                creditApplied > 0
                  ? "Bezahlt markiert — Einnahme entspricht dem Zahlbetrag (nach Guthaben)"
                  : "Rechnung als bezahlt markiert und Einnahme erstellt"
              );
            }
          } else if (creditApplied > 0) {
            toast.success(
              "Rechnung als bezahlt markiert. Vollständig per Kundenguthaben beglichen — keine Einnahme-Transaktion (kein Geldeingang)."
            );
          } else {
            toast.success("Rechnung als bezahlt markiert");
          }
        } else {
          toast.success("Status aktualisiert (Transaktion existiert bereits)");
        }
      } else if (invoice.status === "paid" && newStatus !== "paid") {
        toast.success("Status aktualisiert — zugehörige Bank-Einnahme entfernt");
      } else {
        toast.success("Status aktualisiert");
      }

      setInvoice({ ...invoice, status: newStatus as Invoice["status"] });
    } catch (error) {
      console.error("Unexpected error in updateStatus:", error);
      toast.error("Unerwarteter Fehler beim Aktualisieren des Status");
    } finally {
      setUpdatingStatus(false);
    }
  }

  function openRechargedDialog() {
    setShowRechargedDialog(true);
    setRechargedTargetRef(
      invoice?.recharged_to_invoice_ref ?? invoice?.recharged_to_invoice?.invoice_number ?? ""
    );
    setRechargedNote(invoice?.recharged_note ?? "");
    setRechargedDate(
      invoice?.recharged_at ? format(new Date(invoice.recharged_at), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")
    );
  }

  async function saveRecharged() {
    if (!invoice || !canWrite) return;
    if (!rechargedTargetRef.trim()) {
      toast.error("Bitte geben Sie die Rechnung ein, von der weiterverrechnet wurde.");
      return;
    }
    setSavingRecharged(true);
    const at = rechargedDate ? new Date(rechargedDate).toISOString() : new Date().toISOString();
    const refText = rechargedTargetRef.trim();
    const { error } = await supabase
      .from("invoices")
      .update({
        recharged_to_invoice_id: null,
        recharged_to_invoice_ref: refText,
        recharged_at: at,
        recharged_note: rechargedNote.trim() || null,
      })
      .eq("id", invoice.id);
    if (error) {
      toast.error("Fehler beim Speichern", { description: error.message });
      setSavingRecharged(false);
      return;
    }
    setRechargedToInvoiceNumber(refText);
    setInvoice({
      ...invoice,
      recharged_to_invoice_id: null,
      recharged_to_invoice_ref: refText,
      recharged_at: at,
      recharged_note: rechargedNote.trim() || null,
      recharged_to_invoice: { invoice_number: refText },
    });
    setShowRechargedDialog(false);
    setSavingRecharged(false);
    toast.success("Weiterverrechnet gespeichert");
  }

  if (loading || authLoading) {
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
              {invoice.invoice_type && (
                <Badge variant="outline" className={invoice.invoice_type === "bau" ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"}>
                  {invoice.invoice_type === "bau" ? "BAU" : "IT"}
                </Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">
              {client?.name} {client?.company ? `(${client.company})` : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select
            value={invoice.status}
            onValueChange={canWrite ? updateStatus : () => {}}
            disabled={updatingStatus || !canWrite}
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
          {canWrite && (
            <Button
              onClick={() => router.push(`/app/invoices/${invoice.id}/edit`)}
              variant="outline"
              className="border-border"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Bearbeiten
            </Button>
          )}
          {client?.email && (
            <Button
              variant="outline"
              onClick={() => {
                const subject = encodeURIComponent(
                  `Rechnung ${invoice.invoice_number}`
                );
                const body = encodeURIComponent(
                  `Sehr geehrte Damen und Herren,\n\nanbei erhalten Sie die Rechnung ${invoice.invoice_number}.\n\nMit freundlichen Grüßen`
                );
                window.location.href = `mailto:${client.email}?subject=${subject}&body=${body}`;
              }}
              className="border-border"
            >
              <Mail className="mr-2 h-4 w-4" />
              E-Mail
            </Button>
          )}
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
            {Number(invoice.credit_applied_amount ?? 0) > 0 && (
              <div className="mt-2 space-y-1 text-sm">
                <p className="text-emerald-600/90 dark:text-emerald-400/90">
                  Guthaben angerechnet: −{formatCurrency(Number(invoice.credit_applied_amount))}
                </p>
                <p className="font-semibold text-foreground">
                  Zu zahlen: {formatCurrency(amountDueAfterCredit(invoice.total_amount, Number(invoice.credit_applied_amount)))}
                </p>
              </div>
            )}
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
              {items.map((item) =>
                invoice.invoice_type === "bau" && item.row_kind === "text_block" ? (
                  <TableRow key={item.id} className="border-border bg-orange-500/5">
                    <TableCell colSpan={8} className="py-3">
                      <p className="text-xs font-medium text-orange-400/90 mb-1">Abschnittstext</p>
                      <p className="text-sm whitespace-pre-wrap text-foreground">{item.description}</p>
                    </TableCell>
                  </TableRow>
                ) : (
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
                )
              )}
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
            {Number(invoice.credit_applied_amount ?? 0) > 0 && (
              <div className="flex justify-between text-base font-bold pt-1 border-t border-border">
                <span>Zu zahlen</span>
                <span className="text-primary">
                  {formatCurrency(
                    amountDueAfterCredit(invoice.total_amount, Number(invoice.credit_applied_amount))
                  )}
                </span>
              </div>
            )}
            {invoice.show_balance_line === true &&
              invoice.balance_line_amount != null &&
              Number.isFinite(Number(invoice.balance_line_amount)) && (
                <div className="mt-4 rounded-2xl border border-red-500/25 border-l-4 border-l-primary bg-primary/5 px-4 py-3 backdrop-blur-sm">
                  <p className="text-sm font-semibold text-foreground">Ihr restliches Guthaben beträgt:</p>
                  <p className="mt-1 text-xl font-bold tabular-nums tracking-tight text-primary">
                    {formatCurrency(Number(invoice.balance_line_amount))}
                  </p>
                </div>
              )}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Historie</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Created */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="rounded-full bg-primary/10 p-2">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="w-0.5 h-full bg-border mt-2" />
              </div>
              <div className="flex-1 pb-4">
                <div className="font-medium text-sm">Rechnung erstellt</div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(invoice.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
                </div>
              </div>
            </div>

            {/* Status changes */}
            {invoice.status !== "draft" && (
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="rounded-full bg-yellow-500/10 p-2">
                    <Send className="h-4 w-4 text-yellow-400" />
                  </div>
                  <div className="w-0.5 h-full bg-border mt-2" />
                </div>
                <div className="flex-1 pb-4">
                  <div className="font-medium text-sm">Status: {statusLabels[invoice.status]}</div>
                  <div className="text-xs text-muted-foreground">
                    {invoice.updated_at !== invoice.created_at
                      ? format(new Date(invoice.updated_at), "dd.MM.yyyy HH:mm", { locale: de })
                      : format(new Date(invoice.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
                  </div>
                </div>
              </div>
            )}

            {/* Paid status */}
            {invoice.status === "paid" && (
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="rounded-full bg-green-500/10 p-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  </div>
                  <div className="w-0.5 h-full bg-border mt-2" />
                </div>
                <div className="flex-1 pb-4">
                  <div className="font-medium text-sm">Rechnung bezahlt</div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(invoice.updated_at), "dd.MM.yyyy HH:mm", { locale: de })}
                  </div>
                </div>
              </div>
            )}

            {/* Weiterverrechnet */}
            {(invoice.recharged_to_invoice_id || invoice.recharged_to_invoice_ref) && (
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="rounded-full bg-blue-500/10 p-2">
                    <Receipt className="h-4 w-4 text-blue-400" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">
                    Weiterverrechnet von Rechnung {rechargedToInvoiceNumber ?? invoice.recharged_to_invoice_ref ?? invoice.recharged_to_invoice?.invoice_number ?? "–"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {invoice.recharged_at
                      ? format(new Date(invoice.recharged_at), "dd.MM.yyyy", { locale: de })
                      : "–"}
                    {invoice.recharged_note && (
                      <span className="block mt-1 text-muted-foreground">{invoice.recharged_note}</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Aktionen</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {invoice.status !== "paid" && canWrite && (
            <Button
              onClick={() => updateStatus("paid")}
              disabled={updatingStatus}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Als bezahlt markieren
            </Button>
          )}
          {canWrite && (
            <Button
              variant="outline"
              className="border-blue-500/20 text-blue-400 hover:bg-blue-500/10"
              onClick={openRechargedDialog}
            >
              <Receipt className="mr-2 h-4 w-4" />
              Weiterverrechnet
            </Button>
          )}
          {(invoice.status === "sent" || invoice.status === "overdue") && canWrite && (
            <Button
              onClick={async () => {
                setCreatingReminder(true);
                try {
                  // Create reminder invoice
                  const reminderNumber = `${invoice.invoice_number}-Mahnung`;
                  const { data: reminderInvoice, error: reminderError } = await supabase
                    .from("invoices")
                    .insert({
                      client_id: invoice.client_id,
                      project_id: invoice.project_id,
                      offer_id: invoice.offer_id,
                      invoice_number: reminderNumber,
                      invoice_date: new Date().toISOString().split("T")[0],
                      due_date: addDays(new Date(), 7).toISOString().split("T")[0],
                      payment_term_days: 7,
                      customer_number: invoice.customer_number,
                      invoice_type: invoice.invoice_type || "it",
                      net_amount: invoice.net_amount,
                      vat_amount: invoice.vat_amount,
                      total_amount: invoice.total_amount,
                      vat_percent: invoice.vat_percent,
                      is_partial_payment: false,
                      partial_payment_of_total: null,
                      show_discount_column: invoice.show_discount_column !== false,
                      show_balance_line: invoice.show_balance_line === true,
                      balance_line_amount: invoice.balance_line_amount ?? null,
                      credit_applied_amount: 0,
                      status: "draft",
                      notes: `Mahnung für Rechnung ${invoice.invoice_number}`,
                    })
                    .select()
                    .single();

                  if (reminderError) {
                    toast.error("Fehler beim Erstellen der Mahnung", {
                      description: reminderError.message,
                    });
                  } else {
                    // Copy items
                    const { error: itemsError } = await supabase
                      .from("invoice_items")
                      .insert(
                        items.map((item) => ({
                          invoice_id: reminderInvoice.id,
                          position: item.position,
                          row_kind: item.row_kind ?? "position",
                          description: item.description,
                          quantity: item.quantity,
                          unit: item.unit,
                          unit_price: item.unit_price,
                          vat_percent: item.vat_percent,
                          discount_percent: item.discount_percent,
                          total: item.total,
                        }))
                      );

                    if (itemsError) {
                      toast.error("Mahnung erstellt, aber Positionen konnten nicht kopiert werden");
                    } else {
                      toast.success("Mahnung erstellt");
                      router.push(`/app/invoices/${reminderInvoice.id}`);
                    }
                  }
                } catch (error) {
                  toast.error("Fehler beim Erstellen der Mahnung");
                } finally {
                  setCreatingReminder(false);
                }
              }}
              disabled={creatingReminder}
              variant="outline"
              className="border-orange-500/20 text-orange-400 hover:bg-orange-500/10"
            >
              <AlertCircle className="mr-2 h-4 w-4" />
              {creatingReminder ? "Erstelle..." : "Mahnung erzeugen"}
            </Button>
          )}
          {!canWrite && (
            <p className="text-xs text-muted-foreground">
              Sie sind als View Moderator angemeldet. Aktionen stehen nur Benutzern mit Schreibrechten zur Verfügung.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Weiterverrechnet Dialog */}
      <Dialog open={showRechargedDialog} onOpenChange={setShowRechargedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Weiterverrechnet</DialogTitle>
            <DialogDescription>
              Diese Rechnung wurde von einer anderen Rechnung weiterverrechnet. Geben Sie die Quellrechnung ein (z. B.
              Rechnungsnummer) und optional Datum sowie Notiz.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Rechnung, von der weiterverrechnet wurde *</Label>
              <Input
                value={rechargedTargetRef}
                onChange={(e) => setRechargedTargetRef(e.target.value)}
                placeholder="z.B. Rechnungsnummer oder Bezeichnung"
              />
            </div>
            <div className="space-y-2">
              <Label>Datum</Label>
              <Input
                type="date"
                value={rechargedDate}
                onChange={(e) => setRechargedDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Notiz (optional)</Label>
              <Input
                value={rechargedNote}
                onChange={(e) => setRechargedNote(e.target.value)}
                placeholder="z.B. Teilbetrag, Position X–Y"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRechargedDialog(false)}>
              Abbrechen
            </Button>
            <Button onClick={saveRecharged} disabled={savingRecharged}>
              {savingRecharged ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
