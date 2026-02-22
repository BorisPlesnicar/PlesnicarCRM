"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { Employee } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, UserCircle, Image as ImageIcon, X, Crown, Users, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function EmployeesPageWrapper() {
  return (
    <Suspense>
      <EmployeesPage />
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

function EmployeeCard({
  employee,
  onEdit,
  onDelete,
}: {
  employee: Employee;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const roleInfo = getRoleInfo(employee.role);
  const Icon = roleInfo.icon;

  return (
    <Card className="border-border bg-card hover:shadow-md transition-shadow w-52">
      <CardContent className="pt-3 pb-2">
        <div className="flex flex-col items-center text-center space-y-2">
          {/* Profile Image */}
          <div className="relative">
            {employee.profile_image_url ? (
              <img
                src={employee.profile_image_url}
                alt={employee.name}
                className="w-14 h-14 rounded-full object-cover border-2 border-primary/20"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center border-2 border-primary/20">
                <UserCircle className="h-7 w-7 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Name and Role */}
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">{employee.name}</h3>
            {employee.description && (
              <p className="text-xs text-muted-foreground">{employee.description}</p>
            )}
            <div className="flex items-center justify-center gap-1">
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/50 border border-border ${roleInfo.color}`}>
                <Icon className="h-3 w-3" />
                <span className="text-xs font-medium text-foreground">{roleInfo.label}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-1 w-full mt-1">
            <Button variant="ghost" size="sm" onClick={onEdit} className="h-6 px-2 flex-1">
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-6 px-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState<"owner" | "supporter" | "employee">("employee");
  const [description, setDescription] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const supabase = createClient();

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Fehler beim Laden der Mitarbeiter", { description: error.message });
    } else {
      setEmployees(data || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  function openNew() {
    setEditEmployee(null);
    setName("");
    setRole("employee");
    setDescription("");
    setProfileImageUrl(null);
    setProfileImageFile(null);
    setDialogOpen(true);
  }

  function openEdit(employee: Employee) {
    setEditEmployee(employee);
    setName(employee.name);
    setRole(employee.role as "owner" | "supporter" | "employee");
    setDescription(employee.description || "");
    setProfileImageUrl(employee.profile_image_url);
    setProfileImageFile(null);
    setDialogOpen(true);
  }

  async function uploadProfileImage(file: File): Promise<string | null> {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `employees/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("employees")
        .upload(filePath, file);

      if (uploadError) {
        if (uploadError.message.includes("Bucket not found")) {
          toast.error("Speicher-Bucket nicht gefunden. Bitte in Supabase konfigurieren.");
          return null;
        }
        throw uploadError;
      }

      const { data } = supabase.storage.from("employees").getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error("Fehler beim Hochladen des Bildes", { description: error.message });
      return null;
    }
  }

  async function handleImageUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Bitte wählen Sie ein Bild aus");
      return;
    }

    setUploadingImage(true);
    const url = await uploadProfileImage(file);
    if (url) {
      setProfileImageUrl(url);
      setProfileImageFile(file);
    }
    setUploadingImage(false);
  }

  function removeImage() {
    setProfileImageUrl(null);
    setProfileImageFile(null);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Name ist erforderlich");
      return;
    }

    setSaving(true);

    try {
      let finalImageUrl = profileImageUrl;

      // Upload new image if file was selected
      if (profileImageFile && !profileImageUrl?.includes("employees/")) {
        finalImageUrl = await uploadProfileImage(profileImageFile);
      }

      if (editEmployee?.id) {
        const { error } = await supabase
          .from("employees")
          .update({
            name,
            role,
            description: description || null,
            profile_image_url: finalImageUrl,
          })
          .eq("id", editEmployee.id);

        if (error) {
          toast.error("Fehler beim Aktualisieren", { description: error.message });
        } else {
          toast.success("Mitarbeiter aktualisiert");
          setDialogOpen(false);
          loadEmployees();
        }
      } else {
        const { error } = await supabase.from("employees").insert({
          name,
          role,
          description: description || null,
          profile_image_url: finalImageUrl,
        });

        if (error) {
          toast.error("Fehler beim Erstellen", { description: error.message });
        } else {
          toast.success("Mitarbeiter erstellt");
          setDialogOpen(false);
          loadEmployees();
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(employee: Employee) {
    if (!confirm("Möchten Sie diesen Mitarbeiter wirklich löschen?")) return;

    const { error } = await supabase.from("employees").delete().eq("id", employee.id);
    if (error) {
      toast.error("Fehler beim Löschen", { description: error.message });
    } else {
      toast.success("Mitarbeiter gelöscht");
      loadEmployees();
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
          <h1 className="text-2xl font-bold text-foreground">Mitarbeiter</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Verwalten Sie Ihre Mitarbeiter</p>
        </div>
        <Button onClick={openNew} size="sm" className="bg-primary text-primary-foreground hover:bg-red-700">
          <Plus className="mr-2 h-4 w-4" />
          Neuer Mitarbeiter
        </Button>
      </div>

      {/* Employees - Grouped by Role */}
      {employees.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Noch keine Mitarbeiter vorhanden</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Owner Section */}
          {employees.filter((e) => e.role === "owner").length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                <Crown className="h-4 w-4 text-yellow-500" />
                Unternehmensinhaber
              </h2>
              <div className="flex flex-wrap gap-3">
                {employees
                  .filter((e) => e.role === "owner")
                  .map((employee) => (
                    <EmployeeCard
                      key={employee.id}
                      employee={employee}
                      onEdit={() => openEdit(employee)}
                      onDelete={() => handleDelete(employee)}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Supporter Section */}
          {employees.filter((e) => e.role === "supporter").length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-blue-500" />
                Unterstützer
              </h2>
              <div className="flex flex-wrap gap-3">
                {employees
                  .filter((e) => e.role === "supporter")
                  .map((employee) => (
                    <EmployeeCard
                      key={employee.id}
                      employee={employee}
                      onEdit={() => openEdit(employee)}
                      onDelete={() => handleDelete(employee)}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Employee Section */}
          {employees.filter((e) => e.role === "employee").length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-green-500" />
                Mitarbeiter
              </h2>
              <div className="flex flex-wrap gap-3">
                {employees
                  .filter((e) => e.role === "employee")
                  .map((employee) => (
                    <EmployeeCard
                      key={employee.id}
                      employee={employee}
                      onEdit={() => openEdit(employee)}
                      onDelete={() => handleDelete(employee)}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editEmployee ? "Mitarbeiter bearbeiten" : "Neuer Mitarbeiter"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Profile Image Upload */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                {profileImageUrl ? (
                  <div className="relative">
                    <img
                      src={profileImageUrl}
                      alt="Profilbild"
                      className="w-32 h-32 rounded-full object-cover border-4 border-primary/20"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center border-4 border-primary/20">
                    <UserCircle className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
              </div>
              <input
                type="file"
                id="profileImage"
                accept="image/*"
                onChange={(e) => handleImageUpload(e.target.files)}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("profileImage")?.click()}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Hochladen...
                  </>
                ) : (
                  <>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Profilbild hinzufügen
                  </>
                )}
              </Button>
            </div>

            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. Boris Plesnicar"
              />
            </div>
            <div>
              <Label htmlFor="role">Rolle *</Label>
              <Select value={role} onValueChange={(value) => setRole(value as "owner" | "supporter" | "employee")}>
                <SelectTrigger>
                  <SelectValue placeholder="Rolle auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_ROLES.map((roleOption) => {
                    const Icon = roleOption.icon;
                    return (
                      <SelectItem key={roleOption.value} value={roleOption.value}>
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${roleOption.color}`} />
                          {roleOption.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="description">Beschreibung (optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="z.B. IT & Bau, Bau Unterstützung"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={saving || uploadingImage}>
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
