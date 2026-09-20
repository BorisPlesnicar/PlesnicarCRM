"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/app/app/AuthProvider";
import { Invoice, INVOICE_STATUSES } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Plus, Search, Loader2, Eye, Trash2, Sigma, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/calculations";
import { format } from "date-fns";
import { de } from "date-fns/locale";

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

export default function InvoicesPage() {
  const { canWrite } = useAuth();
  const [invoices, setInvoices] = useState<(Invoice & { clients?: { name: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  /** Rechnungsnummern, die aus der Summe ausgeschlossen sind (z. B. Anzahlungen). */
  const [excludedNumbers, setExcludedNumbers] = useState<string[]>([]);
  const router = useRouter();
  const supabase = createClient();

  async function loadInvoices() {
    const { data, error } = await supabase
      .from("invoices")
      .select("*, clients(name)")
      .order("invoice_date", { ascending: false })
      .order("invoice_number", { ascending: false });
    if (error) {
      toast.error("Fehler beim Laden");
    } else {
      setInvoices(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id: string) {
    if (!canWrite) return;
    if (!confirm("Rechnung wirklich löschen?")) return;
    const { data: inv } = await supabase
      .from("invoices")
      .select("client_id, credit_applied_amount, invoice_number")
      .eq("id", id)
      .single();
    const applied = Number(inv?.credit_applied_amount ?? 0);
    const num = inv?.invoice_number?.trim();
    await supabase.from("transactions").delete().eq("invoice_id", id).eq("type", "income");
    if (num) {
      await supabase
        .from("transactions")
        .delete()
        .eq("description", `Rechnung ${num}`)
        .eq("type", "income");
    }
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) {
      toast.error("Fehler", { description: error.message });
      return;
    }
    if (applied > 0 && inv?.client_id) {
      const { data: c } = await supabase
        .from("clients")
        .select("credit_balance")
        .eq("id", inv.client_id)
        .single();
      await supabase
        .from("clients")
        .update({ credit_balance: Number(c?.credit_balance ?? 0) + applied })
        .eq("id", inv.client_id);
    }
    toast.success("Rechnung gelöscht");
    loadInvoices();
  }

  const filtered = useMemo(
    () =>
      invoices.filter((i) => {
        const matchSearch =
          i.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
          (i.clients as unknown as { name: string })?.name
            ?.toLowerCase()
            .includes(search.toLowerCase());
        const matchStatus = filterStatus === "all" || i.status === filterStatus;
        const matchType =
          filterType === "all" || (i.invoice_type || "it") === filterType;
        return matchSearch && matchStatus && matchType;
      }),
    [invoices, search, filterStatus, filterType]
  );

  const excludedSet = useMemo(() => new Set(excludedNumbers), [excludedNumbers]);

  function isIncluded(invoiceNumber: string) {
    return !excludedSet.has(invoiceNumber);
  }

  function toggleInvoice(invoiceNumber: string, include: boolean) {
    setExcludedNumbers((prev) =>
      include ? prev.filter((n) => n !== invoiceNumber) : [...new Set([...prev, invoiceNumber])]
    );
  }

  const summary = useMemo(() => {
    const included = filtered.filter((i) => isIncluded(i.invoice_number));
    const total = included.reduce((sum, i) => sum + Number(i.total_amount ?? 0), 0);
    const excludedVisible = filtered.filter((i) => !isIncluded(i.invoice_number));
    const excludedTotal = excludedVisible.reduce(
      (sum, i) => sum + Number(i.total_amount ?? 0),
      0
    );
    return {
      total,
      excludedTotal,
      includedCount: included.length,
      visibleCount: filtered.length,
      excludedVisible,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, excludedSet]);

  const allIncluded = summary.includedCount === summary.visibleCount;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Rechnungen</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Verwalten Sie Ihre Rechnungen
          </p>
        </div>
        <Button
          onClick={() => router.push("/app/invoices/new")}
          className="bg-primary text-primary-foreground hover:bg-red-700 text-sm sm:text-base rounded-xl"
          size="sm"
          disabled={!canWrite}
        >
          <Plus className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Neue Rechnung</span>
          <span className="sm:hidden">Neu</span>
        </Button>
      </div>

      {/* Summe der Rechnungsbeträge – einzelne Rechnungsnummern ausschließbar */}
      {!loading && filtered.length > 0 && (
        <Card className="border-border/60 bg-card/60 backdrop-blur-xl rounded-2xl">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sigma className="h-4 w-4" />
                  Summe der Rechnungsbeträge
                </div>
                <p className="mt-1 text-2xl sm:text-3xl font-bold text-primary tabular-nums">
                  {formatCurrency(summary.total)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {summary.includedCount} von {summary.visibleCount} Rechnungen berücksichtigt
                  {summary.excludedTotal > 0 && (
                    <> · ausgeschlossen: {formatCurrency(summary.excludedTotal)}</>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() =>
                    setExcludedNumbers((prev) =>
                      prev.filter((n) => !filtered.some((i) => i.invoice_number === n))
                    )
                  }
                  disabled={allIncluded}
                >
                  Alle einbeziehen
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() =>
                    setExcludedNumbers((prev) => [
                      ...new Set([...prev, ...filtered.map((i) => i.invoice_number)]),
                    ])
                  }
                  disabled={summary.includedCount === 0}
                >
                  Keine
                </Button>
              </div>
            </div>

            {summary.excludedVisible.length > 0 && (
              <div className="mt-4 border-t border-border/60 pt-4">
                <p className="text-xs text-muted-foreground mb-2">
                  Ausgeschlossene Rechnungsnummern (z. B. Anzahlungen) – zum Wieder-Einbeziehen
                  anklicken:
                </p>
                <div className="flex flex-wrap gap-2">
                  {summary.excludedVisible.map((invoice) => (
                    <button
                      key={invoice.id}
                      type="button"
                      onClick={() => toggleInvoice(invoice.invoice_number, true)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm transition-colors hover:border-border hover:text-foreground"
                    >
                      {invoice.invoice_number}
                      <span className="tabular-nums">
                        {formatCurrency(Number(invoice.total_amount ?? 0))}
                      </span>
                      <X className="h-3 w-3" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-border/60 bg-card/60 backdrop-blur-xl rounded-2xl">
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Suche..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 text-sm sm:text-base"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-32 text-sm sm:text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Arten</SelectItem>
                <SelectItem value="it">IT</SelectItem>
                <SelectItem value="bau">BAU</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-40 text-sm sm:text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                {INVOICE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {statusLabels[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              {search || filterStatus !== "all" || filterType !== "all"
                ? "Keine Rechnungen gefunden"
                : "Noch keine Rechnungen vorhanden"}
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allIncluded}
                          onCheckedChange={(checked) =>
                            checked === true
                              ? setExcludedNumbers((prev) =>
                                  prev.filter(
                                    (n) => !filtered.some((i) => i.invoice_number === n)
                                  )
                                )
                              : setExcludedNumbers((prev) => [
                                  ...new Set([
                                    ...prev,
                                    ...filtered.map((i) => i.invoice_number),
                                  ]),
                                ])
                          }
                          aria-label="Alle Rechnungen in Summe einbeziehen"
                        />
                      </TableHead>
                      <TableHead>Rechnungsnummer</TableHead>
                      <TableHead>Kunde</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead>Fälligkeitsdatum</TableHead>
                      <TableHead>Betrag</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((invoice) => {
                      const included = isIncluded(invoice.invoice_number);
                      return (
                        <TableRow
                          key={invoice.id}
                          className={`border-border ${included ? "" : "opacity-50"}`}
                        >
                          <TableCell>
                            <Checkbox
                              checked={included}
                              onCheckedChange={(checked) =>
                                toggleInvoice(invoice.invoice_number, checked === true)
                              }
                              aria-label={`${invoice.invoice_number} in Summe einbeziehen`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {invoice.invoice_number}
                            {invoice.invoice_type && (
                              <Badge
                                variant="outline"
                                className={`ml-2 ${
                                  invoice.invoice_type === "bau"
                                    ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                                    : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                }`}
                              >
                                {invoice.invoice_type === "bau" ? "BAU" : "IT"}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {(invoice.clients as unknown as { name: string })?.name || "–"}
                          </TableCell>
                          <TableCell>
                            {format(new Date(invoice.invoice_date), "dd.MM.yyyy", { locale: de })}
                          </TableCell>
                          <TableCell>
                            {format(new Date(invoice.due_date), "dd.MM.yyyy", { locale: de })}
                          </TableCell>
                          <TableCell className="font-semibold tabular-nums">
                            {formatCurrency(invoice.total_amount)}
                            {invoice.is_partial_payment && (
                              <span className="text-xs text-muted-foreground ml-1">
                                (Teilanzahlung)
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusColors[invoice.status]}>
                              {statusLabels[invoice.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.push(`/app/invoices/${invoice.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {canWrite && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(invoice.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-400" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-border">
                {filtered.map((invoice) => {
                  const included = isIncluded(invoice.invoice_number);
                  return (
                    <div
                      key={invoice.id}
                      className={`p-4 space-y-2 active:bg-muted/50 transition-colors ${
                        included ? "" : "opacity-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={included}
                            onCheckedChange={(checked) =>
                              toggleInvoice(invoice.invoice_number, checked === true)
                            }
                            aria-label={`${invoice.invoice_number} in Summe einbeziehen`}
                          />
                        </div>
                        <div
                          className="flex-1 min-w-0"
                          onClick={() => router.push(`/app/invoices/${invoice.id}`)}
                        >
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-foreground">
                              {invoice.invoice_number}
                            </h3>
                            {invoice.invoice_type && (
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  invoice.invoice_type === "bau"
                                    ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                                    : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                }`}
                              >
                                {invoice.invoice_type === "bau" ? "BAU" : "IT"}
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={`text-xs ${statusColors[invoice.status]}`}
                            >
                              {statusLabels[invoice.status]}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            {(invoice.clients as unknown as { name: string })?.name || "–"}
                          </p>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span>
                              Datum:{" "}
                              {format(new Date(invoice.invoice_date), "dd.MM.yyyy", { locale: de })}
                            </span>
                            <span>
                              Fällig:{" "}
                              {format(new Date(invoice.due_date), "dd.MM.yyyy", { locale: de })}
                            </span>
                          </div>
                          <p className="text-lg font-semibold text-foreground mt-2 tabular-nums">
                            {formatCurrency(invoice.total_amount)}
                            {invoice.is_partial_payment && (
                              <span className="text-xs text-muted-foreground ml-1 font-normal">
                                (Teilanzahlung)
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => router.push(`/app/invoices/${invoice.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canWrite && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-400"
                              onClick={() => handleDelete(invoice.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
