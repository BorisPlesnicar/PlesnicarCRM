"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Offer, OFFER_STATUSES } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { toast } from "sonner";
import { Plus, Search, Loader2, Eye, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/calculations";

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

export default function OffersPage() {
  const [offers, setOffers] = useState<(Offer & { clients?: { name: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const router = useRouter();
  const supabase = createClient();

  async function loadOffers() {
    const { data, error } = await supabase
      .from("offers")
      .select("*, clients(name)")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Fehler beim Laden");
    } else {
      setOffers(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadOffers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Angebot wirklich löschen?")) return;
    const { error } = await supabase.from("offers").delete().eq("id", id);
    if (error) {
      toast.error("Fehler", { description: error.message });
    } else {
      toast.success("Angebot gelöscht");
      loadOffers();
    }
  }

  const filtered = offers.filter((o) => {
    const matchSearch =
      o.offer_number.toLowerCase().includes(search.toLowerCase()) ||
      (o.clients as unknown as { name: string })?.name
        ?.toLowerCase()
        .includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Angebote</h1>
          <p className="text-muted-foreground">
            {offers.length} Angebote insgesamt
          </p>
        </div>
        <Button
          onClick={() => router.push("/app/offers/new")}
          className="bg-primary text-primary-foreground hover:bg-red-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Neues Angebot
        </Button>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-secondary pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full bg-secondary sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              {OFFER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabels[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Nr.</TableHead>
                <TableHead>Kunde</TableHead>
                <TableHead className="hidden sm:table-cell">Datum</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Keine Angebote gefunden
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((offer) => (
                  <TableRow
                    key={offer.id}
                    className="border-border cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/app/offers/${offer.id}`)}
                  >
                    <TableCell className="font-medium">
                      {offer.offer_number}
                      {offer.offer_type && (
                        <Badge variant="outline" className={`ml-2 ${offer.offer_type === "bau" ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"}`}>
                          {offer.offer_type === "bau" ? "BAU" : "IT"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {(offer.clients as unknown as { name: string })?.name || "–"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {offer.date}
                    </TableCell>
                    <TableCell className="font-semibold text-primary">
                      {formatCurrency(offer.total)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusColors[offer.status]}
                      >
                        {statusLabels[offer.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/app/offers/${offer.id}`);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(offer.id);
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
