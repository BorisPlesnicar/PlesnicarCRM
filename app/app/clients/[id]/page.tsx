"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Client, Project, Offer } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Mail,
  Phone,
  MapPin,
  FolderKanban,
  FileText,
  Loader2,
  Receipt,
  DollarSign,
  Save,
  Edit,
} from "lucide-react";
import { formatCurrency } from "@/lib/calculations";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useAuth } from "@/app/app/AuthProvider";

const statusLabels: Record<string, string> = {
  lead: "Lead",
  customer: "Kunde",
  archived: "Archiviert",
  planned: "Geplant",
  active: "Aktiv",
  done: "Fertig",
  draft: "Entwurf",
  sent: "Gesendet",
  accepted: "Angenommen",
  rejected: "Abgelehnt",
  paid: "Bezahlt",
  overdue: "Überfällig",
  cancelled: "Storniert",
};

const statusColors: Record<string, string> = {
  lead: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  customer: "bg-green-500/10 text-green-400 border-green-500/20",
  archived: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  planned: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  active: "bg-green-500/10 text-green-400 border-green-500/20",
  done: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  draft: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  sent: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  accepted: "bg-green-500/10 text-green-400 border-green-500/20",
  rejected: "bg-red-500/10 text-red-400 border-red-500/20",
  paid: "bg-green-500/10 text-green-400 border-green-500/20",
  overdue: "bg-red-500/10 text-red-400 border-red-500/20",
  cancelled: "bg-gray-500/10 text-gray-300 border-gray-500/20",
};

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const { canWrite, loading: authLoading } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [notesChanged, setNotesChanged] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    async function load() {
      const id = params.id as string;
      const [clientRes, projectsRes, offersRes, invoicesRes] = await Promise.all([
        supabase.from("clients").select("*").eq("id", id).single(),
        supabase
          .from("projects")
          .select("*")
          .eq("client_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("offers")
          .select("*")
          .eq("client_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("invoices")
          .select("id, invoice_number, invoice_date, total_amount, status, due_date")
          .eq("client_id", id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (clientRes.error) {
        toast.error("Kunde nicht gefunden");
        router.push("/app/clients");
        return;
      }
      setClient(clientRes.data);
      setProjects(projectsRes.data || []);
      setOffers(offersRes.data || []);
      setInvoices(invoicesRes.data || []);
      setNotes(clientRes.data.notes || "");
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function saveNotes() {
    if (!client) return;
    setSavingNotes(true);
    const { error } = await supabase
      .from("clients")
      .update({ notes })
      .eq("id", client.id);

    if (error) {
      toast.error("Fehler beim Speichern", { description: error.message });
    } else {
      toast.success("Notizen gespeichert");
      setClient({ ...client, notes });
      setNotesChanged(false);
    }
    setSavingNotes(false);
  }

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!client) return null;

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={() => router.push("/app/clients")}
        className="mb-2"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Zurück
      </Button>

      {/* Client Info */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <CardTitle className="text-xl">{client.name}</CardTitle>
                {client.customer_number && (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    {client.customer_number}
                  </Badge>
                )}
              </div>
              {client.company && (
                <p className="text-muted-foreground">{client.company}</p>
              )}
            </div>
            <Badge
              variant="outline"
              className={statusColors[client.status]}
            >
              {statusLabels[client.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {client.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${client.email}`} className="hover:text-primary">
                {client.email}
              </a>
            </div>
          )}
          {client.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a href={`tel:${client.phone}`} className="hover:text-primary">
                {client.phone}
              </a>
            </div>
          )}
          {client.address && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{client.address}</span>
            </div>
          )}
          {canWrite ? (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Notizen</Label>
                {notesChanged && (
                  <Button
                    size="sm"
                    onClick={saveNotes}
                    disabled={savingNotes}
                    className="h-7"
                  >
                    {savingNotes ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <Save className="mr-1 h-3 w-3" />
                        Speichern
                      </>
                    )}
                  </Button>
                )}
              </div>
              <Textarea
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setNotesChanged(e.target.value !== (client?.notes || ""));
                }}
                placeholder="Notizen zum Kunden..."
                className="min-h-[100px] resize-none"
              />
              {client.notes && !notesChanged && (
                <p className="text-xs text-muted-foreground">
                  Zuletzt aktualisiert:{" "}
                  {format(
                    new Date(
                      (client as any).updated_at || client.created_at
                    ),
                    "dd.MM.yyyy HH:mm",
                    { locale: de }
                  )}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Notizen (nur lesen)</Label>
              </div>
              <div className="min-h-[80px] rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground whitespace-pre-wrap">
                {client.notes ? client.notes : "Keine Notizen hinterlegt."}
              </div>
              {client.notes && (
                <p className="text-xs text-muted-foreground">
                  Zuletzt aktualisiert:{" "}
                  {format(
                    new Date(
                      (client as any).updated_at || client.created_at
                    ),
                    "dd.MM.yyyy HH:mm",
                    { locale: de }
                  )}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mini Cockpit */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Übersicht
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Offene Beträge */}
            <div className="p-4 rounded-lg border border-border bg-card">
              <div className="text-sm text-muted-foreground mb-1">Offene Beträge</div>
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(
                  invoices
                    .filter((inv) => inv.status === "sent" || inv.status === "overdue")
                    .reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {invoices.filter((inv) => inv.status === "sent" || inv.status === "overdue").length} offene Rechnung(en)
              </div>
            </div>

            {/* Aktive Projekte */}
            <div className="p-4 rounded-lg border border-border bg-card">
              <div className="text-sm text-muted-foreground mb-1">Aktive Projekte</div>
              <div className="text-2xl font-bold text-green-400">
                {projects.filter((p) => p.status === "active").length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {projects.length} Projekt(e) insgesamt
              </div>
            </div>
          </div>

          {/* Letzte Rechnungen */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Letzte Rechnungen</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/app/invoices?client=${client.id}`)}
              >
                Alle anzeigen
              </Button>
            </div>
            {invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Keine Rechnungen vorhanden
              </p>
            ) : (
              <div className="space-y-2">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/app/invoices/${invoice.id}`)}
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{invoice.invoice_number}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(invoice.invoice_date), "dd.MM.yyyy", { locale: de })}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">
                        {formatCurrency(invoice.total_amount)}
                      </span>
                      <Badge
                        variant="outline"
                        className={statusColors[invoice.status]}
                      >
                        {statusLabels[invoice.status]}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Projects */}
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            Projekte ({projects.length})
          </CardTitle>
          {canWrite && (
            <Button
              size="sm"
              onClick={() => router.push(`/app/projects?client=${client.id}`)}
              className="bg-primary text-primary-foreground hover:bg-red-700"
            >
              Neues Projekt
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Keine Projekte vorhanden
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Titel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((p) => (
                  <TableRow
                    key={p.id}
                    className="border-border cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/app/projects/${p.id}`)}
                  >
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusColors[p.status]}
                      >
                        {statusLabels[p.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{p.start_date || "–"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Offers */}
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Angebote ({offers.length})
          </CardTitle>
          {canWrite && (
            <Button
              size="sm"
              onClick={() =>
                router.push(`/app/offers/new?client=${client.id}`)
              }
              className="bg-primary text-primary-foreground hover:bg-red-700"
            >
              Neues Angebot
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {offers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Keine Angebote vorhanden
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Nr.</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offers.map((o) => (
                  <TableRow
                    key={o.id}
                    className="border-border cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/app/offers/${o.id}`)}
                  >
                    <TableCell className="font-medium">
                      {o.offer_number}
                    </TableCell>
                    <TableCell>{o.date}</TableCell>
                    <TableCell>{formatCurrency(o.total)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusColors[o.status]}
                      >
                        {statusLabels[o.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
