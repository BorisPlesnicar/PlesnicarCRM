"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Client, Project, Offer, InvoiceItem } from "@/lib/types";
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
import { useRouter } from "next/navigation";
import { Invoice } from "@/lib/types";

const InvoicePDF = dynamic(() => import("@/components/invoices/invoice-pdf"), {
  ssr: false,
});
import { Loader2, ArrowLeft, Save, Plus, Trash2, Calculator, Eye } from "lucide-react";
import { addDays, format } from "date-fns";
import dynamic from "next/dynamic";

export default function NewInvoicePage() {
  const router = useRouter();
  const supabase = createClient();

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
  const [customerNumber, setCustomerNumber] = useState("");
  const [vatPercent, setVatPercent] = useState(0);
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [partialPaymentOfTotal, setPartialPaymentOfTotal] = useState("");
  const [invoiceType, setInvoiceType] = useState<"it" | "bau">("it");

  // IT Items
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      position: 1,
      description: "",
      quantity: 1,
      unit: "Stk",
      unit_price: 0,
      vat_percent: 0,
      discount_percent: 0,
      total: 0,
    },
  ]);

  // BAU Items (dynamic)
  const [bauItems, setBauItems] = useState<
    Array<{ id: string; description: string; quantity: number; unit: string; price: number }>
  >([{ id: "1", description: "", quantity: 1, unit: "Stk", price: 0 }]);

  // Convert BAU items to InvoiceItem format for calculation
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

  // Calculations
  const calc = useMemo(() => {
    const itemsToUse = invoiceType === "it" ? items : bauItemsAsInvoiceItems;
    const netAmount = itemsToUse.reduce((sum, item) => sum + item.total, 0);
    const vatAmount = netAmount * (vatPercent / 100);
    const totalAmount = netAmount + vatAmount;
    return { netAmount, vatAmount, totalAmount };
  }, [items, bauItemsAsInvoiceItems, invoiceType, vatPercent]);

  // Create draft invoice for preview
  const draftInvoice = useMemo((): Partial<Invoice> => {
    const selectedClient = clients.find((c) => c.id === clientId);
    const dueDate = addDays(new Date(invoiceDate), paymentTermDays);
    
    return {
      id: "draft",
      invoice_number: invoiceNumber || "DRAFT",
      invoice_date: invoiceDate,
      due_date: format(dueDate, "yyyy-MM-dd"),
      payment_term_days: paymentTermDays,
      customer_number: customerNumber || null,
      invoice_type: invoiceType,
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
    clientId,
    invoiceNumber,
    invoiceDate,
    paymentTermDays,
    customerNumber,
    invoiceType,
    calc,
    vatPercent,
    isPartialPayment,
    partialPaymentOfTotal,
    projectId,
    offerId,
  ]);

  // Get items for preview
  const previewItems = useMemo(() => {
    const itemsToUse = invoiceType === "it" ? items : bauItemsAsInvoiceItems;
    return itemsToUse.filter((item) => item.description.trim());
  }, [items, bauItemsAsInvoiceItems, invoiceType]);

  useEffect(() => {
    async function load() {
      const [clientsRes, projectsRes, offersRes] = await Promise.all([
        supabase.from("clients").select("*").order("name"),
        supabase.from("projects").select("*").order("title"),
        supabase.from("offers").select("*").eq("status", "accepted").order("created_at", { ascending: false }),
      ]);
      setClients(clientsRes.data || []);
      setProjects(projectsRes.data || []);
      setOffers(offersRes.data || []);

      // Auto-generate invoice number in format BP-2248-XX
      // Find the highest existing invoice number suffix
      const { data: existingInvoices } = await supabase
        .from("invoices")
        .select("invoice_number")
        .like("invoice_number", "BP-2248-%");
      
      let nextSuffix = 1;
      if (existingInvoices && existingInvoices.length > 0) {
        const suffixes = existingInvoices
          .map((inv) => {
            const match = inv.invoice_number.match(/BP-2248-(\d+)/);
            return match ? parseInt(match[1], 10) : 0;
          })
          .filter((n) => n > 0);
        nextSuffix = suffixes.length > 0 ? Math.max(...suffixes) + 1 : 2;
      } else {
        // If no invoices exist, start at 02 (since 01 already exists)
        nextSuffix = 2;
      }
      setInvoiceNumber(`BP-2248-${String(nextSuffix).padStart(2, "0")}`);

      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update customer number when client changes
  useEffect(() => {
    if (clientId) {
      const client = clients.find((c) => c.id === clientId);
      if (client?.customer_number) {
        setCustomerNumber(client.customer_number);
      }
    }
  }, [clientId, clients]);

  // Update due date when invoice date or payment term changes
  useEffect(() => {
    if (invoiceDate && paymentTermDays) {
      const dueDate = addDays(new Date(invoiceDate), paymentTermDays);
      // This will be set when saving
    }
  }, [invoiceDate, paymentTermDays]);

  function updateItem(index: number, field: keyof InvoiceItem, value: number | string) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        // Recalculate total
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
      {
        position: prev.length + 1,
        description: "",
        quantity: 1,
        unit: "Stk",
        unit_price: 0,
        vat_percent: 0,
        discount_percent: 0,
        total: 0,
      },
    ]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index).map((item, i) => ({ ...item, position: i + 1 })));
  }

  // BAU functions
  function addBauItem() {
    setBauItems((prev) => [
      ...prev,
      { id: Date.now().toString(), description: "", quantity: 1, unit: "Stk", price: 0 },
    ]);
  }

  function removeBauItem(id: string) {
    setBauItems((prev) => prev.filter((item) => item.id !== id));
  }

  function updateBauItem(
    id: string,
    field: "description" | "quantity" | "unit" | "price",
    value: string | number
  ) {
    setBauItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  }

  // Load items from offer
  function loadFromOffer() {
    // "none" = explizit kein Angebot gewählt
    if (!offerId || offerId === "none") return;
    const offer = offers.find((o) => o.id === offerId);
    if (!offer) return;

    // Set invoice type based on offer type
    if (offer.offer_type) {
      setInvoiceType(offer.offer_type);
    }

    // Load offer items
    supabase
      .from("offer_items")
      .select("*")
      .eq("offer_id", offerId)
      .order("position")
      .then(({ data }) => {
        if (data && data.length > 0) {
          if (offer.offer_type === "bau") {
            // BAU: use as BAU items
            const bauItemsData = data.map((item, idx) => ({
              id: (idx + 1).toString(),
              description: item.service_name,
              quantity: 1,
              unit: "Stk",
              price: item.net_total || 0,
            }));
            setBauItems(bauItemsData);
          } else {
            // IT: use as IT items
            const invoiceItems: InvoiceItem[] = data.map((item, idx) => ({
              position: idx + 1,
              description: item.service_name,
              quantity: 1,
              unit: "Stk",
              unit_price: item.net_total || 0,
              vat_percent: offer.vat_percent || 0,
              discount_percent: 0,
              total: item.net_total || 0,
            }));
            setItems(invoiceItems);
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
    
    // Validate items based on invoice type
    if (invoiceType === "it") {
      if (items.length === 0 || items.every((i) => !i.description.trim())) {
        toast.error("Bitte fügen Sie mindestens eine Position hinzu");
        return;
      }
    } else {
      // BAU
      if (bauItems.length === 0 || bauItems.every((i) => !i.description.trim() || i.price <= 0)) {
        toast.error("Bitte fügen Sie mindestens eine Position mit Beschreibung und Preis hinzu");
        return;
      }
    }

    setSaving(true);

    const dueDate = addDays(new Date(invoiceDate), paymentTermDays);

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        client_id: clientId,
        // "none" oder leerer String sollen als NULL gespeichert werden,
        // sonst versucht Postgres, 'none' als UUID zu parsen.
        project_id: !projectId || projectId === "none" ? null : projectId,
        offer_id: !offerId || offerId === "none" ? null : offerId,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        due_date: format(dueDate, "yyyy-MM-dd"),
        payment_term_days: paymentTermDays,
        customer_number: customerNumber || null,
        invoice_type: invoiceType,
        net_amount: calc.netAmount,
        vat_amount: calc.vatAmount,
        total_amount: calc.totalAmount,
        vat_percent: vatPercent,
        is_partial_payment: isPartialPayment,
        partial_payment_of_total: isPartialPayment && partialPaymentOfTotal ? parseFloat(partialPaymentOfTotal) : null,
        status: "draft",
      })
      .select()
      .single();

    if (invoiceError) {
      toast.error("Fehler beim Speichern", { description: invoiceError.message });
      setSaving(false);
      return;
    }

    // Insert items - use appropriate items based on type
    let itemsToInsert: any[] = [];
    if (invoiceType === "it") {
      itemsToInsert = items
        .filter((item) => item.description.trim())
        .map((item) => ({
          invoice_id: invoice.id,
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
      // BAU
      itemsToInsert = bauItems
        .filter((item) => item.description.trim() && item.price > 0)
        .map((item, idx) => ({
          invoice_id: invoice.id,
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
      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(itemsToInsert);
      if (itemsError) {
        toast.error("Fehler bei Positionen", { description: itemsError.message });
        setSaving(false);
        return;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
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
              if (previewItems.length === 0) {
                toast.error("Bitte fügen Sie mindestens eine Position hinzu");
                return;
              }
              setShowPreview(true);
            }}
            variant="outline"
            disabled={!clientId || previewItems.length === 0}
          >
            <Eye className="mr-2 h-4 w-4" />
            Vorschau
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-primary-foreground hover:bg-red-700"
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

      {/* Invoice Type Tabs */}
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
        {/* Left Column - Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
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
                  <Input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Zahlungsziel (Tage)</Label>
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
              </div>
            </CardContent>
          </Card>

          {/* Items */}
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
                        <Input
                          value={item.unit}
                          onChange={(e) => updateItem(index, "unit", e.target.value)}
                          placeholder="Stk"
                        />
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
                      <div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          className="text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bau" className="space-y-0">
              <Card className="border-border bg-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Leistungen
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={addBauItem}
                    className="bg-primary text-primary-foreground hover:bg-red-700"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Zeile hinzufügen
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {bauItems.map((item, idx) => (
                      <div
                        key={item.id}
                        className="flex gap-3 items-start p-3 rounded-lg border border-border bg-secondary/50"
                      >
                        <div className="flex-shrink-0 pt-2 text-sm text-muted-foreground w-8">
                          {idx + 1}.
                        </div>
                        <div className="flex-1 space-y-2">
                          <Input
                            placeholder="Leistungsbeschreibung..."
                            value={item.description}
                            onChange={(e) =>
                              updateBauItem(item.id, "description", e.target.value)
                            }
                            className="bg-background"
                          />
                          <div className="flex gap-2 items-center">
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="Anzahl"
                              value={item.quantity || ""}
                              onChange={(e) =>
                                updateBauItem(
                                  item.id,
                                  "quantity",
                                  parseFloat(e.target.value) || 1
                                )
                              }
                              className="bg-background w-24"
                            />
                            <Input
                              placeholder="Einheit"
                              value={item.unit}
                              onChange={(e) =>
                                updateBauItem(item.id, "unit", e.target.value)
                              }
                              className="bg-background w-24"
                            />
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="Preis (€)"
                              value={item.price || ""}
                              onChange={(e) =>
                                updateBauItem(
                                  item.id,
                                  "price",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="bg-background w-32"
                            />
                            <span className="text-sm text-muted-foreground">
                              = {formatCurrency((item.quantity || 1) * (item.price || 0))}
                            </span>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeBauItem(item.id)}
                          className="flex-shrink-0 text-destructive hover:text-destructive"
                          disabled={bauItems.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Summary */}
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
                  <Switch
                    checked={isPartialPayment}
                    onCheckedChange={setIsPartialPayment}
                  />
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

      {/* PDF Preview Modal */}
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
