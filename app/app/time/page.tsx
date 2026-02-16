"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { TimeEntry, Project } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Play, Square, Clock, Loader2, Trash2 } from "lucide-react";

export default function TimePage() {
  const supabase = createClient();
  const [projects, setProjects] = useState<Project[]>([]);
  const [entries, setEntries] = useState<(TimeEntry & { projects?: { title: string } })[]>([]);
  const [loading, setLoading] = useState(true);

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerProjectId, setTimerProjectId] = useState("");
  const [timerNote, setTimerNote] = useState("");
  const [timerStart, setTimerStart] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = useCallback(async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [projectsRes, entriesRes, runningRes] = await Promise.all([
      supabase.from("projects").select("*").order("title"),
      supabase
        .from("time_entries")
        .select("*, projects(title)")
        .gte("start_time", startOfMonth)
        .order("start_time", { ascending: false }),
      supabase
        .from("time_entries")
        .select("*, projects(title)")
        .is("end_time", null)
        .limit(1)
        .single(),
    ]);

    setProjects(projectsRes.data || []);
    setEntries(entriesRes.data || []);

    // Resume running timer
    if (runningRes.data && !runningRes.error) {
      const running = runningRes.data;
      setTimerRunning(true);
      setTimerProjectId(running.project_id);
      setTimerNote(running.note || "");
      setTimerStart(new Date(running.start_time));
      setActiveEntryId(running.id);
      const diff = Math.floor(
        (Date.now() - new Date(running.start_time).getTime()) / 1000
      );
      setElapsed(diff);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tick
  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => {
        if (timerStart) {
          setElapsed(
            Math.floor((Date.now() - timerStart.getTime()) / 1000)
          );
        }
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerRunning, timerStart]);

  async function startTimer() {
    if (!timerProjectId) {
      toast.error("Bitte Projekt wählen");
      return;
    }
    const startTime = new Date().toISOString();
    const { data, error } = await supabase
      .from("time_entries")
      .insert({
        project_id: timerProjectId,
        start_time: startTime,
        note: timerNote,
      })
      .select()
      .single();
    if (error) {
      toast.error("Fehler", { description: error.message });
      return;
    }
    setTimerRunning(true);
    setTimerStart(new Date(startTime));
    setActiveEntryId(data.id);
    setElapsed(0);
    toast.success("Timer gestartet");
  }

  async function stopTimer() {
    if (!activeEntryId) return;
    const endTime = new Date().toISOString();
    const durationMinutes = Math.max(1, Math.round(elapsed / 60));

    const { error } = await supabase
      .from("time_entries")
      .update({
        end_time: endTime,
        duration_minutes: durationMinutes,
        note: timerNote,
      })
      .eq("id", activeEntryId);

    if (error) {
      toast.error("Fehler", { description: error.message });
      return;
    }

    setTimerRunning(false);
    setTimerStart(null);
    setActiveEntryId(null);
    setElapsed(0);
    toast.success(`Timer gestoppt: ${durationMinutes} Min.`);
    loadData();
  }

  async function deleteEntry(id: string) {
    if (!confirm("Eintrag löschen?")) return;
    const { error } = await supabase.from("time_entries").delete().eq("id", id);
    if (error) {
      toast.error("Fehler", { description: error.message });
    } else {
      toast.success("Eintrag gelöscht");
      loadData();
    }
  }

  function formatElapsed(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  const totalMinutes = entries.reduce(
    (sum, e) => sum + (e.duration_minutes || 0),
    0
  );
  const totalHours = (totalMinutes / 60).toFixed(1);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Zeiterfassung</h1>
        <p className="text-muted-foreground">
          Diesen Monat: {totalHours}h ({totalMinutes} Min.)
        </p>
      </div>

      {/* Timer */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Elapsed Display */}
          <div className="text-center">
            <div
              className={`text-5xl font-mono font-bold tabular-nums ${
                timerRunning ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {formatElapsed(elapsed)}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Projekt *</Label>
              <Select
                value={timerProjectId}
                onValueChange={setTimerProjectId}
                disabled={timerRunning}
              >
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Projekt wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notiz</Label>
              <Input
                value={timerNote}
                onChange={(e) => setTimerNote(e.target.value)}
                placeholder="Was machst du gerade?"
                className="bg-secondary"
              />
            </div>
          </div>

          <div className="flex justify-center gap-3">
            {!timerRunning ? (
              <Button
                onClick={startTimer}
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Play className="mr-2 h-5 w-5" />
                Timer starten
              </Button>
            ) : (
              <Button
                onClick={stopTimer}
                size="lg"
                className="bg-primary hover:bg-red-700 text-primary-foreground"
              >
                <Square className="mr-2 h-5 w-5" />
                Timer stoppen
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Entries */}
      <Card className="border-border bg-card overflow-hidden">
        <CardHeader>
          <CardTitle>Einträge diesen Monat</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Keine Einträge vorhanden
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>Datum</TableHead>
                    <TableHead>Projekt</TableHead>
                    <TableHead>Dauer</TableHead>
                    <TableHead className="hidden sm:table-cell">Notiz</TableHead>
                    <TableHead className="text-right">Aktion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id} className="border-border">
                      <TableCell>
                        {new Date(entry.start_time).toLocaleDateString("de-DE")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {(entry.projects as unknown as { title: string })?.title ||
                          "–"}
                      </TableCell>
                      <TableCell>
                        {entry.duration_minutes
                          ? `${Math.floor(entry.duration_minutes / 60)}h ${entry.duration_minutes % 60}m`
                          : "Läuft..."}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {entry.note || "–"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteEntry(entry.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
