"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/app/app/AuthProvider";
import { Invoice, INVOICE_STATUSES } from "@/lib/types";
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
  const router = useRouter();
  const supabase = createClient();

  async function loadInvoices() {
    const { data, error } = await supabase
      .from("invoices")
      .select("*, clients(name)")
      .order("invoice_date", { ascending: false });
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
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) {
      toast.error("Fehler", { description: error.message });
    } else {
      toast.success("Rechnung gelöscht");
      loadInvoices();
    }
  }

  const filtered = invoices.filter((i) => {
    const matchSearch =
      i.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (i.clients as unknown as { name: string })?.name
        ?.toLowerCase()
        .includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || i.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Rechnungen</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Verwalten Sie Ihre Rechnungen</p>
        </div>
        <Button
          onClick={() => router.push("/app/invoices/new")}
          className="bg-primary text-primary-foreground hover:bg-red-700 text-sm sm:text-base"
          size="sm"
          disabled={!canWrite}
        >
          <Plus className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Neue Rechnung</span>
          <span className="sm:hidden">Neu</span>
        </Button>
      </div>

      <Card className="border-border bg-card">
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
              {search || filterStatus !== "all"
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
                    {filtered.map((invoice) => (
                      <TableRow key={invoice.id} className="border-border">
                        <TableCell className="font-medium">
                          {invoice.invoice_number}
                          {invoice.invoice_type && (
                            <Badge variant="outline" className={`ml-2 ${invoice.invoice_type === "bau" ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"}`}>
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
                        <TableCell className="font-semibold">
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
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-border">
                {filtered.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="p-4 space-y-2 active:bg-muted/50 transition-colors"
                    onClick={() => router.push(`/app/invoices/${invoice.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-foreground">{invoice.invoice_number}</h3>
                          {invoice.invoice_type && (
                            <Badge variant="outline" className={`text-xs ${invoice.invoice_type === "bau" ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"}`}>
                              {invoice.invoice_type === "bau" ? "BAU" : "IT"}
                            </Badge>
                          )}
                          <Badge variant="outline" className={`text-xs ${statusColors[invoice.status]}`}>
                            {statusLabels[invoice.status]}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {(invoice.clients as unknown as { name: string })?.name || "–"}
                        </p>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>Datum: {format(new Date(invoice.invoice_date), "dd.MM.yyyy", { locale: de })}</span>
                          <span>Fällig: {format(new Date(invoice.due_date), "dd.MM.yyyy", { locale: de })}</span>
                        </div>
                        <p className="text-lg font-semibold text-foreground mt-2">
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
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
