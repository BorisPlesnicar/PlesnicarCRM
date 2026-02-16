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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { addDays, format } from "date-fns";

export default function NewInvoicePage() {
  const router = useRouter();
  const supabase = createClient();

  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  // Items
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

  // Calculations
  const calc = useMemo(() => {
    const netAmount = items.reduce((sum, item) => sum + item.total, 0);
    const vatAmount = netAmount * (vatPercent / 100);
    const totalAmount = netAmount + vatAmount;
    return { netAmount, vatAmount, totalAmount };
  }, [items, vatPercent]);

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
      const { count } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true });
      const nextSuffix = (count || 0) + 1;
      setInvoiceNumber(`BP-2248-${String(nextSuffix).padStart(2, "0")}`);

      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Load items from offer
  function loadFromOffer() {
    if (!offerId) return;
    const offer = offers.find((o) => o.id === offerId);
    if (!offer) return;

    // Load offer items
    supabase
      .from("offer_items")
      .select("*")
      .eq("offer_id", offerId)
      .order("position")
      .then(({ data }) => {
        if (data && data.length > 0) {
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
    if (items.length === 0 || items.every((i) => !i.description.trim())) {
      toast.error("Bitte fügen Sie mindestens eine Position hinzu");
      return;
    }

    setSaving(true);

    const dueDate = addDays(new Date(invoiceDate), paymentTermDays);

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        client_id: clientId,
        project_id: projectId || null,
        offer_id: offerId || null,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        due_date: format(dueDate, "yyyy-MM-dd"),
        payment_term_days: paymentTermDays,
        customer_number: customerNumber || null,
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

    // Insert items
    const itemsToInsert = items
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
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Positionen</CardTitle>
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
    </div>
  );
}
