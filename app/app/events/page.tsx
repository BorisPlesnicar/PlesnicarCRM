"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Event } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Calendar, QrCode, Copy } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [editEvent, setEditEvent] = useState<Partial<Event> | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    start_at: "",
    end_at: "",
  });
  const supabase = createClient();

  const loadEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("start_at", { ascending: true });
    if (error) {
      toast.error("Fehler beim Laden der Termine");
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  function openNew() {
    setEditEvent(null);
    const now = new Date();
    const endTime = new Date(now.getTime() + 60 * 60 * 1000); // Default 1 hour
    setForm({
      title: "",
      description: "",
      location: "",
      start_at: now.toISOString().slice(0, 16),
      end_at: endTime.toISOString().slice(0, 16),
    });
    setDialogOpen(true);
  }

  function openEdit(event: Event) {
    setEditEvent(event);
    setForm({
      title: event.title,
      description: event.description || "",
      location: event.location || "",
      start_at: new Date(event.start_at).toISOString().slice(0, 16),
      end_at: new Date(event.end_at).toISOString().slice(0, 16),
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error("Titel ist erforderlich");
      return;
    }

    const startAt = new Date(form.start_at);
    const endAt = new Date(form.end_at);

    if (endAt <= startAt) {
      toast.error("Endzeit muss nach Startzeit liegen");
      return;
    }

    setSaving(true);
    if (editEvent?.id) {
      const { error } = await supabase
        .from("events")
        .update({
          title: form.title,
          description: form.description || null,
          location: form.location || null,
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
        })
        .eq("id", editEvent.id);
      if (error) {
        toast.error("Fehler beim Aktualisieren", { description: error.message });
      } else {
        toast.success("Termin aktualisiert");
        setDialogOpen(false);
        loadEvents();
      }
    } else {
      const { error } = await supabase.from("events").insert({
        title: form.title,
        description: form.description || null,
        location: form.location || null,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
      });
      if (error) {
        toast.error("Fehler beim Erstellen", { description: error.message });
      } else {
        toast.success("Termin erstellt");
        setDialogOpen(false);
        loadEvents();
      }
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Termin wirklich löschen?")) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) {
      toast.error("Fehler beim Löschen", { description: error.message });
    } else {
      toast.success("Termin gelöscht");
      loadEvents();
    }
  }

  function getCalendarLink(eventId: string): string {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/api/calendar/ics?eventId=${eventId}`;
  }

  function openQRCode(event: Event) {
    setSelectedEvent(event);
    setQrDialogOpen(true);
  }

  function copyCalendarLink(eventId: string) {
    const link = getCalendarLink(eventId);
    navigator.clipboard.writeText(link);
    toast.success("Link in Zwischenablage kopiert");
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Kalender</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {events.length} Termin{events.length !== 1 ? "e" : ""} insgesamt
          </p>
        </div>
        <Button
          onClick={openNew}
          className="bg-primary text-primary-foreground hover:bg-red-700 text-sm sm:text-base"
          size="sm"
        >
          <Plus className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Neuer Termin</span>
          <span className="sm:hidden">Neu</span>
        </Button>
      </div>

      {/* Events Table - Desktop */}
      <Card className="border-border bg-card overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Titel</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>Ende</TableHead>
                <TableHead className="hidden lg:table-cell">Ort</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Keine Termine vorhanden
                  </TableCell>
                </TableRow>
              ) : (
                events.map((event) => (
                  <TableRow key={event.id} className="border-border">
                    <TableCell className="font-medium">{event.title}</TableCell>
                    <TableCell>
                      {format(new Date(event.start_at), "dd.MM.yyyy HH:mm", { locale: de })}
                    </TableCell>
                    <TableCell>
                      {format(new Date(event.end_at), "dd.MM.yyyy HH:mm", { locale: de })}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {event.location || "–"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            window.open(getCalendarLink(event.id), "_blank");
                          }}
                          title="Zum Kalender hinzufügen"
                        >
                          <Calendar className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openQRCode(event)}
                          title="QR Code anzeigen"
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyCalendarLink(event.id)}
                          title="Link kopieren"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(event)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(event.id)}
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

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-border">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Keine Termine vorhanden
            </div>
          ) : (
            events.map((event) => (
              <div key={event.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground mb-2">{event.title}</h3>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>
                        <strong>Start:</strong>{" "}
                        {format(new Date(event.start_at), "dd.MM.yyyy HH:mm", { locale: de })}
                      </p>
                      <p>
                        <strong>Ende:</strong>{" "}
                        {format(new Date(event.end_at), "dd.MM.yyyy HH:mm", { locale: de })}
                      </p>
                      {event.location && (
                        <p>
                          <strong>Ort:</strong> {event.location}
                        </p>
                      )}
                      {event.description && (
                        <p className="text-xs mt-2">{event.description}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.open(getCalendarLink(event.id), "_blank");
                    }}
                    className="flex-1"
                  >
                    <Calendar className="mr-1.5 h-3.5 w-3.5" />
                    Zum Kalender
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openQRCode(event)}
                    className="flex-1"
                  >
                    <QrCode className="mr-1.5 h-3.5 w-3.5" />
                    QR Code
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyCalendarLink(event.id)}
                    className="flex-1"
                  >
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    Link
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(event)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(event.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
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
            <DialogTitle>{editEvent ? "Termin bearbeiten" : "Neuer Termin"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Titel *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="bg-secondary"
                placeholder="z.B. Kundenbesprechung"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Start *</Label>
                <Input
                  type="datetime-local"
                  value={form.start_at}
                  onChange={(e) => setForm({ ...form, start_at: e.target.value })}
                  className="bg-secondary"
                />
              </div>
              <div className="space-y-2">
                <Label>Ende *</Label>
                <Input
                  type="datetime-local"
                  value={form.end_at}
                  onChange={(e) => setForm({ ...form, end_at: e.target.value })}
                  className="bg-secondary"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ort</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="bg-secondary"
                placeholder="z.B. Büro, Adresse"
              />
            </div>
            <div className="space-y-2">
              <Label>Beschreibung</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="bg-secondary"
                rows={3}
                placeholder="Weitere Details zum Termin"
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
              {editEvent ? "Speichern" : "Erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code für Kalender-Link</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Scanne diesen QR Code mit deinem iPhone, um den Termin zum Kalender hinzuzufügen.
              </p>
              <div className="flex justify-center p-4 bg-muted rounded-lg">
                <QRCodeDisplay url={getCalendarLink(selectedEvent.id)} />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => copyCalendarLink(selectedEvent.id)}
                  className="flex-1"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Link kopieren
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    window.open(getCalendarLink(selectedEvent.id), "_blank");
                  }}
                  className="flex-1"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Direkt öffnen
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Simple QR Code Component using qrcode library
function QRCodeDisplay({ url }: { url: string }) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    // Use a simple QR code API or library
    // For now, we'll use a QR code API service
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
    setQrDataUrl(qrUrl);
  }, [url]);

  if (!qrDataUrl) {
    return <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />;
  }

  return <img src={qrDataUrl} alt="QR Code" className="w-full max-w-xs mx-auto" />;
}
