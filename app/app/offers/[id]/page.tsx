"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Offer, OfferItem, Client, OFFER_STATUSES } from "@/lib/types";
import { calculateOffer, formatCurrency } from "@/lib/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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

const OfferPDF = dynamic(() => import("@/components/offers/offer-pdf"), {
  ssr: false,
});

const statusLabels: Record<string, string> = {
  draft: "Entwurf",
  sent: "Gesendet",
  accepted: "Angenommen",
  rejected: "Abgelehnt",
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  sent: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  accepted: "bg-green-500/10 text-green-400 border-green-500/20",
  rejected: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function OfferDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [items, setItems] = useState<OfferItem[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPdf, setShowPdf] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    async function load() {
      const id = params.id as string;

      const [offerRes, itemsRes] = await Promise.all([
        supabase
          .from("offers")
          .select("*, clients(*), projects(title)")
          .eq("id", id)
          .single(),
        supabase
          .from("offer_items")
          .select("*")
          .eq("offer_id", id)
          .order("position"),
      ]);

      if (offerRes.error) {
        toast.error("Angebot nicht gefunden");
        router.push("/app/offers");
        return;
      }

      setOffer(offerRes.data);
      setItems(itemsRes.data || []);
      setClient(offerRes.data.clients as unknown as Client);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const calc = useMemo(() => {
    if (!offer) return null;
    
    // For BAU offers, use net_total directly; for IT offers, calculate from hours/rate
    const itemsForCalc = items.map((i) => {
      if (offer.offer_type === "bau") {
        // BAU: use net_total directly
        return {
          net_total: i.net_total || 0,
          discount_percent: i.discount_percent,
        };
      } else {
        // IT: calculate from hours and rate
        return {
          hours: i.hours,
          hourly_rate: i.hourly_rate,
          discount_percent: i.discount_percent,
        };
      }
    });
    
    return calculateOffer(
      itemsForCalc,
      offer.global_discount_percent,
      offer.express_enabled,
      offer.express_surcharge_percent,
      offer.hosting_setup_enabled,
      offer.hosting_setup_fee,
      offer.maintenance_enabled,
      offer.maintenance_months,
      offer.maintenance_monthly_fee,
      offer.vat_percent
    );
  }, [offer, items]);

  async function updateStatus(newStatus: string) {
    if (!offer) return;
    setUpdatingStatus(true);
    const { error } = await supabase
      .from("offers")
      .update({ status: newStatus })
      .eq("id", offer.id);
    if (error) {
      toast.error("Fehler", { description: error.message });
    } else {
      setOffer({ ...offer, status: newStatus as Offer["status"] });
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

  if (!offer || !calc) return null;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/app/offers")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-6 w-6" />
              {offer.offer_number}
            </h1>
            <p className="text-sm text-muted-foreground">
              {client?.name} {client?.company ? `(${client.company})` : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select
            value={offer.status}
            onValueChange={updateStatus}
            disabled={updatingStatus}
          >
            <SelectTrigger className="w-40 bg-secondary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OFFER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabels[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => router.push(`/app/offers/${offer.id}/edit`)}
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
            <p className="text-xs text-muted-foreground">Datum</p>
            <p className="font-medium">{offer.date}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Gültig bis</p>
            <p className="font-medium">{offer.valid_until || "–"}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Status</p>
            <Badge variant="outline" className={statusColors[offer.status]}>
              {statusLabels[offer.status]}
            </Badge>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Gesamt</p>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(calc.total)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Positions */}
      <Card className="border-border bg-card overflow-hidden">
        <CardHeader>
          <CardTitle>Positionen</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Pos.</TableHead>
                <TableHead>Leistung</TableHead>
                {offer.offer_type !== "bau" && (
                  <>
                    <TableHead className="text-right">Std.</TableHead>
                    <TableHead className="text-right">€/h</TableHead>
                    <TableHead className="text-right">Rabatt</TableHead>
                  </>
                )}
                <TableHead className="text-right">Preis (€)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className="border-border">
                  <TableCell className="text-muted-foreground">
                    {item.position}
                  </TableCell>
                  <TableCell className="font-medium">{item.service_name}</TableCell>
                  {offer.offer_type !== "bau" && (
                    <>
                      <TableCell className="text-right">{item.hours || 0}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.hourly_rate || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.discount_percent > 0 ? `${item.discount_percent}%` : "–"}
                      </TableCell>
                    </>
                  )}
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.net_total)}
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
              <span className="text-muted-foreground">Summe Positionen</span>
              <span>{formatCurrency(calc.sum_positions)}</span>
            </div>
            {offer.global_discount_percent > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Globalrabatt ({offer.global_discount_percent}%)
                </span>
                <span className="text-green-400">
                  -{formatCurrency(calc.global_discount_eur)}
                </span>
              </div>
            )}
            {offer.express_enabled && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Express ({offer.express_surcharge_percent}%)
                </span>
                <span className="text-yellow-400">
                  +{formatCurrency(calc.express_surcharge_eur)}
                </span>
              </div>
            )}
            {offer.hosting_setup_enabled && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Hosting-Setup</span>
                <span>+{formatCurrency(calc.hosting_total)}</span>
              </div>
            )}
            {offer.maintenance_enabled && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Wartung ({offer.maintenance_months} Mon.)
                </span>
                <span>+{formatCurrency(calc.maintenance_total)}</span>
              </div>
            )}
            {offer.vat_percent > 0 && (
              <>
                <Separator className="bg-border" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Netto</span>
                  <span>{formatCurrency(calc.subtotal_before_vat)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    MwSt. ({offer.vat_percent}%)
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
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {offer.offer_type !== "bau" && (
              <>
                <div className="rounded-lg border border-border bg-secondary p-3">
                  <p className="text-xs text-muted-foreground">Gesamtstunden</p>
                  <p className="text-xl font-bold">{calc.total_hours}h</p>
                </div>
                <div className="rounded-lg border border-border bg-secondary p-3">
                  <p className="text-xs text-muted-foreground">Effektiv €/Std.</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(calc.effective_eur_per_hour)}
                  </p>
                </div>
              </>
            )}
            {offer.global_discount_percent > 0 && (
              <div className="rounded-lg border border-border bg-secondary p-3">
                <p className="text-xs text-muted-foreground">Rabatt (€)</p>
                <p className="text-xl font-bold text-green-400">
                  {formatCurrency(calc.global_discount_eur)}
                </p>
              </div>
            )}
            {offer.express_enabled && (
              <div className="rounded-lg border border-border bg-secondary p-3">
                <p className="text-xs text-muted-foreground">Express (€)</p>
                <p className="text-xl font-bold text-yellow-400">
                  {formatCurrency(calc.express_surcharge_eur)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* PDF Modal */}
      {showPdf && (
        <OfferPDF
          offer={offer}
          items={items}
          client={client}
          calc={calc}
          onClose={() => setShowPdf(false)}
        />
      )}
    </div>
  );
}
