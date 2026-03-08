"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/app/app/AuthProvider";
import { Client, CLIENT_STATUSES } from "@/lib/types";
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

export default function ClientsPageWrapper() {
  return (
    <Suspense>
      <ClientsPage />
    </Suspense>
  );
}

const statusColors: Record<string, string> = {
  lead: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  customer: "bg-green-500/10 text-green-400 border-green-500/20",
  archived: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

const statusLabels: Record<string, string> = {
  lead: "Lead",
  customer: "Kunde",
  archived: "Archiviert",
};

const emptyClient: {
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  status: "lead" | "customer" | "archived";
} = {
  name: "",
  company: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
  status: "lead",
};

function ClientsPage() {
  const { canWrite } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editClient, setEditClient] = useState<Partial<Client> | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyClient);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const loadClients = useCallback(async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Fehler beim Laden der Kunden");
    } else {
      setClients(data || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadClients();
    if (searchParams.get("new") === "1") {
      openNew();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openNew() {
    if (!canWrite) return;
    setEditClient(null);
    setForm(emptyClient);
    setDialogOpen(true);
  }

  function openEdit(client: Client) {
    if (!canWrite) return;
    setEditClient(client);
    setForm({
      name: client.name,
      company: client.company,
      email: client.email,
      phone: client.phone,
      address: client.address,
      notes: client.notes,
      status: client.status,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!canWrite) return;
    if (!form.name.trim()) {
      toast.error("Name ist erforderlich");
      return;
    }
    setSaving(true);
    if (editClient?.id) {
      const { error } = await supabase
        .from("clients")
        .update(form)
        .eq("id", editClient.id);
      if (error) {
        toast.error("Fehler beim Aktualisieren", { description: error.message });
      } else {
        toast.success("Kunde aktualisiert");
        setDialogOpen(false);
        loadClients();
      }
    } else {
      const { error } = await supabase.from("clients").insert(form);
      if (error) {
        toast.error("Fehler beim Erstellen", { description: error.message });
      } else {
        toast.success("Kunde erstellt");
        setDialogOpen(false);
        loadClients();
      }
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!canWrite) return;
    if (!confirm("Kunde wirklich löschen?")) return;
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) {
      toast.error("Fehler beim Löschen", { description: error.message });
    } else {
      toast.success("Kunde gelöscht");
      loadClients();
    }
  }

  const filtered = clients.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Kunden</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {clients.length} Kunden insgesamt
          </p>
        </div>
        <Button
          onClick={openNew}
          className="bg-primary text-primary-foreground hover:bg-red-700 text-sm sm:text-base"
          size="sm"
          disabled={!canWrite}
        >
          <Plus className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Neuer Kunde</span>
          <span className="sm:hidden">Neu</span>
        </Button>
      </div>

      {/* Filters */}
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
              {CLIENT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabels[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table - Mobile: Cards, Desktop: Table */}
      <Card className="border-border bg-card overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Kundennummer</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Firma</TableHead>
                <TableHead className="hidden md:table-cell">E-Mail</TableHead>
                <TableHead className="hidden md:table-cell">Telefon</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Keine Kunden gefunden
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((client) => (
                  <TableRow
                    key={client.id}
                    className="border-border cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/app/clients/${client.id}`)}
                  >
                    <TableCell className="font-medium text-primary">
                      {client.customer_number || "–"}
                    </TableCell>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {client.company}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {client.email}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {client.phone}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusColors[client.status]}
                      >
                        {statusLabels[client.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/app/clients/${client.id}`);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canWrite && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(client);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(client.id);
                              }}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-border">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Keine Kunden gefunden
            </div>
          ) : (
            filtered.map((client) => (
              <div
                key={client.id}
                className="p-4 space-y-2 active:bg-muted/50 transition-colors"
                onClick={() => router.push(`/app/clients/${client.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground truncate">{client.name}</h3>
                      <Badge
                        variant="outline"
                        className={`text-xs ${statusColors[client.status]}`}
                      >
                        {statusLabels[client.status]}
                      </Badge>
                    </div>
                    {client.customer_number && (
                      <p className="text-xs text-muted-foreground mb-1">
                        {client.customer_number}
                      </p>
                    )}
                    {client.company && (
                      <p className="text-sm text-muted-foreground truncate">{client.company}</p>
                    )}
                    {client.email && (
                      <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                    )}
                    {client.phone && (
                      <p className="text-xs text-muted-foreground truncate">{client.phone}</p>
                    )}
                  </div>
                  <div className="flex gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/app/clients/${client.id}`);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canWrite && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(client);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(client.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-card border-border sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editClient ? "Kunde bearbeiten" : "Neuer Kunde"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="bg-secondary"
                />
              </div>
              <div className="space-y-2">
                <Label>Firma</Label>
                <Input
                  value={form.company}
                  onChange={(e) =>
                    setForm({ ...form, company: e.target.value })
                  }
                  className="bg-secondary"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>E-Mail</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="bg-secondary"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="bg-secondary"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Adresse</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="bg-secondary"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm({ ...form, status: v as Client["status"] })
                }
              >
                <SelectTrigger className="bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusLabels[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              {editClient ? "Speichern" : "Erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
