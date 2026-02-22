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
} from "lucide-react";
import { formatCurrency } from "@/lib/calculations";

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
};

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const id = params.id as string;
      const [clientRes, projectsRes, offersRes] = await Promise.all([
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
      ]);

      if (clientRes.error) {
        toast.error("Kunde nicht gefunden");
        router.push("/app/clients");
        return;
      }
      setClient(clientRes.data);
      setProjects(projectsRes.data || []);
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
          {client.notes && (
            <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
              {client.notes}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Projects */}
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            Projekte ({projects.length})
          </CardTitle>
          <Button
            size="sm"
            onClick={() => router.push(`/app/projects?client=${client.id}`)}
            className="bg-primary text-primary-foreground hover:bg-red-700"
          >
            Neues Projekt
          </Button>
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
          <Button
            size="sm"
            onClick={() =>
              router.push(`/app/offers/new?client=${client.id}`)
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
