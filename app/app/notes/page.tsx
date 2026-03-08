"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/app/app/AuthProvider";
import { Note, Employee } from "@/lib/types";
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
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, X, Image as ImageIcon, User, UserCircle, Crown, Users, UserCheck } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { de } from "date-fns/locale";

// Force dynamic rendering to prevent prerendering errors
export const dynamic = 'force-dynamic';

export default function NotesPageWrapper() {
  return (
    <Suspense>
      <NotesPage />
    </Suspense>
  );
}

const EMPLOYEE_ROLES = [
  { value: "owner", label: "Unternehmensinhaber", icon: Crown, color: "text-yellow-500" },
  { value: "supporter", label: "Unterstützer", icon: UserCheck, color: "text-blue-500" },
  { value: "employee", label: "Mitarbeiter", icon: Users, color: "text-green-500" },
] as const;

const getRoleInfo = (roleValue: string) => {
  return EMPLOYEE_ROLES.find((r) => r.value === roleValue) || EMPLOYEE_ROLES[2];
};

function NotesPage() {
  const { canWrite } = useAuth();
  const [notes, setNotes] = useState<(Note & { profiles?: { full_name: string | null }; employees?: Employee })[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editNote, setEditNote] = useState<Note | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const supabase = createClient();

  const loadEmployees = useCallback(async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("name");
    if (error) {
      console.error("Error loading employees:", error);
    } else {
      setEmployees(data || []);
    }
  }, [supabase]);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    
    try {
      // Load notes with employees
      const { data: notesData, error: notesError } = await supabase
        .from("notes")
        .select("*, employees(*)")
        .order("created_at", { ascending: false });
      
      if (notesError) {
        toast.error("Fehler beim Laden der Notizen", { description: notesError.message });
        setLoading(false);
        return;
      }

      if (!notesData || notesData.length === 0) {
        setNotes([]);
        setLoading(false);
        return;
      }

      // Get unique user IDs from notes
      const userIds = [...new Set(notesData.map((note) => note.user_id))];
      
      // Load profiles for all user IDs
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      // Create a map of user_id -> full_name
      const profileMap = new Map(
        (profilesData || []).map((profile) => [profile.id, profile.full_name])
      );

      // Combine notes with author info
      const notesWithAuthor = notesData.map((note) => ({
        ...note,
        profiles: { 
          full_name: profileMap.get(note.user_id) || "Unbekannt" 
        },
        employees: note.employees as Employee | undefined,
      }));

      setNotes(notesWithAuthor);
    } catch (error: any) {
      console.error("Error loading notes:", error);
      toast.error("Fehler beim Laden der Notizen", { 
        description: error.message || "Unbekannter Fehler" 
      });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadEmployees();
    loadNotes();
  }, [loadEmployees, loadNotes]);

  function openNew() {
    if (!canWrite) return;
    setEditNote(null);
    setTitle("");
    setDescription("");
    setSelectedEmployeeId("");
    setImages([]);
    setImageFiles([]);
    setDialogOpen(true);
  }

  function openEdit(note: Note) {
    if (!canWrite) return;
    setEditNote(note);
    setTitle(note.title);
    setDescription(note.description);
    setSelectedEmployeeId(note.employee_id || "");
    setImages(note.images || []);
    setImageFiles([]);
    setDialogOpen(true);
  }

  async function uploadImage(file: File): Promise<string | null> {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `notes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("notes")
        .upload(filePath, file);

      if (uploadError) {
        // Create bucket if it doesn't exist
        if (uploadError.message.includes("Bucket not found")) {
          toast.error("Speicher-Bucket nicht gefunden. Bitte in Supabase konfigurieren.");
          return null;
        }
        throw uploadError;
      }

      const { data } = supabase.storage.from("notes").getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error("Fehler beim Hochladen des Bildes", { description: error.message });
      return null;
    }
  }

  async function handleImageUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    const newImages: string[] = [];
    const newFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith("image/")) {
        newFiles.push(file);
        const url = await uploadImage(file);
        if (url) {
          newImages.push(url);
        }
      }
    }

    setImages((prev) => [...prev, ...newImages]);
    setImageFiles((prev) => [...prev, ...newFiles]);
    setUploadingImages(false);
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!canWrite) return;
    if (!title.trim()) {
      toast.error("Titel ist erforderlich");
      return;
    }

    setSaving(true);

    try {
      if (editNote?.id) {
        const { error } = await supabase
          .from("notes")
          .update({
            title,
            description,
            employee_id: selectedEmployeeId || null,
            images: images.length > 0 ? images : null,
          })
          .eq("id", editNote.id);

        if (error) {
          toast.error("Fehler beim Aktualisieren", { description: error.message });
        } else {
          toast.success("Notiz aktualisiert");
          setDialogOpen(false);
          loadNotes();
        }
      } else {
        const { error } = await supabase.from("notes").insert({
          title,
          description,
          employee_id: selectedEmployeeId || null,
          images: images.length > 0 ? images : null,
        });

        if (error) {
          toast.error("Fehler beim Erstellen", { description: error.message });
        } else {
          toast.success("Notiz erstellt");
          setDialogOpen(false);
          loadNotes();
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(note: Note) {
    if (!canWrite) return;
    if (!confirm("Möchten Sie diese Notiz wirklich löschen?")) return;

    const { error } = await supabase.from("notes").delete().eq("id", note.id);
    if (error) {
      toast.error("Fehler beim Löschen", { description: error.message });
    } else {
      toast.success("Notiz gelöscht");
      loadNotes();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notizen</h1>
          <p className="text-muted-foreground mt-1">Verwalten Sie Ihre Notizen und Ideen</p>
        </div>
        <Button onClick={openNew} className="bg-primary text-primary-foreground hover:bg-red-700" disabled={!canWrite}>
          <Plus className="mr-2 h-4 w-4" />
          Neue Notiz
        </Button>
      </div>

      {/* Notes Grid */}
      {notes.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Noch keine Notizen vorhanden</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <Card key={note.id} className="border-border bg-card hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{note.title}</CardTitle>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {note.employees ? (
                        <>
                          {note.employees.profile_image_url ? (
                            <img
                              src={note.employees.profile_image_url}
                              alt={note.employees.name}
                              className="w-5 h-5 rounded-full object-cover border border-border"
                            />
                          ) : (
                            <UserCircle className="h-5 w-5" />
                          )}
                          <span>
                            <strong className="text-foreground">{note.employees.name}</strong>
                            {note.employees.description && (
                              <span className="text-muted-foreground"> ({note.employees.description})</span>
                            )}
                            {(() => {
                              const roleInfo = getRoleInfo(note.employees.role);
                              const Icon = roleInfo.icon;
                              return (
                                <Icon className={`h-3 w-3 ${roleInfo.color} inline ml-1`} />
                              );
                            })()}
                            {" • "}
                            {format(new Date(note.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
                          </span>
                        </>
                      ) : (
                        <>
                          <UserCircle className="h-4 w-4" />
                          <span>
                            {note.profiles?.full_name || "Unbekannt"} •{" "}
                            {format(new Date(note.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {canWrite && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(note)}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(note)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-6 mb-4">
                  {note.description}
                </p>
                {note.images && note.images.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {note.images.slice(0, 4).map((img, idx) => (
                      <div key={idx} className="relative aspect-square rounded-md overflow-hidden">
                        <img
                          src={img}
                          alt={`Bild ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                    {note.images.length > 4 && (
                      <div className="aspect-square rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        +{note.images.length - 4}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editNote ? "Notiz bearbeiten" : "Neue Notiz"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Titel *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titel der Notiz"
              />
            </div>
            <div>
              <Label htmlFor="employee">Von (Mitarbeiter)</Label>
              <Select 
                value={selectedEmployeeId || undefined} 
                onValueChange={(value) => setSelectedEmployeeId(value || "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Mitarbeiter auswählen (optional)">
                    {selectedEmployeeId && (() => {
                      const employee = employees.find((e) => e.id === selectedEmployeeId);
                      if (employee) {
                        return (
                          <div className="flex items-center gap-2">
                            {employee.profile_image_url ? (
                              <img
                                src={employee.profile_image_url}
                                alt={employee.name}
                                className="w-5 h-5 rounded-full object-cover"
                              />
                            ) : (
                              <UserCircle className="h-5 w-5 text-muted-foreground" />
                            )}
                            <span>{employee.name}</span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => {
                    const roleInfo = getRoleInfo(employee.role);
                    const Icon = roleInfo.icon;
                    return (
                      <SelectItem key={employee.id} value={employee.id}>
                        <div className="flex items-center gap-2">
                          {employee.profile_image_url ? (
                            <img
                              src={employee.profile_image_url}
                              alt={employee.name}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          ) : (
                            <UserCircle className="h-6 w-6 text-muted-foreground" />
                          )}
                          <span className="font-medium">{employee.name}</span>
                          {employee.description && (
                            <span className="text-xs text-muted-foreground">({employee.description})</span>
                          )}
                          <Icon className={`h-4 w-4 ${roleInfo.color} ml-auto`} />
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Beschreibung (unbegrenzt viele Zeichen)"
                rows={10}
                className="resize-none"
              />
            </div>
            <div>
              <Label htmlFor="images">Bilder</Label>
              <div className="mt-2">
                <input
                  type="file"
                  id="images"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleImageUpload(e.target.files)}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("images")?.click()}
                  disabled={uploadingImages}
                  className="w-full"
                >
                  {uploadingImages ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Hochladen...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="mr-2 h-4 w-4" />
                      Bilder hinzufügen
                    </>
                  )}
                </Button>
              </div>
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={img}
                        alt={`Bild ${idx + 1}`}
                        className="w-full h-32 object-cover rounded-md"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={saving || uploadingImages}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Speichern...
                </>
              ) : (
                "Speichern"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
