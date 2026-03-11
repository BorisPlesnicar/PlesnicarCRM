"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Client, Project, Offer, InvoiceItem, Invoice } from "@/lib/types";
import { formatCurrency } from "@/lib/calculations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/app/AuthProvider";
import { Loader2, ArrowLeft, Save, Plus, Trash2, Calculator, Eye } from "lucide-react";
import { addDays, format } from "date-fns";
import dynamic from "next/dynamic";

const InvoicePDF = dynamic(() => import("@/components/invoices/invoice-pdf"), {
  ssr: false,
});

export default function EditInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const { canWrite, loading: authLoading } = useAuth();
  const invoiceId = params.id as string;

  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [offerId, setOfferId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [paymentTermDays, setPaymentTermDays] = useState(14);
  const [skontoDays, setSkontoDays] = useState<number | null>(null);
  const [skontoPercent, setSkontoPercent] = useState<number | null>(null);
  const [showDiscountColumn, setShowDiscountColumn] = useState(true);
  const [customerNumber, setCustomerNumber] = useState("");
  const [vatPercent, setVatPercent] = useState(0);
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [partialPaymentOfTotal, setPartialPaymentOfTotal] = useState("");
  const [invoiceType, setInvoiceType] = useState<"it" | "bau">("it");
  const [bauIntroText, setBauIntroText] = useState("");

  const [items, setItems] = useState<InvoiceItem[]>([
    { position: 1, description: "", quantity: 1, unit: "Stk", unit_price: 0, vat_percent: 0, discount_percent: 0, total: 0 },
  ]);
  const [bauItems, setBauItems] = useState<
    Array<{ id: string; description: string; quantity: number; unit: string; price: number }>
  >([{ id: "1", description: "", quantity: 1, unit: "Stk", price: 0 }]);

  const bauItemsAsInvoiceItems = useMemo(() => {
    return bauItems.map((item, idx) => ({
      position: idx + 1,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.price,
      vat_percent: 0,
      discount_percent: 0,
      total: item.quantity * item.price,
    }));
  }, [bauItems]);

  const calc = useMemo(() => {
    const itemsToUse = invoiceType === "it" ? items : bauItemsAsInvoiceItems;
    const netAmount = itemsToUse.reduce((sum, item) => sum + item.total, 0);
    const vatAmount = netAmount * (vatPercent / 100);
    const totalAmount = netAmount + vatAmount;
    return { netAmount, vatAmount, totalAmount };
  }, [items, bauItemsAsInvoiceItems, invoiceType, vatPercent]);

  const draftInvoice = useMemo((): Partial<Invoice> => {
    const dueDate = addDays(new Date(invoiceDate), paymentTermDays);
    return {
      id: invoiceId,
      invoice_number: invoiceNumber || "DRAFT",
      invoice_date: invoiceDate,
      due_date: format(dueDate, "yyyy-MM-dd"),
      payment_term_days: paymentTermDays,
      skonto_days: skontoDays ?? null,
      skonto_percent: skontoPercent ?? null,
      show_discount_column: showDiscountColumn,
      customer_number: customerNumber || null,
      invoice_type: invoiceType,
      intro_text: invoiceType === "bau" ? (bauIntroText?.trim() || null) : null,
      net_amount: calc.netAmount,
      vat_amount: calc.vatAmount,
      total_amount: calc.totalAmount,
      vat_percent: vatPercent,
      is_partial_payment: isPartialPayment,
      partial_payment_of_total: isPartialPayment && partialPaymentOfTotal ? parseFloat(partialPaymentOfTotal) : null,
      status: "draft",
      currency: "EUR",
      client_id: clientId,
      project_id: projectId && projectId !== "none" ? projectId : null,
      offer_id: offerId && offerId !== "none" ? offerId : null,
    } as Partial<Invoice>;
  }, [
    invoiceId,
    clientId,
    invoiceNumber,
    invoiceDate,
    paymentTermDays,
    skontoDays,
    skontoPercent,
    customerNumber,
    invoiceType,
    bauIntroText,
    calc,
    vatPercent,
    isPartialPayment,
    partialPaymentOfTotal,
    projectId,
    offerId,
  ]);

  const previewItems = useMemo(() => {
    const itemsToUse = invoiceType === "it" ? items : bauItemsAsInvoiceItems;
    return itemsToUse.filter((item) => item.description.trim());
  }, [items, bauItemsAsInvoiceItems, invoiceType]);

  useEffect(() => {
    async function load() {
      const [invoiceRes, itemsRes, clientsRes, projectsRes, offersRes] = await Promise.all([
        supabase.from("invoices").select("*").eq("id", invoiceId).single(),
        supabase.from("invoice_items").select("*").eq("invoice_id", invoiceId).order("position"),
        supabase.from("clients").select("*").order("name"),
        supabase.from("projects").select("*").order("title"),
        supabase.from("offers").select("*").eq("status", "accepted").order("created_at", { ascending: false }),
      ]);

      if (invoiceRes.error || !invoiceRes.data) {
        toast.error("Rechnung nicht gefunden");
        router.push("/app/invoices");
        return;
      }

      const inv = invoiceRes.data as Invoice;
      setClients(clientsRes.data || []);
      setProjects(projectsRes.data || []);
      setOffers(offersRes.data || []);
      setClientId(inv.client_id);
      setProjectId(inv.project_id || "none");
      setOfferId(inv.offer_id || "none");
      setInvoiceNumber(inv.invoice_number);
      setInvoiceDate(inv.invoice_date);
      setPaymentTermDays(inv.payment_term_days ?? 14);
      setSkontoDays(inv.skonto_days ?? null);
      setSkontoPercent(inv.skonto_percent ?? null);
      setShowDiscountColumn(inv.show_discount_column !== false);
      setCustomerNumber(inv.customer_number || "");
      setVatPercent(inv.vat_percent ?? 0);
      setIsPartialPayment(inv.is_partial_payment ?? false);
      setPartialPaymentOfTotal(inv.partial_payment_of_total != null ? String(inv.partial_payment_of_total) : "");
      setInvoiceType((inv.invoice_type as "it" | "bau") || "it");
      setBauIntroText(inv.intro_text || "");

      const loadedItems = (itemsRes.data || []) as InvoiceItem[];
      if (inv.invoice_type === "bau") {
        setBauItems(
          loadedItems.length > 0
            ? loadedItems.map((it, idx) => ({
                id: String(idx + 1),
                description: it.description,
                quantity: it.quantity,
                unit: it.unit,
                price: it.unit_price,
              }))
            : [{ id: "1", description: "", quantity: 1, unit: "Stk", price: 0 }]
        );
        setItems([{ position: 1, description: "", quantity: 1, unit: "Stk", unit_price: 0, vat_percent: 0, discount_percent: 0, total: 0 }]);
      } else {
        setItems(
          loadedItems.length > 0
            ? loadedItems.map((it) => ({
                position: it.position,
                description: it.description,
                quantity: it.quantity,
                unit: it.unit,
                unit_price: it.unit_price,
                vat_percent: it.vat_percent,
                discount_percent: it.discount_percent,
                total: it.total,
              }))
            : [{ position: 1, description: "", quantity: 1, unit: "Stk", unit_price: 0, vat_percent: 0, discount_percent: 0, total: 0 }]
        );
        setBauItems([{ id: "1", description: "", quantity: 1, unit: "Stk", price: 0 }]);
      }
      setLoading(false);
    }
    load();
  }, [invoiceId, router, supabase]);

  useEffect(() => {
    if (clientId && clients.length) {
      const client = clients.find((c) => c.id === clientId);
      if (client?.customer_number) setCustomerNumber(client.customer_number);
    }
  }, [clientId, clients]);

  function updateItem(index: number, field: keyof InvoiceItem, value: number | string) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        const quantity = typeof updated.quantity === "number" ? updated.quantity : parseFloat(String(updated.quantity)) || 0;
        const unitPrice = typeof updated.unit_price === "number" ? updated.unit_price : parseFloat(String(updated.unit_price)) || 0;
        const discount = typeof updated.discount_percent === "number" ? updated.discount_percent : parseFloat(String(updated.discount_percent)) || 0;
        updated.total = quantity * unitPrice * (1 - discount / 100);
        return updated;
      })
    );
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      { position: prev.length + 1, description: "", quantity: 1, unit: "Stk", unit_price: 0, vat_percent: 0, discount_percent: 0, total: 0 },
    ]);
  }

  function insertItem(index: number) {
    setItems((prev) => {
      const blank = { position: index + 1, description: "", quantity: 1, unit: "Stk", unit_price: 0, vat_percent: 0, discount_percent: 0, total: 0 };
      return [...prev.slice(0, index), blank, ...prev.slice(index)].map((item, i) => ({ ...item, position: i + 1 }));
    });
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index).map((item, i) => ({ ...item, position: i + 1 })));
  }

  function addBauItem() {
    setBauItems((prev) => [...prev, { id: Date.now().toString(), description: "", quantity: 1, unit: "Stk", price: 0 }]);
  }

  function insertBauItem(index: number) {
    setBauItems((prev) => [
      ...prev.slice(0, index),
      { id: Date.now().toString(), description: "", quantity: 1, unit: "Stk", price: 0 },
      ...prev.slice(index),
    ]);
  }

  function removeBauItem(id: string) {
    setBauItems((prev) => prev.filter((item) => item.id !== id));
  }

  function updateBauItem(id: string, field: "description" | "quantity" | "unit" | "price", value: string | number) {
    setBauItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  }

  function loadFromOffer() {
    if (!offerId || offerId === "none") return;
    const offer = offers.find((o) => o.id === offerId);
    if (!offer) return;
    if (offer.offer_type) setInvoiceType(offer.offer_type);
    supabase
      .from("offer_items")
      .select("*")
      .eq("offer_id", offerId)
      .order("position")
      .then(({ data }) => {
        if (data?.length) {
          if (offer.offer_type === "bau") {
            setBauItems(
              data.map((item, idx) => ({
                id: String(idx + 1),
                description: item.service_name,
                quantity: 1,
                unit: "Stk",
                price: item.net_total || 0,
              }))
            );
          } else {
            setItems(
              data.map((item, idx) => ({
                position: idx + 1,
                description: item.service_name,
                quantity: 1,
                unit: "Stk",
                unit_price: item.net_total || 0,
                vat_percent: offer.vat_percent || 0,
                discount_percent: 0,
                total: item.net_total || 0,
              }))
            );
          }
          setVatPercent(offer.vat_percent || 0);
          toast.success("Positionen vom Angebot übernommen");
        }
      });
  }

  async function handleSave() {
    if (!clientId) {
      toast.error("Bitte wählen Sie einen Kunden");
      return;
    }
    if (invoiceType === "it") {
      if (items.length === 0 || items.every((i) => !i.description.trim())) {
        toast.error("Bitte fügen Sie mindestens eine Position hinzu");
        return;
      }
    } else {
      if (bauItems.length === 0 || bauItems.every((i) => !i.description.trim() || i.price <= 0)) {
        toast.error("Bitte fügen Sie mindestens eine Position mit Beschreibung und Preis hinzu");
        return;
      }
    }

    setSaving(true);
    const dueDate = addDays(new Date(invoiceDate), paymentTermDays);

    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        client_id: clientId,
        project_id: !projectId || projectId === "none" ? null : projectId,
        offer_id: !offerId || offerId === "none" ? null : offerId,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        due_date: format(dueDate, "yyyy-MM-dd"),
        payment_term_days: paymentTermDays,
        skonto_days: skontoDays ?? null,
        skonto_percent: skontoPercent ?? null,
        show_discount_column: showDiscountColumn,
        customer_number: customerNumber || null,
        invoice_type: invoiceType,
        intro_text: invoiceType === "bau" ? (bauIntroText?.trim() || null) : null,
        net_amount: calc.netAmount,
        vat_amount: calc.vatAmount,
        total_amount: calc.totalAmount,
        vat_percent: vatPercent,
        is_partial_payment: isPartialPayment,
        partial_payment_of_total: isPartialPayment && partialPaymentOfTotal ? parseFloat(partialPaymentOfTotal) : null,
      })
      .eq("id", invoiceId);

    if (updateError) {
      toast.error("Fehler beim Speichern", { description: updateError.message });
      setSaving(false);
      return;
    }

    await supabase.from("invoice_items").delete().eq("invoice_id", invoiceId);

    let itemsToInsert: Record<string, unknown>[] = [];
    if (invoiceType === "it") {
      itemsToInsert = items
        .filter((item) => item.description.trim())
        .map((item) => ({
          invoice_id: invoiceId,
          position: item.position,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          vat_percent: item.vat_percent,
          discount_percent: item.discount_percent,
          total: item.total,
        }));
    } else {
      itemsToInsert = bauItems
        .filter((item) => item.description.trim() && item.price > 0)
        .map((item, idx) => ({
          invoice_id: invoiceId,
          position: idx + 1,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.price,
          vat_percent: 0,
          discount_percent: 0,
          total: item.quantity * item.price,
        }));
    }

    if (itemsToInsert.length > 0) {
      const { error: itemsError } = await supabase.from("invoice_items").insert(itemsToInsert);
      if (itemsError) {
        toast.error("Fehler bei Positionen", { description: itemsError.message });
        setSaving(false);
        return;
      }
    }

    toast.success("Rechnung gespeichert");
    router.push(`/app/invoices/${invoiceId}`);
  }

  const filteredProjects = projectId ? projects : clientId ? projects.filter((p) => p.client_id === clientId) : projects;
  const filteredOffers = offerId ? offers : clientId ? offers.filter((o) => o.client_id === clientId) : offers;

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canWrite) {
    router.replace(`/app/invoices/${invoiceId}`);
    return null;
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push(`/app/invoices/${invoiceId}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Rechnung bearbeiten</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={!clientId || previewItems.length === 0}
            onClick={() => setShowPreview(true)}
          >
            <Eye className="mr-2 h-4 w-4" />
            Vorschau
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground hover:bg-red-700">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {saving ? "Speichere..." : "Speichern"}
          </Button>
        </div>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="pt-6">
          <Tabs value={invoiceType} onValueChange={(v) => setInvoiceType(v as "it" | "bau")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="it">IT Rechnung</TabsTrigger>
              <TabsTrigger value="bau">BAU Rechnung</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border bg-card">
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
                      <Button variant="outline" onClick={loadFromOffer}>
                        Übernehmen
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Rechnungsnummer</Label>
                  <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Rechnungsdatum</Label>
                  <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Zahlungsziel mit Skonto (Tage)</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="z.B. 10 (leer = kein Skonto)"
                    value={skontoDays ?? ""}
                    onChange={(e) => setSkontoDays(e.target.value === "" ? null : parseInt(e.target.value, 10) || null)}
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
                    onChange={(e) => setSkontoPercent(e.target.value === "" ? null : parseFloat(e.target.value) || null)}
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
                <div className="space-y-2">
                  <Label>Kundennummer (optional)</Label>
                  <Input value={customerNumber} onChange={(e) => setCustomerNumber(e.target.value)} />
                </div>
                <div className="flex items-center space-x-2 sm:col-span-2">
                  <Switch
                    id="show-discount"
                    checked={showDiscountColumn}
                    onCheckedChange={setShowDiscountColumn}
                  />
                  <Label htmlFor="show-discount" className="font-normal cursor-pointer">
                    Rabattspalte in PDF anzeigen
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs value={invoiceType} onValueChange={(v) => setInvoiceType(v as "it" | "bau")}>
            <TabsContent value="it" className="space-y-0">
              <Card className="border-border bg-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Positionen
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={addItem}>
                    <Plus className="mr-2 h-4 w-4" />
                    Position hinzufügen
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="grid gap-4 sm:grid-cols-8 items-end p-4 border border-border rounded-lg">
                      <div className="sm:col-span-3 space-y-2">
                        <Label>Bezeichnung</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(index, "description", e.target.value)}
                          placeholder="z.B. Grafische Entwerfung einer Website"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Anzahl</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Einheit</Label>
                        <Input value={item.unit} onChange={(e) => updateItem(index, "unit", e.target.value)} placeholder="Stk" />
                      </div>
                      <div className="space-y-2">
                        <Label>Einheitspreis</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Rabatt %</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.discount_percent}
                          onChange={(e) => updateItem(index, "discount_percent", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Gesamt</Label>
                        <div className="font-semibold">{formatCurrency(item.total)}</div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => insertItem(index)} title="Zeile darüber einfügen">
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => removeItem(index)} className="text-red-400" title="Zeile löschen">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bau" className="space-y-0">
              <Card className="border-border bg-card mb-4">
                <CardHeader>
                  <CardTitle className="text-base">Text oberhalb der Leistungen</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Optionaler Einleitungstext, der auf der BAU-Rechnung über der Positionstabelle erscheint.
                  </p>
                </CardHeader>
                <CardContent>
                  <textarea
                    value={bauIntroText}
                    onChange={(e) => setBauIntroText(e.target.value)}
                    placeholder="z.B. Leistungen gemäß Auftrag vom … / Beschreibung des Bauvorhabens …"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    rows={3}
                  />
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Leistungen
                  </CardTitle>
                  <Button size="sm" onClick={addBauItem} className="bg-primary text-primary-foreground hover:bg-red-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Zeile hinzufügen
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {bauItems.map((item, idx) => (
                      <div key={item.id} className="flex gap-3 items-start p-3 rounded-lg border border-border bg-secondary/50">
                        <div className="flex-shrink-0 pt-2 text-sm text-muted-foreground w-8">{idx + 1}.</div>
                        <div className="flex-1 space-y-2">
                          <Input
                            placeholder="Leistungsbeschreibung..."
                            value={item.description}
                            onChange={(e) => updateBauItem(item.id, "description", e.target.value)}
                            className="bg-background"
                          />
                          <div className="flex gap-2 items-center">
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="Anzahl"
                              value={item.quantity || ""}
                              onChange={(e) => updateBauItem(item.id, "quantity", parseFloat(e.target.value) || 1)}
                              className="bg-background w-24"
                            />
                            <Input
                              placeholder="Einheit"
                              value={item.unit}
                              onChange={(e) => updateBauItem(item.id, "unit", e.target.value)}
                              className="bg-background w-24"
                            />
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="Preis (€)"
                              value={item.price || ""}
                              onChange={(e) => updateBauItem(item.id, "price", parseFloat(e.target.value) || 0)}
                              className="bg-background w-32"
                            />
                            <span className="text-sm text-muted-foreground">
                              = {formatCurrency((item.quantity || 1) * (item.price || 0))}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button size="icon" variant="ghost" onClick={() => insertBauItem(idx)} title="Zeile darüber einfügen">
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeBauItem(item.id)}
                            className="text-destructive hover:text-destructive"
                            disabled={bauItems.length === 1}
                            title="Zeile löschen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card className="border-border bg-card">
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
              <div className="pt-4 border-t border-border space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Nettobetrag:</span>
                  <span>{formatCurrency(calc.netAmount)}</span>
                </div>
                {vatPercent > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Umsatzsteuer:</span>
                    <span>+{formatCurrency(calc.vatAmount)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-border" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Rechnungsbetrag:</span>
                  <span className="text-primary">{formatCurrency(calc.totalAmount)}</span>
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
