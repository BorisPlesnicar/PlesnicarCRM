"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/app/app/AuthProvider";
import {
  Client,
  Project,
  OfferItem,
  Offer,
  OfferAddon,
  OFFER_STATUSES,
  SERVICE_NAMES,
  PACKAGE_PRESETS,
} from "@/lib/types";
import { calculateOffer, formatCurrency } from "@/lib/calculations";
import { nextRowId } from "@/lib/bau-invoice-rows";
import {
  type BauFormRow,
  defaultBauPositionRow,
  offerItemsToFormRows,
  buildOfferItemInserts,
  insertOfferItems,
  bauFormRowsToOfferCalcLineItems,
  offerRowsHaveBillablePosition,
} from "@/lib/bau-offer-rows";
import {
  DocumentLineEditor,
  IntroTextCard,
  parseDecimalInput,
} from "@/components/documents/document-line-editor";
import { OfferItModules, type ItModuleState } from "@/components/offers/offer-it-modules";
import { OfferAddonsEditor, type AddonFormRow } from "@/components/offers/offer-addons-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EditOfferPage() {
  const params = useParams();
  const router = useRouter();
  const { canWrite, loading: authLoading } = useAuth();
  const supabase = createClient();
  const offerId = params.id as string;

  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Stammdaten
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [offerNumber, setOfferNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [validUntil, setValidUntil] = useState("");
  const [consultantName, setConsultantName] = useState("");
  const [consultantPhone, setConsultantPhone] = useState("");
  const [status, setStatus] = useState<string>("draft");
  const [offerType, setOfferType] = useState<"it" | "bau">("it");
  const [introText, setIntroText] = useState("");
  const [projectScope, setProjectScope] = useState("");

  // Positionen – gleiche Struktur wie Rechnung
  const [rows, setRows] = useState<BauFormRow[]>([defaultBauPositionRow(nextRowId(), "Std.")]);

  // Kalkulation
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [vatPercent, setVatPercent] = useState(0);
  const [addons, setAddons] = useState<AddonFormRow[]>([]);

  // IT-Module
  const [itModules, setItModules] = useState<ItModuleState>({
    packagePreset: "",
    expressEnabled: false,
    expressSurcharge: 20,
    hostingEnabled: false,
    hostingFee: 150,
    maintenanceEnabled: false,
    maintenanceMonths: 12,
    maintenanceMonthly: 49,
  });

  const isIt = offerType === "it";
  const defaultUnit = isIt ? "Std." : "Stk";

  const calcLineItems = useMemo(() => bauFormRowsToOfferCalcLineItems(rows), [rows]);

  const calc = useMemo(
    () =>
      calculateOffer(
        calcLineItems,
        globalDiscount,
        itModules.expressEnabled,
        itModules.expressSurcharge,
        itModules.hostingEnabled,
        itModules.hostingFee,
        itModules.maintenanceEnabled,
        itModules.maintenanceMonths,
        itModules.maintenanceMonthly,
        vatPercent
      ),
    [calcLineItems, globalDiscount, itModules, vatPercent]
  );

  const addonsSum = useMemo(
    () => addons.reduce((s, a) => s + (Number(a.price) || 0), 0),
    [addons]
  );
  const totalWithAddons = calc.total + addonsSum;

  useEffect(() => {
    async function load() {
      const [clientsRes, projectsRes, offerRes, itemsRes, addonsRes] = await Promise.all([
        supabase.from("clients").select("*").order("name"),
        supabase.from("projects").select("*").order("title"),
        supabase.from("offers").select("*").eq("id", offerId).single(),
        supabase.from("offer_items").select("*").eq("offer_id", offerId).order("position"),
        supabase.from("offer_addons").select("*").eq("offer_id", offerId),
      ]);

      setClients(clientsRes.data || []);
      setProjects(projectsRes.data || []);

      if (offerRes.error || !offerRes.data) {
        toast.error("Angebot nicht gefunden");
        router.push("/app/offers");
        return;
      }

      const offer = offerRes.data as Offer;
      const loadedType = (offer.offer_type as "it" | "bau") || "it";

      setClientId(offer.client_id);
      setProjectId(offer.project_id || "");
      setOfferNumber(offer.offer_number);
      setDate(offer.date);
      setValidUntil(offer.valid_until || "");
      setConsultantName(offer.consultant_name || "");
      setConsultantPhone(offer.consultant_phone || "");
      setStatus(offer.status);
      setGlobalDiscount(offer.global_discount_percent);
      setVatPercent(offer.vat_percent);
      setOfferType(loadedType);
      setIntroText(offer.project_scope_short || "");
      setProjectScope(offer.project_scope || "");
      setItModules({
        packagePreset: "",
        expressEnabled: offer.express_enabled,
        expressSurcharge: offer.express_surcharge_percent,
        hostingEnabled: offer.hosting_setup_enabled,
        hostingFee: offer.hosting_setup_fee,
        maintenanceEnabled: offer.maintenance_enabled,
        maintenanceMonths: offer.maintenance_months,
        maintenanceMonthly: offer.maintenance_monthly_fee,
      });

      if (addonsRes.data && addonsRes.data.length > 0) {
        setAddons(
          addonsRes.data.map((a: OfferAddon & { id: string }, idx: number) => ({
            id: a.id || `addon-${idx}`,
            title: a.title || "",
            description: a.description || "",
            price: Number(a.price) || 0,
          }))
        );
      }

      const loadedItems = (itemsRes.data || []) as OfferItem[];
      setRows(
        loadedItems.length > 0
          ? offerItemsToFormRows(loadedItems, loadedType)
          : [defaultBauPositionRow(nextRowId(), loadedType === "bau" ? "Stk" : "Std.")]
      );

      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerId]);

  function applyPackagePreset(presetKey: string) {
    const preset = PACKAGE_PRESETS[presetKey];
    if (!preset) return;
    const firstPosition = rows.find((r) => r.kind === "position");
    const rate =
      firstPosition && firstPosition.kind === "position" && firstPosition.price > 0
        ? firstPosition.price
        : 55;
    setRows(
      SERVICE_NAMES.map((name, i) => ({
        id: nextRowId(),
        kind: "position" as const,
        description: name,
        quantity: preset.hours[i] ?? 0,
        unit: "Std.",
        price: rate,
        discount_percent: 0,
      }))
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
    if (!offerRowsHaveBillablePosition(rows)) {
      toast.error("Bitte fügen Sie mindestens eine Position mit Beschreibung und Preis hinzu");
      return;
    }

    setSaving(true);

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
        express_enabled: itModules.expressEnabled,
        express_surcharge_percent: itModules.expressSurcharge,
        hosting_setup_enabled: itModules.hostingEnabled,
        hosting_setup_fee: itModules.hostingFee,
        maintenance_enabled: itModules.maintenanceEnabled,
        maintenance_months: itModules.maintenanceMonths,
        maintenance_monthly_fee: itModules.maintenanceMonthly,
        project_scope_short: introText.trim() || null,
        project_scope: projectScope || null,
        project_scope_images: null,
        total: totalWithAddons,
        status,
        offer_type: offerType,
      })
      .eq("id", offerId);

    if (offerError) {
      toast.error("Fehler beim Aktualisieren", { description: offerError.message });
      setSaving(false);
      return;
    }

    await supabase.from("offer_items").delete().eq("offer_id", offerId);

    const itemRows = buildOfferItemInserts(offerId, rows, offerType);
    const itemsRes = await insertOfferItems(supabase, itemRows);
    if (itemsRes.error) {
      toast.error("Fehler bei Positionen", { description: itemsRes.error.message });
      setSaving(false);
      return;
    }
    if (itemsRes.textBlocksSkipped) {
      toast.warning("Abschnittstexte nicht gespeichert", {
        description: "Migration 037_offer_items_row_kind.sql fehlt noch in der Datenbank.",
      });
    }

    await supabase.from("offer_addons").delete().eq("offer_id", offerId);
    const addonsToInsert = addons
      .filter((a) => (a.title || "").trim() && (Number(a.price) || 0) > 0)
      .map((a) => ({
        offer_id: offerId,
        title: a.title.trim(),
        description: a.description.trim() || null,
        price: Number(a.price) || 0,
      }));
    if (addonsToInsert.length > 0) {
      const { error: addonsError } = await supabase.from("offer_addons").insert(addonsToInsert);
      if (addonsError) {
        toast.error("Fehler bei weiteren Positionen", { description: addonsError.message });
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

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canWrite) {
    router.replace(`/app/offers/${offerId}`);
    return null;
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push(`/app/offers/${offerId}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Angebot bearbeiten</h1>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-primary-foreground hover:bg-red-700 rounded-xl"
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Speichern
        </Button>
      </div>

      <Card className="border-border/60 bg-card/60 backdrop-blur-xl rounded-2xl">
        <CardContent className="pt-6">
          <Tabs value={offerType} onValueChange={(v) => setOfferType(v as "it" | "bau")}>
            <TabsList className="grid w-full grid-cols-2 rounded-xl">
              <TabsTrigger value="it" className="rounded-lg">
                IT Angebot
              </TabsTrigger>
              <TabsTrigger value="bau" className="rounded-lg">
                BAU Angebot
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/60 bg-card/60 backdrop-blur-xl rounded-2xl">
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
                  <Select
                    value={projectId || "none"}
                    onValueChange={(v) => setProjectId(v === "none" ? "" : v)}
                  >
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
                  <Input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                  />
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
            </CardContent>
          </Card>

          <IntroTextCard
            value={introText}
            onChange={setIntroText}
            hint="Optionaler Einleitungstext, der auf dem Angebot über der Positionstabelle erscheint."
          />
          <DocumentLineEditor rows={rows} onRowsChange={setRows} defaultUnit={defaultUnit} />

          <OfferAddonsEditor addons={addons} onChange={setAddons} />

          {isIt && (
            <OfferItModules
              state={itModules}
              amounts={{
                expressEur: calc.express_surcharge_eur,
                hostingEur: calc.hosting_total,
                maintenanceEur: calc.maintenance_total,
              }}
              onChange={(patch) => setItModules((prev) => ({ ...prev, ...patch }))}
              onApplyPreset={applyPackagePreset}
            />
          )}

          {isIt && (
            <Card className="border-border/60 bg-card/60 backdrop-blur-xl rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Projektumfang (intern / Angebotsdetail)</CardTitle>
                <p className="text-sm text-muted-foreground font-normal">
                  Ausführliche Beschreibung – erscheint im CRM auf der Angebotsseite, nicht in der
                  PDF.
                </p>
              </CardHeader>
              <CardContent>
                <textarea
                  value={projectScope}
                  onChange={(e) => setProjectScope(e.target.value)}
                  rows={4}
                  placeholder="Detaillierte Leistungsbeschreibung …"
                  className="flex min-h-[100px] w-full rounded-xl border border-input bg-background/60 px-3 py-2 text-sm backdrop-blur-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="border-border/60 bg-card/60 backdrop-blur-xl rounded-2xl lg:sticky lg:top-6">
            <CardHeader>
              <CardTitle>Zusammenfassung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Globalrabatt %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={globalDiscount || ""}
                    onChange={(e) => setGlobalDiscount(parseDecimalInput(e.target.value, 0))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Umsatzsteuer %</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={vatPercent ?? ""}
                    onChange={(e) => setVatPercent(parseDecimalInput(e.target.value, 0))}
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-border/60 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Summe Positionen:</span>
                  <span className="tabular-nums">
                    {formatCurrency(calc.sum_positions + addonsSum)}
                  </span>
                </div>
                {globalDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Globalrabatt ({globalDiscount}%):</span>
                    <span className="tabular-nums text-emerald-500">
                      −{formatCurrency(calc.global_discount_eur)}
                    </span>
                  </div>
                )}
                {itModules.expressEnabled && calc.express_surcharge_eur > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Express-Zuschlag:</span>
                    <span className="tabular-nums">
                      +{formatCurrency(calc.express_surcharge_eur)}
                    </span>
                  </div>
                )}
                {itModules.hostingEnabled && calc.hosting_total > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Hosting-Setup:</span>
                    <span className="tabular-nums">+{formatCurrency(calc.hosting_total)}</span>
                  </div>
                )}
                {itModules.maintenanceEnabled && calc.maintenance_total > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Wartung ({itModules.maintenanceMonths} Mon.):
                    </span>
                    <span className="tabular-nums">+{formatCurrency(calc.maintenance_total)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-border/60" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Nettobetrag:</span>
                  <span className="tabular-nums">
                    {formatCurrency((calc.subtotal_before_vat ?? 0) + addonsSum)}
                  </span>
                </div>
                {vatPercent > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Umsatzsteuer:</span>
                    <span className="tabular-nums">+{formatCurrency(calc.vat_amount ?? 0)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-border/60" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Angebotsbetrag:</span>
                  <span className="text-primary tabular-nums">
                    {formatCurrency(totalWithAddons)}
                  </span>
                </div>
                {isIt && calc.total_hours > 0 && (
                  <p className="pt-2 text-xs text-muted-foreground">
                    {calc.total_hours} Std. · effektiv{" "}
                    {formatCurrency(calc.effective_eur_per_hour)} / Std.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
