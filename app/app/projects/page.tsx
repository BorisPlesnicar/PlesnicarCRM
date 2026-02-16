"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { Project, Client, PROJECT_STATUSES } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Plus, Search, Pencil, Trash2, Loader2, Eye } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ProjectsPageWrapper() {
  return (
    <Suspense>
      <ProjectsPage />
    </Suspense>
  );
}

const statusColors: Record<string, string> = {
  planned: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  active: "bg-green-500/10 text-green-400 border-green-500/20",
  done: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

const statusLabels: Record<string, string> = {
  planned: "Geplant",
  active: "Aktiv",
  done: "Fertig",
};

const emptyProject: {
  client_id: string;
  title: string;
  status: "planned" | "active" | "done";
  start_date: string;
  end_date: string;
  notes: string;
} = {
  client_id: "",
  title: "",
  status: "planned",
  start_date: "",
  end_date: "",
  notes: "",
};

function ProjectsPage() {
  const [projects, setProjects] = useState<(Project & { clients?: Client })[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProject, setEditProject] = useState<Partial<Project> | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyProject);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const loadData = useCallback(async () => {
    const [projectsRes, clientsRes] = await Promise.all([
      supabase
        .from("projects")
        .select("*, clients(name, company)")
        .order("created_at", { ascending: false }),
      supabase.from("clients").select("*").order("name"),
    ]);
    setProjects(projectsRes.data || []);
    setClients(clientsRes.data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
    const clientParam = searchParams.get("client");
    if (clientParam) {
      setForm({ ...emptyProject, client_id: clientParam });
      setDialogOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openNew() {
    setEditProject(null);
    setForm(emptyProject);
    setDialogOpen(true);
  }

  function openEdit(project: Project) {
    setEditProject(project);
    setForm({
      client_id: project.client_id,
      title: project.title,
      status: project.status,
      start_date: project.start_date || "",
      end_date: project.end_date || "",
      notes: project.notes,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error("Titel ist erforderlich");
      return;
    }
    if (!form.client_id) {
      toast.error("Kunde ist erforderlich");
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    };
    if (editProject?.id) {
      const { error } = await supabase
        .from("projects")
        .update(payload)
        .eq("id", editProject.id);
      if (error) {
        toast.error("Fehler", { description: error.message });
      } else {
        toast.success("Projekt aktualisiert");
        setDialogOpen(false);
        loadData();
      }
    } else {
      const { error } = await supabase.from("projects").insert(payload);
      if (error) {
        toast.error("Fehler", { description: error.message });
      } else {
        toast.success("Projekt erstellt");
        setDialogOpen(false);
        loadData();
      }
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Projekt wirklich löschen?")) return;
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) {
      toast.error("Fehler", { description: error.message });
    } else {
      toast.success("Projekt gelöscht");
      loadData();
    }
  }

  const filtered = projects.filter((p) => {
    const matchSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.clients as unknown as Client)?.name
        ?.toLowerCase()
        .includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projekte</h1>
          <p className="text-muted-foreground">
            {projects.length} Projekte insgesamt
          </p>
        </div>
        <Button
          onClick={openNew}
          className="bg-primary text-primary-foreground hover:bg-red-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Neues Projekt
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
              {PROJECT_STATUSES.map((s) => (
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
                <TableHead>Titel</TableHead>
                <TableHead>Kunde</TableHead>
                <TableHead className="hidden sm:table-cell">Start</TableHead>
                <TableHead className="hidden sm:table-cell">Ende</TableHead>
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
                    Keine Projekte gefunden
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((project) => (
                  <TableRow
                    key={project.id}
                    className="border-border cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/app/projects/${project.id}`)}
                  >
                    <TableCell className="font-medium">{project.title}</TableCell>
                    <TableCell>
                      {(project.clients as unknown as Client)?.name || "–"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {project.start_date || "–"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {project.end_date || "–"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusColors[project.status]}
                      >
                        {statusLabels[project.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/app/projects/${project.id}`);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(project);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(project.id);
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

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-card border-border sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editProject ? "Projekt bearbeiten" : "Neues Projekt"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Kunde *</Label>
              <Select
                value={form.client_id}
                onValueChange={(v) => setForm({ ...form, client_id: v })}
              >
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
              <Label>Titel *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="bg-secondary"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm({ ...form, status: v as Project["status"] })
                }
              >
                <SelectTrigger className="bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusLabels[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Startdatum</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) =>
                    setForm({ ...form, start_date: e.target.value })
                  }
                  className="bg-secondary"
                />
              </div>
              <div className="space-y-2">
                <Label>Enddatum</Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) =>
                    setForm({ ...form, end_date: e.target.value })
                  }
                  className="bg-secondary"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notizen</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="bg-secondary"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary text-primary-foreground hover:bg-red-700"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editProject ? "Speichern" : "Erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
