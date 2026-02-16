"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Client,
  Project,
  OfferItem,
  Offer,
  SERVICE_NAMES,
  PACKAGE_PRESETS,
  OFFER_STATUSES,
} from "@/lib/types";
import { calculateOffer, formatCurrency, formatNumber } from "@/lib/calculations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2,
  ArrowLeft,
  Calculator,
  Package,
  Save,
  Plus,
  Trash2,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const defaultItems: OfferItem[] = SERVICE_NAMES.map((name, i) => ({
  position: i + 1,
  service_name: name,
  hours: 0,
  hourly_rate: 55,
  discount_percent: 0,
  net_total: 0,
}));

export default function EditOfferPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const offerId = params.id as string;

  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [offerNumber, setOfferNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [validUntil, setValidUntil] = useState("");
  const [consultantName, setConsultantName] = useState("");
  const [consultantPhone, setConsultantPhone] = useState("");
  const [status, setStatus] = useState<string>("draft");
  const [offerType, setOfferType] = useState<"it" | "bau">("it");

  // IT Line items
  const [items, setItems] = useState<OfferItem[]>(defaultItems);
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [recommendedHours, setRecommendedHours] = useState<number[]>([]);

  // BAU Line items (dynamic)
  const [bauItems, setBauItems] = useState<
    Array<{ id: string; description: string; price: number }>
  >([{ id: "1", description: "", price: 0 }]);

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

  // Convert BAU items to OfferItem format for calculation
  const bauItemsAsOfferItems = useMemo(() => {
    return bauItems.map((item, idx) => ({
      position: idx + 1,
      service_name: item.description,
      hours: undefined,
      hourly_rate: undefined,
      discount_percent: 0,
      net_total: item.price,
    }));
  }, [bauItems]);

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
      // Load clients and projects
      const [clientsRes, projectsRes, offerRes, itemsRes] = await Promise.all([
        supabase.from("clients").select("*").order("name"),
        supabase.from("projects").select("*").order("title"),
        supabase.from("offers").select("*").eq("id", offerId).single(),
        supabase
          .from("offer_items")
          .select("*")
          .eq("offer_id", offerId)
          .order("position"),
      ]);

      setClients(clientsRes.data || []);
      setProjects(projectsRes.data || []);

      if (offerRes.error || !offerRes.data) {
        toast.error("Angebot nicht gefunden");
        router.push("/app/offers");
        return;
      }

      const offer = offerRes.data as Offer;

      // Populate form with existing data
      setClientId(offer.client_id);
      setProjectId(offer.project_id || "");
      setOfferNumber(offer.offer_number);
      setDate(offer.date);
      setValidUntil(offer.valid_until || "");
      setConsultantName(offer.consultant_name || "");
      setConsultantPhone(offer.consultant_phone || "");
      setStatus(offer.status);
      setGlobalDiscount(offer.global_discount_percent);
      setExpressEnabled(offer.express_enabled);
      setExpressSurcharge(offer.express_surcharge_percent);
      setHostingEnabled(offer.hosting_setup_enabled);
      setHostingFee(offer.hosting_setup_fee);
      setMaintenanceEnabled(offer.maintenance_enabled);
      setMaintenanceMonths(offer.maintenance_months);
      setMaintenanceMonthly(offer.maintenance_monthly_fee);
      setVatPercent(offer.vat_percent);
      setOfferType((offer.offer_type as "it" | "bau") || "it");

      // Load existing items
      if (itemsRes.data && itemsRes.data.length > 0) {
        const offerTypeFromData = (offer.offer_type as "it" | "bau") || "it";

        if (offerTypeFromData === "bau") {
          // BAU items: direct price entries
          const bauItemsData = itemsRes.data.map((item: any, idx: number) => ({
            id: item.id || `item-${idx}`,
            description: item.service_name || "",
            price: item.net_total || 0,
          }));
          setBauItems(bauItemsData.length > 0 ? bauItemsData : [{ id: "1", description: "", price: 0 }]);
        } else {
          // IT items
          const existingItems = itemsRes.data.map((item: any) => ({
            id: item.id,
            position: item.position,
            service_name: item.service_name,
            hours: item.hours,
            hourly_rate: item.hourly_rate,
            discount_percent: item.discount_percent,
            net_total: item.net_total,
          }));

          // Merge with default items to ensure all services are present
          const mergedItems = defaultItems.map((defaultItem) => {
            const existing = existingItems.find(
              (e: OfferItem) => e.position === defaultItem.position
            );
            return existing || defaultItem;
          });

          setItems(mergedItems);
        }
      }

      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerId]);

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

  function applyPreset(key: string) {
    const preset = PACKAGE_PRESETS[key];
    if (!preset) return;
    setSelectedPreset(key);
    setRecommendedHours(preset.hours);
  }

  function applyRecommendedHours() {
    setItems((prev) =>
      prev.map((item, i) => {
        const hours = recommendedHours[i] ?? item.hours;
        const rate = item.hourly_rate || 0;
        return {
          ...item,
          hours,
          net_total: hours * rate * (1 - item.discount_percent / 100),
        };
      })
    );
    toast.success("Empfohlene Stunden angewendet");
  }

  // BAU functions
  function addBauItem() {
    setBauItems((prev) => [
      ...prev,
      { id: Date.now().toString(), description: "", price: 0 },
    ]);
  }

  function removeBauItem(id: string) {
    setBauItems((prev) => prev.filter((item) => item.id !== id));
  }

  function updateBauItem(
    id: string,
    field: "description" | "price",
    value: string | number
  ) {
    setBauItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
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

    // Update offer
    const { error: offerError } = await supabase
      .from("offers")
      .update({
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
        total: calc.total,
        status,
        offer_type: offerType,
      })
      .eq("id", offerId);

    if (offerError) {
      toast.error("Fehler beim Aktualisieren", { description: offerError.message });
      setSaving(false);
      return;
    }

    // Delete existing items
    await supabase.from("offer_items").delete().eq("offer_id", offerId);

    // Insert updated items - ONLY items of the current offer type
    let itemsToInsert: any[] = [];
    if (offerType === "it") {
      itemsToInsert = items
        .filter((item) => (item.hours || 0) > 0)
        .map((item) => ({
          offer_id: offerId,
          position: item.position,
          service_name: item.service_name,
          hours: item.hours ?? 0, // Ensure it's never undefined
          hourly_rate: item.hourly_rate ?? 55, // Ensure it's never undefined
          discount_percent: item.discount_percent,
          net_total:
            (item.hours || 0) *
            (item.hourly_rate || 0) *
            (1 - item.discount_percent / 100),
        }));
    } else {
      // BAU - only use bauItems, ignore IT items completely
      itemsToInsert = bauItems
        .filter((item) => item.description.trim() && item.price > 0)
        .map((item, idx) => ({
          offer_id: offerId,
          position: idx + 1,
          service_name: item.description,
          hours: null,
          hourly_rate: null,
          discount_percent: 0,
          net_total: item.price,
        }));
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

    toast.success("Angebot aktualisiert");
    router.push(`/app/offers/${offerId}`);
  }

  const filteredProjects = projectId
    ? projects
    : clientId
      ? projects.filter((p) => p.client_id === clientId)
      : projects;

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
          <Button
            variant="ghost"
            onClick={() => router.push(`/app/offers/${offerId}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Button>
          <h1 className="text-2xl font-bold text-foreground">
            Angebot bearbeiten
          </h1>
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

      {/* Offer Type Tabs */}
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

      {/* Header Fields */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Angebotsdetails</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Kunde *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Kunde wählen..." />
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
              <Select
                value={projectId || "none"}
                onValueChange={(v) => setProjectId(v === "none" ? "" : v)}
              >
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Projekt wählen..." />
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
              <Label>Angebotsnr. *</Label>
              <Input
                value={offerNumber}
                onChange={(e) => setOfferNumber(e.target.value)}
                className="bg-secondary"
              />
            </div>
            <div className="space-y-2">
              <Label>Datum</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-secondary"
              />
            </div>
            <div className="space-y-2">
              <Label>Gültig bis</Label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="bg-secondary"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OFFER_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === "draft"
                        ? "Entwurf"
                        : s === "sent"
                          ? "Gesendet"
                          : s === "accepted"
                            ? "Angenommen"
                            : "Abgelehnt"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Berater</Label>
            <Select
              value={
                consultantName && consultantPhone
                  ? `${consultantName}|${consultantPhone}`
                  : ""
              }
              onValueChange={(value) => {
                if (value) {
                  const [name, phone] = value.split("|");
                  setConsultantName(name);
                  setConsultantPhone(phone);
                } else {
                  setConsultantName("");
                  setConsultantPhone("");
                }
              }}
            >
              <SelectTrigger className="bg-secondary">
                <SelectValue placeholder="Berater wählen..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Boris Plesnicar|+43 664 4678382">
                  Boris Plesnicar (+43 664 4678382)
                </SelectItem>
                <SelectItem value="Dietmar Plesnicar|+43 676 3206308">
                  Dietmar Plesnicar (+43 676 3206308)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* IT / BAU Content */}
      <Tabs value={offerType} onValueChange={(v) => setOfferType(v as "it" | "bau")}>
        <TabsContent value="it" className="space-y-6">
          {/* Package Presets */}
          <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Paket-Vorlagen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(PACKAGE_PRESETS).map(([key, preset]) => (
              <Button
                key={key}
                variant={selectedPreset === key ? "default" : "outline"}
                size="sm"
                onClick={() => applyPreset(key)}
                className={
                  selectedPreset === key
                    ? "bg-primary text-primary-foreground"
                    : "border-border"
                }
              >
                {preset.label}
              </Button>
            ))}
          </div>
          {recommendedHours.length > 0 && (
            <Button
              size="sm"
              onClick={applyRecommendedHours}
              className="bg-primary/10 text-primary hover:bg-primary/20"
            >
              Empfohlene Stunden anwenden
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Positions */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Positionen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-3 text-left font-medium">Pos.</th>
                  <th className="pb-3 text-left font-medium">Leistung</th>
                  <th className="pb-3 text-right font-medium w-24">Std.</th>
                  <th className="pb-3 text-right font-medium w-24">€/h</th>
                  <th className="pb-3 text-right font-medium w-24">Rabatt %</th>
                  <th className="pb-3 text-right font-medium w-28">Netto (€)</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b border-border/50">
                    <td className="py-3 text-muted-foreground">{item.position}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span>{item.service_name}</span>
                        {recommendedHours[idx] !== undefined &&
                          recommendedHours[idx] > 0 && (
                            <Badge
                              variant="outline"
                              className="text-xs bg-primary/10 text-primary border-primary/20"
                            >
                              Empf: {recommendedHours[idx]}h
                            </Badge>
                          )}
                      </div>
                    </td>
                    <td className="py-3">
                      <Input
                        type="number"
                        min={0}
                        value={item.hours || ""}
                        onChange={(e) =>
                          updateItem(idx, "hours", parseFloat(e.target.value) || 0)
                        }
                        className="bg-secondary text-right w-20 ml-auto"
                      />
                    </td>
                    <td className="py-3">
                      <Input
                        type="number"
                        min={0}
                        value={item.hourly_rate || ""}
                        onChange={(e) =>
                          updateItem(
                            idx,
                            "hourly_rate",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="bg-secondary text-right w-20 ml-auto"
                      />
                    </td>
                    <td className="py-3">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={item.discount_percent || ""}
                        onChange={(e) =>
                          updateItem(
                            idx,
                            "discount_percent",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="bg-secondary text-right w-20 ml-auto"
                      />
                    </td>
                    <td className="py-3 text-right font-medium">
                      {formatCurrency(
                        (item.hours || 0) *
                          (item.hourly_rate || 0) *
                          (1 - item.discount_percent / 100)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="bau" className="space-y-6">
          {/* BAU Positions */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Leistungen
                </div>
                <Button
                  size="sm"
                  onClick={addBauItem}
                  className="bg-primary text-primary-foreground hover:bg-red-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Zeile hinzufügen
                </Button>
              </CardTitle>
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
                          = {formatCurrency(item.price)}
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

      {/* Global Controls */}
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
                onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                className="bg-secondary"
              />
            </div>
            <div className="space-y-2">
              <Label>MwSt. (%)</Label>
              <Input
                type="number"
                min={0}
                value={vatPercent || ""}
                onChange={(e) => setVatPercent(parseFloat(e.target.value) || 0)}
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
                  setExpressSurcharge(parseFloat(e.target.value) || 0)
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
                onChange={(e) => setHostingFee(parseFloat(e.target.value) || 0)}
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
                    setMaintenanceMonths(parseInt(e.target.value) || 0)
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
                    setMaintenanceMonthly(parseFloat(e.target.value) || 0)
                  }
                  className="bg-secondary"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calculation Summary + KPIs */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Zusammenfassung</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Calculation */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Summe Positionen</span>
                <span>{formatCurrency(calc.sum_positions)}</span>
              </div>
              {globalDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Globalrabatt ({globalDiscount}%)
                  </span>
                  <span className="text-green-400">
                    -{formatCurrency(calc.global_discount_eur)}
                  </span>
                </div>
              )}
              {expressEnabled && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Express ({expressSurcharge}%)
                  </span>
                  <span className="text-yellow-400">
                    +{formatCurrency(calc.express_surcharge_eur)}
                  </span>
                </div>
              )}
              {hostingEnabled && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Hosting-Setup</span>
                  <span>+{formatCurrency(calc.hosting_total)}</span>
                </div>
              )}
              {maintenanceEnabled && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Wartung ({maintenanceMonths} Mon.)
                  </span>
                  <span>+{formatCurrency(calc.maintenance_total)}</span>
                </div>
              )}
              {vatPercent > 0 && (
                <>
                  <Separator className="bg-border" />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Netto</span>
                    <span>{formatCurrency(calc.subtotal_before_vat)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      MwSt. ({vatPercent}%)
                    </span>
                    <span>+{formatCurrency(calc.vat_amount)}</span>
                  </div>
                </>
              )}
              <Separator className="bg-border" />
              <div className="flex justify-between text-lg font-bold">
                <span>Gesamt</span>
                <span className="text-primary">{formatCurrency(calc.total)}</span>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 gap-4">
              {offerType === "it" && (
                <>
                  <div className="rounded-lg border border-border bg-secondary p-4">
                    <p className="text-xs text-muted-foreground">Gesamtstunden</p>
                    <p className="text-2xl font-bold">{formatNumber(calc.total_hours, 1)}h</p>
                  </div>
                  <div className="rounded-lg border border-border bg-secondary p-4">
                    <p className="text-xs text-muted-foreground">Effektiv €/Std.</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(calc.effective_eur_per_hour)}
                    </p>
                  </div>
                </>
              )}
              {globalDiscount > 0 && (
                <div className="rounded-lg border border-border bg-secondary p-4">
                  <p className="text-xs text-muted-foreground">Rabatt (€)</p>
                  <p className="text-2xl font-bold text-green-400">
                    {formatCurrency(calc.global_discount_eur)}
                  </p>
                </div>
              )}
              {expressEnabled && (
                <div className="rounded-lg border border-border bg-secondary p-4">
                  <p className="text-xs text-muted-foreground">Express (€)</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {formatCurrency(calc.express_surcharge_eur)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
