"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Client, Project, Offer, OfferItem, Invoice } from "@/lib/types";
import {
  formatCurrency,
  parseGermanAmount,
  computeBauCreditApplied,
  amountDueAfterCredit,
  balanceLineAmountAfterBauCredit,
  balanceLineDisplay,
} from "@/lib/calculations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  type BauFormRow,
  bauRowsToCalcLineItems,
  bauRowsToPreviewPdfItems,
  bauRowsHaveBillablePosition,
  buildBauInvoiceItemRows,
  defaultBauPositionRow,
  nextRowId,
} from "@/lib/bau-invoice-rows";
import { offerItemsToFormRows } from "@/lib/bau-offer-rows";
import { DocumentLineEditor, IntroTextCard } from "@/components/documents/document-line-editor";
import { useAuth } from "@/app/app/AuthProvider";
import { Loader2, ArrowLeft, Save, Eye } from "lucide-react";
import { addDays, format } from "date-fns";
import dynamic from "next/dynamic";

const InvoicePDF = dynamic(() => import("@/components/invoices/invoice-pdf"), {
  ssr: false,
});

export default function NewInvoicePage() {
  const router = useRouter();
  const supabase = createClient();
  const { canWrite, loading: authLoading } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Form state
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [offerId, setOfferId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [paymentTermDays, setPaymentTermDays] = useState(14);
  const [skontoDays, setSkontoDays] = useState<number | null>(null);
  const [skontoPercent, setSkontoPercent] = useState<number | null>(null);
  const [showDiscountColumn, setShowDiscountColumn] = useState(true);
  const [showBalanceLine, setShowBalanceLine] = useState(false);
  const [balanceLineAmount, setBalanceLineAmount] = useState("");
  const [customerNumber, setCustomerNumber] = useState("");
  const [vatPercent, setVatPercent] = useState(20);
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [partialPaymentOfTotal, setPartialPaymentOfTotal] = useState("");
  const [invoiceType, setInvoiceType] = useState<"it" | "bau">("it");
  const [introText, setIntroText] = useState("");
  const [applyBauCredit, setApplyBauCredit] = useState(false);

  // Positionen – gleiche Struktur für IT und BAU
  const [rows, setRows] = useState<BauFormRow[]>([defaultBauPositionRow(nextRowId())]);

  const calcLineItems = useMemo(() => bauRowsToCalcLineItems(rows), [rows]);

  const calc = useMemo(() => {
    const netAmount = calcLineItems.reduce((sum, item) => sum + item.total, 0);
    const vatAmount = netAmount * (vatPercent / 100);
    return { netAmount, vatAmount, totalAmount: netAmount + vatAmount };
  }, [calcLineItems, vatPercent]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === clientId) ?? null,
    [clients, clientId]
  );

  const bauCreditAppliedPreview = useMemo(
    () =>
      applyBauCredit
        ? computeBauCreditApplied(
            invoiceType,
            selectedClient?.client_type,
            Number(selectedClient?.credit_balance ?? 0),
            calc.totalAmount,
            0
          )
        : 0,
    [applyBauCredit, invoiceType, selectedClient, calc.totalAmount]
  );

  // Draft für die PDF-Vorschau
  const draftInvoice = useMemo((): Partial<Invoice> => {
    const dueDate = addDays(new Date(invoiceDate), paymentTermDays);

    return {
      id: "draft",
      invoice_number: invoiceNumber || "DRAFT",
      invoice_date: invoiceDate,
      due_date: format(dueDate, "yyyy-MM-dd"),
      payment_term_days: paymentTermDays,
      skonto_days: skontoDays ?? null,
      skonto_percent: skontoPercent ?? null,
      show_discount_column: showDiscountColumn,
      show_balance_line: showBalanceLine,
      balance_line_amount: showBalanceLine
        ? invoiceType === "bau" && selectedClient?.client_type === "bau"
          ? balanceLineAmountAfterBauCredit({
              clientCreditBalance: Number(selectedClient?.credit_balance ?? 0),
              creditAppliedOnInvoice: bauCreditAppliedPreview,
              creditPreviouslyAppliedOnSameInvoice: 0,
              invoiceTotal: calc.totalAmount,
            })
          : parseGermanAmount(balanceLineAmount)
        : null,
      customer_number: customerNumber || null,
      invoice_type: invoiceType,
      apply_bau_credit: invoiceType === "bau" ? applyBauCredit : false,
      intro_text: introText.trim() || null,
      net_amount: calc.netAmount,
      vat_amount: calc.vatAmount,
      total_amount: calc.totalAmount,
      credit_applied_amount: bauCreditAppliedPreview,
      vat_percent: vatPercent,
      is_partial_payment: isPartialPayment,
      partial_payment_of_total:
        isPartialPayment && partialPaymentOfTotal ? parseFloat(partialPaymentOfTotal) : null,
      status: "draft",
      currency: "EUR",
      client_id: clientId,
      project_id: projectId && projectId !== "none" ? projectId : null,
      offer_id: offerId && offerId !== "none" ? offerId : null,
    } as Partial<Invoice>;
  }, [
    clientId,
    invoiceNumber,
    invoiceDate,
    paymentTermDays,
    skontoDays,
    skontoPercent,
    showDiscountColumn,
    showBalanceLine,
    balanceLineAmount,
    customerNumber,
    invoiceType,
    introText,
    applyBauCredit,
    calc,
    vatPercent,
    isPartialPayment,
    partialPaymentOfTotal,
    projectId,
    offerId,
    bauCreditAppliedPreview,
    selectedClient,
  ]);

  const previewItems = useMemo(
    () => bauRowsToPreviewPdfItems(rows, vatPercent),
    [rows, vatPercent]
  );

  useEffect(() => {
    async function load() {
      const [clientsRes, projectsRes, offersRes] = await Promise.all([
        supabase.from("clients").select("*").order("name"),
        supabase.from("projects").select("*").order("title"),
        supabase
          .from("offers")
          .select("*")
          .eq("status", "accepted")
          .order("created_at", { ascending: false }),
      ]);
      setClients(clientsRes.data || []);
      setProjects(projectsRes.data || []);
      setOffers(offersRes.data || []);

      // Nächste Rechnungsnummer im Format BP-2248-XX
      const { data: existingInvoices } = await supabase
        .from("invoices")
        .select("invoice_number")
        .like("invoice_number", "BP-2248-%");

      let nextSuffix = 2;
      if (existingInvoices && existingInvoices.length > 0) {
        const suffixes = existingInvoices
          .map((inv: { invoice_number: string }) => {
            const match = inv.invoice_number.match(/BP-2248-(\d+)/);
            return match ? parseInt(match[1], 10) : 0;
          })
          .filter((n: number) => n > 0);
        nextSuffix = suffixes.length > 0 ? Math.max(...suffixes) + 1 : 2;
      }
      setInvoiceNumber(`BP-2248-${String(nextSuffix).padStart(2, "0")}`);

      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (clientId) {
      const client = clients.find((c) => c.id === clientId);
      if (client?.customer_number) setCustomerNumber(client.customer_number);
    }
  }, [clientId, clients]);

  function loadFromOffer() {
    if (!offerId || offerId === "none") return;
    const offer = offers.find((o) => o.id === offerId);
    if (!offer) return;

    const offerType = (offer.offer_type as "it" | "bau") || "it";
    setInvoiceType(offerType);

    supabase
      .from("offer_items")
      .select("*")
      .eq("offer_id", offerId)
      .order("position")
      .then(({ data }: { data: OfferItem[] | null }) => {
        if (data && data.length > 0) {
          setRows(offerItemsToFormRows(data as OfferItem[], offerType));
          setVatPercent(offer.vat_percent || 0);
          if (offer.project_scope_short?.trim()) {
            setIntroText(offer.project_scope_short.trim());
          }
          toast.success("Positionen vom Angebot übernommen");
        }
      });
  }

  async function handleSave() {
    if (!clientId) {
      toast.error("Bitte wählen Sie einen Kunden");
      return;
    }
    if (!bauRowsHaveBillablePosition(rows)) {
      toast.error("Bitte fügen Sie mindestens eine Position mit Beschreibung und Preis hinzu");
      return;
    }

    setSaving(true);

    const { data: clientRow, error: clientErr } = await supabase
      .from("clients")
      .select("client_type, credit_balance")
      .eq("id", clientId)
      .single();

    if (clientErr || !clientRow) {
      toast.error("Kunde konnte nicht geladen werden", { description: clientErr?.message });
      setSaving(false);
      return;
    }

    const creditApplied = applyBauCredit
      ? computeBauCreditApplied(
          invoiceType,
          (clientRow.client_type as "it" | "bau") || "it",
          Number(clientRow.credit_balance ?? 0),
          calc.totalAmount,
          0
        )
      : 0;

    const dueDate = addDays(new Date(invoiceDate), paymentTermDays);

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        client_id: clientId,
        // "none" oder leerer String müssen NULL werden, sonst parst Postgres 'none' als UUID.
        project_id: !projectId || projectId === "none" ? null : projectId,
        offer_id: !offerId || offerId === "none" ? null : offerId,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        due_date: format(dueDate, "yyyy-MM-dd"),
        payment_term_days: paymentTermDays,
        skonto_days: skontoDays ?? null,
        skonto_percent: skontoPercent ?? null,
        show_discount_column: showDiscountColumn,
        show_balance_line: showBalanceLine,
        balance_line_amount: showBalanceLine
          ? invoiceType === "bau" && (clientRow.client_type as string) === "bau"
            ? balanceLineAmountAfterBauCredit({
                clientCreditBalance: Number(clientRow.credit_balance ?? 0),
                creditAppliedOnInvoice: creditApplied,
                creditPreviouslyAppliedOnSameInvoice: 0,
                invoiceTotal: calc.totalAmount,
              })
            : parseGermanAmount(balanceLineAmount)
          : null,
        customer_number: customerNumber || null,
        invoice_type: invoiceType,
        apply_bau_credit: invoiceType === "bau" ? applyBauCredit : false,
        intro_text: introText.trim() || null,
        net_amount: calc.netAmount,
        vat_amount: calc.vatAmount,
        total_amount: calc.totalAmount,
        credit_applied_amount: creditApplied,
        vat_percent: vatPercent,
        is_partial_payment: isPartialPayment,
        partial_payment_of_total:
          isPartialPayment && partialPaymentOfTotal ? parseFloat(partialPaymentOfTotal) : null,
        status: "draft",
      })
      .select()
      .single();

    if (invoiceError) {
      toast.error("Fehler beim Speichern", { description: invoiceError.message });
      setSaving(false);
      return;
    }

    const built = buildBauInvoiceItemRows(rows, vatPercent);
    if (!built.some((r) => r.row_kind === "position")) {
      await supabase.from("invoices").delete().eq("id", invoice.id);
      toast.error("Mindestens eine gültige Leistungszeile erforderlich");
      setSaving(false);
      return;
    }

    const { error: itemsError } = await supabase
      .from("invoice_items")
      .insert(built.map((row) => ({ invoice_id: invoice.id, ...row })));
    if (itemsError) {
      await supabase.from("invoices").delete().eq("id", invoice.id);
      toast.error("Fehler bei Positionen", { description: itemsError.message });
      setSaving(false);
      return;
    }

    if (creditApplied > 0) {
      const { error: balErr } = await supabase
        .from("clients")
        .update({ credit_balance: Number(clientRow.credit_balance ?? 0) - creditApplied })
        .eq("id", clientId);
      if (balErr) {
        toast.error("Rechnung erstellt, Guthaben nicht gebucht", { description: balErr.message });
      }
    }

    toast.success("Rechnung erstellt");
    router.push(`/app/invoices/${invoice.id}`);
  }

  const filteredProjects = projectId
    ? projects
    : clientId
      ? projects.filter((p) => p.client_id === clientId)
      : projects;

  const filteredOffers = offerId
    ? offers
    : clientId
      ? offers.filter((o) => o.client_id === clientId)
      : offers;

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const canPreviewPdf = !!clientId && bauRowsHaveBillablePosition(rows);

  if (!canWrite) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push("/app/invoices")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück
        </Button>
        <div className="rounded-2xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700 backdrop-blur-md">
          <p className="font-semibold mb-1">Nur Lesezugriff</p>
          <p>
            Sie sind als View Moderator angemeldet. Das Erstellen neuer Rechnungen ist in diesem
            Modus nicht erlaubt.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/app/invoices")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Neue Rechnung</h1>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              if (!clientId) {
                toast.error("Bitte wählen Sie einen Kunden für die Vorschau");
                return;
              }
              if (!canPreviewPdf) {
                toast.error("Bitte fügen Sie mindestens eine Position hinzu");
                return;
              }
              setShowPreview(true);
            }}
            variant="outline"
            className="rounded-xl"
            disabled={!canPreviewPdf}
          >
            <Eye className="mr-2 h-4 w-4" />
            Vorschau
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-primary-foreground hover:bg-red-700 rounded-xl"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Speichere...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Speichern
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Rechnungsart – identische Logik, nur Bezeichnung IT / BAU */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-xl rounded-2xl">
        <CardContent className="pt-6">
          <Tabs value={invoiceType} onValueChange={(v) => setInvoiceType(v as "it" | "bau")}>
            <TabsList className="grid w-full grid-cols-2 rounded-xl">
              <TabsTrigger value="it" className="rounded-lg">
                IT Rechnung
              </TabsTrigger>
              <TabsTrigger value="bau" className="rounded-lg">
                BAU Rechnung
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Stammdaten */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-xl rounded-2xl">
            <CardHeader>
              <CardTitle>Rechnungsinformationen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Kunde *</Label>
                  <Select value={clientId} onValueChange={setClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kunde wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} {c.company ? `(${c.company})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Projekt (optional)</Label>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Projekt wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Kein Projekt</SelectItem>
                      {filteredProjects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Angebot (optional)</Label>
                  <div className="flex gap-2">
                    <Select value={offerId} onValueChange={setOfferId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Angebot wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Kein Angebot</SelectItem>
                        {filteredOffers.map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.offer_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {offerId && offerId !== "none" && (
                      <Button variant="outline" className="rounded-xl" onClick={loadFromOffer}>
                        Übernehmen
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Rechnungsnummer</Label>
                  <Input
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rechnungsdatum</Label>
                  <Input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kundennummer (optional)</Label>
                  <Input
                    value={customerNumber}
                    onChange={(e) => setCustomerNumber(e.target.value)}
                  />
                </div>
              </div>

              {selectedClient?.client_type === "bau" &&
                invoiceType === "bau" &&
                (selectedClient.credit_balance ?? 0) > 0 && (
                  <div className="rounded-2xl border border-border/60 bg-muted/10 px-4 py-3 backdrop-blur-md">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          Kundenguthaben anrechnen
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                          Standard ist aus: normale Rechnung → Bank-Einnahme. Nur aktivieren, wenn
                          wirklich per Guthaben verrechnet wurde.
                        </p>
                      </div>
                      <Switch checked={applyBauCredit} onCheckedChange={setApplyBauCredit} />
                    </div>
                  </div>
                )}
              {selectedClient?.client_type === "bau" &&
                invoiceType === "bau" &&
                applyBauCredit &&
                bauCreditAppliedPreview > 0 && (
                  <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm backdrop-blur-md">
                    <p className="font-medium text-emerald-200">
                      Kundenguthaben wird angerechnet: {formatCurrency(bauCreditAppliedPreview)}
                    </p>
                    <p className="text-muted-foreground mt-1">
                      Verfügbar: {formatCurrency(selectedClient.credit_balance ?? 0)} · Zu zahlen:{" "}
                      {formatCurrency(amountDueAfterCredit(calc.totalAmount, bauCreditAppliedPreview))}
                    </p>
                  </div>
                )}
              {selectedClient?.client_type === "bau" &&
                invoiceType === "bau" &&
                bauCreditAppliedPreview === 0 &&
                (selectedClient.credit_balance ?? 0) === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Bau-Kunde ohne Guthaben – der volle Rechnungsbetrag ist fällig.
                  </p>
                )}
              {selectedClient?.client_type === "bau" &&
                invoiceType === "bau" &&
                bauCreditAppliedPreview === 0 &&
                (selectedClient.credit_balance ?? 0) < 0 && (
                  <p className="text-xs text-red-400">
                    Offene Schuld: {formatCurrency(Math.abs(selectedClient.credit_balance ?? 0))} –
                    der volle Rechnungsbetrag ist zusätzlich fällig.
                  </p>
                )}
              {selectedClient?.client_type === "bau" && invoiceType === "it" && (
                <p className="text-xs text-muted-foreground">
                  Kundenguthaben wird nur bei{" "}
                  <strong className="text-foreground">BAU-Rechnungen</strong> automatisch
                  angerechnet.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Einleitungstext + Positionen – identisch für IT und BAU */}
          <IntroTextCard
            value={introText}
            onChange={setIntroText}
            hint="Optionaler Einleitungstext, der auf der Rechnung über der Positionstabelle erscheint."
          />
          <DocumentLineEditor rows={rows} onRowsChange={setRows} />

          {/* Zahlungsbedingungen & PDF-Optionen */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-xl rounded-2xl">
            <CardHeader>
              <CardTitle>Zahlung & PDF-Optionen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Zahlungsziel mit Skonto (Tage)</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="z.B. 10 (leer = kein Skonto)"
                    value={skontoDays ?? ""}
                    onChange={(e) =>
                      setSkontoDays(
                        e.target.value === "" ? null : parseInt(e.target.value, 10) || null
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Skonto (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="z.B. 3 (leer = kein Skonto)"
                    value={skontoPercent ?? ""}
                    onChange={(e) =>
                      setSkontoPercent(
                        e.target.value === "" ? null : parseFloat(e.target.value) || null
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Zahlungsziel ohne Skonto (Tage)</Label>
                  <Input
                    type="number"
                    value={paymentTermDays}
                    onChange={(e) => setPaymentTermDays(parseInt(e.target.value) || 14)}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="show-discount"
                  checked={showDiscountColumn}
                  onCheckedChange={setShowDiscountColumn}
                />
                <Label htmlFor="show-discount" className="font-normal cursor-pointer">
                  Rabattspalte in PDF anzeigen
                </Label>
              </div>

              <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4 backdrop-blur-md">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-balance-line"
                    checked={showBalanceLine}
                    onCheckedChange={setShowBalanceLine}
                  />
                  <Label htmlFor="show-balance-line" className="font-normal cursor-pointer">
                    Guthaben-/Forderungs-Hinweis in PDF
                  </Label>
                </div>
                {showBalanceLine &&
                  (invoiceType === "bau" && selectedClient?.client_type === "bau" ? (
                    <div className="space-y-2 max-w-md rounded-xl border border-border/50 bg-background/40 px-3 py-2.5 backdrop-blur-sm">
                      <p className="text-sm text-muted-foreground">
                        Saldo nach dieser Rechnung: positiv = Guthaben, negativ = offene Forderung.
                      </p>
                      {(() => {
                        const raw = balanceLineAmountAfterBauCredit({
                          clientCreditBalance: Number(selectedClient?.credit_balance ?? 0),
                          creditAppliedOnInvoice: bauCreditAppliedPreview,
                          creditPreviouslyAppliedOnSameInvoice: 0,
                          invoiceTotal: calc.totalAmount,
                        });
                        const balance = balanceLineDisplay(raw);
                        return (
                          <>
                            <p
                              className={`text-sm font-medium ${
                                balance.isReceivable ? "text-red-400" : "text-foreground"
                              }`}
                            >
                              {balance.label}
                            </p>
                            <p
                              className={`text-lg font-medium tabular-nums tracking-tight ${
                                balance.isReceivable ? "text-red-400" : ""
                              }`}
                            >
                              {formatCurrency(balance.amount)}
                            </p>
                          </>
                        );
                      })()}
                      <p className="text-xs text-muted-foreground">
                        Im PDF erscheint derselbe Text wie oben.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-w-xs">
                      <Label htmlFor="balance-line-amount">Betrag (EUR)</Label>
                      <Input
                        id="balance-line-amount"
                        type="text"
                        inputMode="decimal"
                        placeholder="z.B. 1250,50"
                        value={balanceLineAmount}
                        onChange={(e) => setBalanceLineAmount(e.target.value)}
                      />
                      {(() => {
                        const parsed = parseGermanAmount(balanceLineAmount);
                        if (parsed == null) return null;
                        const balance = balanceLineDisplay(parsed);
                        return (
                          <p className="text-xs text-muted-foreground">
                            Im PDF: {balance.label} {formatCurrency(balance.amount)}
                          </p>
                        );
                      })()}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Zusammenfassung */}
        <div className="space-y-6">
          <Card className="border-border/60 bg-card/60 backdrop-blur-xl rounded-2xl lg:sticky lg:top-6">
            <CardHeader>
              <CardTitle>Zusammenfassung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Umsatzsteuer %</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={vatPercent}
                  onChange={(e) => setVatPercent(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Switch checked={isPartialPayment} onCheckedChange={setIsPartialPayment} />
                  <Label>Teilanzahlung</Label>
                </div>
                {isPartialPayment && (
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Gesamtbetrag"
                    value={partialPaymentOfTotal}
                    onChange={(e) => setPartialPaymentOfTotal(e.target.value)}
                  />
                )}
              </div>
              <div className="pt-4 border-t border-border/60 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Nettobetrag:</span>
                  <span className="tabular-nums">{formatCurrency(calc.netAmount)}</span>
                </div>
                {vatPercent > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Umsatzsteuer:</span>
                    <span className="tabular-nums">+{formatCurrency(calc.vatAmount)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-border/60" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Rechnungsbetrag:</span>
                  <span className="text-primary tabular-nums">
                    {formatCurrency(calc.totalAmount)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {showPreview && (
        <InvoicePDF
          invoice={draftInvoice}
          items={previewItems}
          client={clients.find((c) => c.id === clientId) || null}
          onClose={() => setShowPreview(false)}
          previewMode={true}
        />
      )}
    </div>
  );
}
