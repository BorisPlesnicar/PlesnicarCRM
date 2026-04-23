"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Client,
  Project,
  OfferItem,
  OfferAddon,
  OFFER_STATUSES,
  SERVICE_NAMES,
  PACKAGE_PRESETS,
} from "@/lib/types";
import { calculateOffer, formatCurrency } from "@/lib/calculations";
import { bauLineTotal } from "@/lib/bau-invoice-rows";
import {
  type BauFormRow,
  defaultBauPositionRow,
  buildBauOfferItemInserts,
  bauFormRowsToOfferCalcLineItems,
} from "@/lib/bau-offer-rows";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2,
  ArrowLeft,
  Calculator,
  Save,
  Plus,
  Trash2,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/app/app/AuthProvider";

export default function NewOfferPageWrapper() {
  return (
    <Suspense>
      <NewOfferPage />
    </Suspense>
  );
}

function NewOfferPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { canWrite, loading: authLoading } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [clientId, setClientId] = useState(searchParams.get("client") || "");
  const [projectId, setProjectId] = useState(searchParams.get("project") || "");
  const [offerNumber, setOfferNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [validUntil, setValidUntil] = useState("");
  const [consultantName, setConsultantName] = useState("");
  const [consultantPhone, setConsultantPhone] = useState("");
  const [status, setStatus] = useState<string>("draft");
  const [offerType, setOfferType] = useState<"it" | "bau">("it");
  const [packagePreset, setPackagePreset] = useState<string>("");
  const [projectScopeShort, setProjectScopeShort] = useState("");
  const [projectScope, setProjectScope] = useState("");

  // IT Line items – dynamisch wie Rechnung
  const [items, setItems] = useState<OfferItem[]>([
    { position: 1, service_name: "", hours: 0, hourly_rate: 55, discount_percent: 0, net_total: 0 },
  ]);

  const [bauItems, setBauItems] = useState<BauFormRow[]>([defaultBauPositionRow("1")]);

  // Global controls
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [expressEnabled, setExpressEnabled] = useState(false);
  const [expressSurcharge, setExpressSurcharge] = useState(20);
  const [hostingEnabled, setHostingEnabled] = useState(false);
  const [hostingFee, setHostingFee] = useState(150);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMonths, setMaintenanceMonths] = useState(12);
  const [maintenanceMonthly, setMaintenanceMonthly] = useState(49);
  const [vatPercent, setVatPercent] = useState(0);
  const [addons, setAddons] = useState<
    Array<{ id: string; title: string; description: string; price: number }>
  >([]);

  const bauItemsAsOfferItems = useMemo(() => bauFormRowsToOfferCalcLineItems(bauItems), [bauItems]);

  // Calculations
  const calc = useMemo(() => {
    const itemsToUse = offerType === "it" ? items : bauItemsAsOfferItems;
    return calculateOffer(
      itemsToUse,
      globalDiscount,
      expressEnabled,
      expressSurcharge,
      hostingEnabled,
      hostingFee,
      maintenanceEnabled,
      maintenanceMonths,
      maintenanceMonthly,
      vatPercent
    );
  }, [
    offerType,
    items,
    bauItemsAsOfferItems,
    globalDiscount,
    expressEnabled,
    expressSurcharge,
    hostingEnabled,
    hostingFee,
    maintenanceEnabled,
    maintenanceMonths,
    maintenanceMonthly,
    vatPercent,
  ]);

  useEffect(() => {
    async function load() {
      const [clientsRes, projectsRes] = await Promise.all([
        supabase.from("clients").select("*").order("name"),
        supabase.from("projects").select("*").order("title"),
      ]);
      setClients(clientsRes.data || []);
      setProjects(projectsRes.data || []);

      // Auto-generate offer number in format BPA-2248-XX
      // Find the highest existing offer number suffix
      const { data: existingOffers } = await supabase
        .from("offers")
        .select("offer_number")
        .like("offer_number", "BPA-2248-%");
      
      let nextSuffix = 1;
      if (existingOffers && existingOffers.length > 0) {
        const suffixes = existingOffers
          .map((off) => {
            const match = off.offer_number.match(/BPA-2248-(\d+)/);
            return match ? parseInt(match[1], 10) : 0;
          })
          .filter((n) => n > 0);
        nextSuffix = suffixes.length > 0 ? Math.max(...suffixes) + 1 : 2;
      } else {
        // If no offers exist, start at 02 (since 01 already exists)
        nextSuffix = 2;
      }
      setOfferNumber(`BPA-2248-${String(nextSuffix).padStart(2, "0")}`);

      // Default valid_until = 30 days from now
      const vu = new Date();
      vu.setDate(vu.getDate() + 30);
      setValidUntil(vu.toISOString().split("T")[0]);

      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dezimalzahl aus Eingabe (Komma oder Punkt), verhindert Bug bei "22,38"
  function parseDecimal(val: string | undefined, fallback: number): number {
    if (val === undefined || val === null || val === "") return fallback;
    const s = String(val).trim().replace(",", ".");
    const n = parseFloat(s);
    return Number.isNaN(n) ? fallback : n;
  }

  function updateItem(index: number, field: keyof OfferItem, value: number | string) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        const hours = updated.hours || 0;
        const rate = updated.hourly_rate || 0;
        updated.net_total = hours * rate * (1 - updated.discount_percent / 100);
        return updated;
      })
    );
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      { position: prev.length + 1, service_name: "", hours: 0, hourly_rate: 55, discount_percent: 0, net_total: 0 },
    ]);
  }

  function removeItem(index: number) {
    setItems((prev) =>
      prev.filter((_, i) => i !== index).map((item, i) => ({ ...item, position: i + 1 }))
    );
  }

  function applyPackagePreset(presetKey: string) {
    const preset = PACKAGE_PRESETS[presetKey];
    if (!preset) return;
    const rate = items[0]?.hourly_rate ?? 55;
    setItems(
      SERVICE_NAMES.map((name, i) => ({
        position: i + 1,
        service_name: name,
        hours: preset.hours[i] ?? 0,
        hourly_rate: rate,
        discount_percent: 0,
        net_total: (preset.hours[i] ?? 0) * rate,
      }))
    );
  }

  function addBauItem() {
    setBauItems((prev) => [...prev, defaultBauPositionRow(Date.now().toString())]);
  }

  function removeBauItem(id: string) {
    setBauItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      if (next.length === 0) return [defaultBauPositionRow("1")];
      return next;
    });
  }

  function updateBauItem(
    id: string,
    field: "description" | "quantity" | "unit" | "price" | "discount_percent",
    value: string | number
  ) {
    setBauItems((prev) =>
      prev.map((item) =>
        item.id === id && item.kind === "position" ? { ...item, [field]: value } : item
      )
    );
  }

  const addonsSum = useMemo(
    () => addons.reduce((s, a) => s + (Number(a.price) || 0), 0),
    [addons]
  );
  const totalWithAddons = calc.total + addonsSum;

  function addAddon() {
    setAddons((prev) => [
      ...prev,
      { id: Date.now().toString(), title: "", description: "", price: 0 },
    ]);
  }
  function removeAddon(id: string) {
    setAddons((prev) => prev.filter((a) => a.id !== id));
  }
  function updateAddon(
    id: string,
    field: "title" | "description" | "price",
    value: string | number
  ) {
    setAddons((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
  }

  async function handleSave() {
    if (!clientId) {
      toast.error("Bitte Kunde wählen");
      return;
    }
    if (!offerNumber.trim()) {
      toast.error("Angebotsnummer erforderlich");
      return;
    }

    setSaving(true);

    // Insert offer
    const { data: offer, error: offerError } = await supabase
      .from("offers")
      .insert({
        client_id: clientId,
        project_id: projectId || null,
        offer_number: offerNumber,
        date,
        valid_until: validUntil || null,
        consultant_name: consultantName,
        consultant_phone: consultantPhone,
        hourly_rate: 55,
        global_discount_percent: globalDiscount,
        vat_percent: vatPercent,
        express_enabled: expressEnabled,
        express_surcharge_percent: expressSurcharge,
        hosting_setup_enabled: hostingEnabled,
        hosting_setup_fee: hostingFee,
        maintenance_enabled: maintenanceEnabled,
        maintenance_months: maintenanceMonths,
        maintenance_monthly_fee: maintenanceMonthly,
        project_scope_short: projectScopeShort || null,
        project_scope: projectScope || null,
        project_scope_images: null,
        total: totalWithAddons,
        status,
        offer_type: offerType,
      })
      .select()
      .single();

    if (offerError || !offer) {
      toast.error("Fehler beim Erstellen", { description: offerError?.message });
      setSaving(false);
      return;
    }

    // Insert items - ONLY items of the current offer type
    let itemsToInsert: any[] = [];
    if (offerType === "it") {
      itemsToInsert = items
        .filter((item) => (item.hours || 0) > 0)
        .map((item) => {
          const h = item.hours ?? 0;
          const r = item.hourly_rate ?? 55;
          const d = item.discount_percent;
          return {
            offer_id: offer.id,
            position: item.position,
            service_name: item.service_name,
            hours: h,
            hourly_rate: r,
            discount_percent: d,
            net_total: h * r * (1 - d / 100),
            quantity: h,
            unit: "Std.",
            unit_price: r,
          };
        });
    } else {
      itemsToInsert = buildBauOfferItemInserts(offer.id, bauItems);
    }

    if (itemsToInsert.length > 0) {
      const { error: itemsError } = await supabase
        .from("offer_items")
        .insert(itemsToInsert);
      if (itemsError) {
        toast.error("Fehler bei Positionen", { description: itemsError.message });
        setSaving(false);
        return;
      }
    }

    const addonsToInsert = addons
      .filter((a) => (a.title || "").trim() && (Number(a.price) || 0) > 0)
      .map((a) => ({
        offer_id: offer.id,
        title: a.title.trim(),
        description: a.description.trim() || null,
        price: Number(a.price) || 0,
      }));
    if (addonsToInsert.length > 0) {
      const { error: addonsError } = await supabase
        .from("offer_addons")
        .insert(addonsToInsert);
      if (addonsError) {
        toast.error("Fehler bei weiteren Positionen", { description: addonsError.message });
        setSaving(false);
        return;
      }
    }

    toast.success("Angebot erstellt");
    router.push(`/app/offers/${offer.id}`);
  }

  const filteredProjects = projectId
    ? projects
    : clientId
      ? projects.filter((p) => p.client_id === clientId)
      : projects;

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canWrite) {
    return (
      <div className="space-y-4 pb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/app/offers")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Button>
        </div>
        <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700">
          <p className="font-semibold mb-1">Nur Lesezugriff</p>
          <p>
            Sie sind als View Moderator angemeldet. Das Erstellen neuer Angebote ist in diesem Modus nicht
            erlaubt.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/app/offers")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Neues Angebot</h1>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-primary-foreground hover:bg-red-700"
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Speichern
        </Button>
      </div>

      {/* Offer Type Tabs – wie Rechnung */}
      <Card className="border-border bg-card">
        <CardContent className="pt-6">
          <Tabs value={offerType} onValueChange={(v) => setOfferType(v as "it" | "bau")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="it">IT Angebot</TabsTrigger>
              <TabsTrigger value="bau">BAU Angebot</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Angebotsinformationen</CardTitle>
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
                  <Select value={projectId || "none"} onValueChange={(v) => setProjectId(v === "none" ? "" : v)}>
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
                  <Label>Angebotsnummer</Label>
                  <Input value={offerNumber} onChange={(e) => setOfferNumber(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Angebotsdatum</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Gültig bis</Label>
                  <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OFFER_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s === "draft" ? "Entwurf" : s === "sent" ? "Gesendet" : s === "accepted" ? "Angenommen" : "Abgelehnt"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs value={offerType} onValueChange={(v) => setOfferType(v as "it" | "bau")}>
            <TabsContent value="it" className="space-y-0">
              <Card className="border-border bg-card mb-4">
                <CardHeader>
                  <CardTitle className="text-base">Paket-Vorgabe (IT)</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Wählen Sie ein Paket, um Positionen und Stunden vorzubelegen. Anschließend können Sie Werte anpassen.
                  </p>
                </CardHeader>
                <CardContent>
                  <Select
                    value={packagePreset || "none"}
                    onValueChange={(v) => {
                      const key = v === "none" ? "" : v;
                      setPackagePreset(key);
                      if (key) applyPackagePreset(key);
                    }}
                  >
                    <SelectTrigger className="max-w-xs">
                      <SelectValue placeholder="Paket wählen (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Manuell / ohne Vorgabe</SelectItem>
                      {Object.entries(PACKAGE_PRESETS).map(([key, p]) => (
                        <SelectItem key={key} value={key}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
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
                          value={item.service_name}
                          onChange={(e) => updateItem(index, "service_name", e.target.value)}
                          placeholder="z.B. Beratung & Konzept"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Anzahl</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.hours ?? ""}
                          onChange={(e) => updateItem(index, "hours", parseDecimal(e.target.value, 0))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Einheit</Label>
                        <Input value="Std." readOnly className="bg-muted" />
                      </div>
                      <div className="space-y-2">
                        <Label>Einheitspreis</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.hourly_rate ?? ""}
                          onChange={(e) => updateItem(index, "hourly_rate", parseDecimal(e.target.value, 0))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Rabatt %</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.discount_percent ?? ""}
                          onChange={(e) => updateItem(index, "discount_percent", parseDecimal(e.target.value, 0))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Gesamt</Label>
                        <div className="font-semibold">{formatCurrency(item.net_total ?? 0)}</div>
                      </div>
                      <div>
                        <Button variant="ghost" size="icon" onClick={() => removeItem(index)} className="text-red-400">
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
                    Optionaler Einleitungstext, der auf dem BAU-Angebot über der Positionstabelle erscheint.
                  </p>
                </CardHeader>
                <CardContent>
                  <textarea
                    value={projectScopeShort}
                    onChange={(e) => setProjectScopeShort(e.target.value)}
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
                    {bauItems.map((item, idx) => {
                      if (item.kind !== "position") return null;
                      return (
                      <div key={item.id} className="flex gap-3 items-start p-3 rounded-lg border border-border bg-secondary/50">
                        <div className="flex-shrink-0 pt-2 text-sm text-muted-foreground w-8">{idx + 1}.</div>
                        <div className="flex-1 space-y-2">
                          <Input
                            placeholder="Leistungsbeschreibung..."
                            value={item.description}
                            onChange={(e) => updateBauItem(item.id, "description", e.target.value)}
                            className="bg-background"
                          />
                          <div className="flex flex-wrap gap-2 items-center">
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="Anzahl"
                              value={item.quantity ?? ""}
                              onChange={(e) => updateBauItem(item.id, "quantity", parseDecimal(e.target.value, 1))}
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
                              value={item.price ?? ""}
                              onChange={(e) => updateBauItem(item.id, "price", parseDecimal(e.target.value, 0))}
                              className="bg-background w-32"
                            />
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step="0.01"
                              placeholder="Rabatt %"
                              value={item.discount_percent ?? ""}
                              onChange={(e) => updateBauItem(item.id, "discount_percent", parseDecimal(e.target.value, 0))}
                              className="bg-background w-24"
                            />
                            <span className="text-sm font-medium">
                              = {formatCurrency(bauLineTotal(item.quantity, item.price, item.discount_percent ?? 0))}
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
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Weitere Positionen */}
          <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Weitere Positionen</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addAddon}
              className="border-border"
            >
              <Plus className="mr-2 h-4 w-4" />
              Position hinzufügen
            </Button>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Z. B. Marketing Plan – erscheinen in der Tabelle „Leistungen“ und in der Summe Positionen.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {addons.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Keine weiteren Positionen. Klicken Sie auf &quot;Position hinzufügen&quot; (z. B. Marketing Plan).
              </p>
            ) : (
              addons.map((addon) => (
                <div
                  key={addon.id}
                  className="flex gap-3 items-start p-3 rounded-lg border border-border bg-secondary/50"
                >
                  <div className="flex-1 grid gap-2 sm:grid-cols-2">
                    <Input
                      placeholder="Titel (z. B. Marketing Plan)"
                      value={addon.title}
                      onChange={(e) => updateAddon(addon.id, "title", e.target.value)}
                      className="bg-background"
                    />
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Preis (€)"
                      value={addon.price ? addon.price : ""}
                      onChange={(e) =>
                        updateAddon(addon.id, "price", parseDecimal(e.target.value, 0))
                      }
                      className="bg-background w-32"
                    />
                  </div>
                  <Textarea
                    placeholder="Beschreibung (optional)"
                    value={addon.description}
                    onChange={(e) => updateAddon(addon.id, "description", e.target.value)}
                    className="min-h-[60px] resize-none bg-background flex-1"
                    rows={2}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeAddon(addon.id)}
                    className="flex-shrink-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
          {addonsSum > 0 && (
            <p className="text-sm font-medium mt-3">
              Summe (diese Positionen): {formatCurrency(addonsSum)}
            </p>
          )}
        </CardContent>
      </Card>

          {/* Globale Einstellungen */}
          <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Globale Einstellungen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Globalrabatt (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={globalDiscount || ""}
                onChange={(e) => setGlobalDiscount(parseDecimal(e.target.value, 0))}
                className="bg-secondary"
              />
            </div>
            <div className="space-y-2">
              <Label>MwSt. (%)</Label>
              <Input
                type="number"
                min={0}
                value={vatPercent || ""}
                onChange={(e) => setVatPercent(parseDecimal(e.target.value, 0))}
                className="bg-secondary"
              />
              <p className="text-xs text-muted-foreground">0 = Kleinunternehmer</p>
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Express */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Express-Zuschlag</Label>
              <p className="text-sm text-muted-foreground">
                Aufschlag für Eilaufträge
              </p>
            </div>
            <Switch checked={expressEnabled} onCheckedChange={setExpressEnabled} />
          </div>
          {expressEnabled && (
            <div className="space-y-2 ml-4">
              <Label>Zuschlag (%)</Label>
              <Input
                type="number"
                min={0}
                value={expressSurcharge || ""}
                onChange={(e) =>
                  setExpressSurcharge(parseDecimal(e.target.value, 0))
                }
                className="bg-secondary w-32"
              />
            </div>
          )}

          <Separator className="bg-border" />

          {/* Hosting */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Hosting-Setup</Label>
              <p className="text-sm text-muted-foreground">
                Einmalige Einrichtungsgebühr
              </p>
            </div>
            <Switch checked={hostingEnabled} onCheckedChange={setHostingEnabled} />
          </div>
          {hostingEnabled && (
            <div className="space-y-2 ml-4">
              <Label>Setup-Gebühr (€)</Label>
              <Input
                type="number"
                min={0}
                value={hostingFee || ""}
                onChange={(e) => setHostingFee(parseDecimal(e.target.value, 0))}
                className="bg-secondary w-32"
              />
            </div>
          )}

          <Separator className="bg-border" />

          {/* Maintenance */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Wartung & Support</Label>
              <p className="text-sm text-muted-foreground">
                Monatliche Wartungsgebühr
              </p>
            </div>
            <Switch
              checked={maintenanceEnabled}
              onCheckedChange={setMaintenanceEnabled}
            />
          </div>
          {maintenanceEnabled && (
            <div className="grid gap-4 sm:grid-cols-2 ml-4">
              <div className="space-y-2">
                <Label>Monate</Label>
                <Input
                  type="number"
                  min={1}
                  value={maintenanceMonths || ""}
                  onChange={(e) =>
                    setMaintenanceMonths(Math.max(0, Math.floor(parseDecimal(e.target.value, 0))))
                  }
                  className="bg-secondary"
                />
              </div>
              <div className="space-y-2">
                <Label>Monatlich (€)</Label>
                <Input
                  type="number"
                  min={0}
                  value={maintenanceMonthly || ""}
                  onChange={(e) =>
                    setMaintenanceMonthly(parseDecimal(e.target.value, 0))
                  }
                  className="bg-secondary"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
        </div>

        {/* Rechte Spalte – 1:1 wie Rechnung: Zusammenfassung */}
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
                  value={vatPercent ?? ""}
                  onChange={(e) => setVatPercent(parseDecimal(e.target.value, 0))}
                />
              </div>
              <div className="pt-4 border-t border-border space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Nettobetrag:</span>
                  <span>{formatCurrency((calc.subtotal_before_vat ?? 0) + addonsSum)}</span>
                </div>
                {vatPercent > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Umsatzsteuer:</span>
                    <span>+{formatCurrency(calc.vat_amount ?? 0)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-border" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Angebotsbetrag:</span>
                  <span className="text-primary">{formatCurrency(totalWithAddons)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
