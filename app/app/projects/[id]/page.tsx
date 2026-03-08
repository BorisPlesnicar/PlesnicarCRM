"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Project, Client, TimeEntry, Offer } from "@/lib/types";
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
import { ArrowLeft, Clock, FileText, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/calculations";

const statusLabels: Record<string, string> = {
  planned: "Geplant",
  active: "Aktiv",
  done: "Fertig",
  draft: "Entwurf",
  sent: "Gesendet",
  accepted: "Angenommen",
  rejected: "Abgelehnt",
};

const statusColors: Record<string, string> = {
  planned: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  active: "bg-green-500/10 text-green-400 border-green-500/20",
  done: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  draft: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  sent: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  accepted: "bg-green-500/10 text-green-400 border-green-500/20",
  rejected: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [project, setProject] = useState<Project & { clients?: Client } | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const id = params.id as string;
      const [projectRes, timeRes, offersRes] = await Promise.all([
        supabase
          .from("projects")
          .select("*, clients(name, company)")
          .eq("id", id)
          .single(),
        supabase
          .from("time_entries")
          .select("*")
          .eq("project_id", id)
          .order("start_time", { ascending: false }),
        supabase
          .from("offers")
          .select("*")
          .eq("project_id", id)
          .order("created_at", { ascending: false }),
      ]);

      if (projectRes.error) {
        toast.error("Projekt nicht gefunden");
        router.push("/app/projects");
        return;
      }
      setProject(projectRes.data);
      setTimeEntries(timeRes.data || []);
      setOffers(offersRes.data || []);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) return null;

  const totalMinutes = timeEntries.reduce(
    (sum, t) => sum + (t.duration_minutes || 0),
    0
  );
  const totalHours = (totalMinutes / 60).toFixed(1);

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={() => router.push("/app/projects")}
        className="mb-2"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Zurück
      </Button>

      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{project.title}</CardTitle>
              <p className="text-muted-foreground">
                {(project.clients as unknown as Client)?.name || "–"}
                {(project.clients as unknown as Client)?.company
                  ? ` (${(project.clients as unknown as Client).company})`
                  : ""}
              </p>
            </div>
            <Badge variant="outline" className={statusColors[project.status]}>
              {statusLabels[project.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {project.start_date && <p>Start: {project.start_date}</p>}
          {project.end_date && <p>Ende: {project.end_date}</p>}
          {project.notes && (
            <p className="text-muted-foreground whitespace-pre-wrap mt-2">
              {project.notes}
            </p>
          )}
          <p className="font-medium mt-2">
            Gesamt: {totalHours}h ({totalMinutes} Min.)
          </p>
        </CardContent>
      </Card>

      {/* Time Entries */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Zeiteinträge ({timeEntries.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timeEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Keine Zeiteinträge vorhanden
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Datum</TableHead>
                  <TableHead>Dauer</TableHead>
                  <TableHead>Notiz</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeEntries.map((t) => (
                  <TableRow key={t.id} className="border-border">
                    <TableCell>
                      {new Date(t.start_time).toLocaleDateString("de-DE")}
                    </TableCell>
                    <TableCell>
                      {t.duration_minutes
                        ? `${Math.floor(t.duration_minutes / 60)}h ${t.duration_minutes % 60}m`
                        : "Läuft..."}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {t.note || "–"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Linked Offers */}
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Angebote ({offers.length})
          </CardTitle>
          <Button
            size="sm"
            onClick={() =>
              router.push(
                `/app/offers/new?client=${project.client_id}&project=${project.id}`
              )
            }
            className="bg-primary text-primary-foreground hover:bg-red-700"
          >
            Neues Angebot
          </Button>
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
