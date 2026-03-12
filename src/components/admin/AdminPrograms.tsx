import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, GripVertical, Image, Loader2 } from "lucide-react";

interface Program {
  id: string;
  name: string;
  description: string | null;
  category: string;
  cover_image_url: string | null;
  durations: number[];
  is_active: boolean;
  sort_order: number;
}

const CATEGORIES = [
  "Strength", "Running", "HIIT", "Cardio", "Home", "Recovery",
  "Core", "Hypertrophy", "Performance", "Functional", "Endurance", "Hybrid", "Wellness",
];

const AdminPrograms = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<Program | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "Strength",
    durations: "4,8",
    is_active: true,
    cover_image_url: "",
  });

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ["admin-programs"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("programs")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data || []) as Program[];
    },
  });

  const openEditor = (program?: Program) => {
    if (program) {
      setEditing(program);
      setForm({
        name: program.name,
        description: program.description || "",
        category: program.category,
        durations: program.durations.join(","),
        is_active: program.is_active,
        cover_image_url: program.cover_image_url || "",
      });
    } else {
      setEditing(null);
      setForm({ name: "", description: "", category: "Strength", durations: "4,8", is_active: true, cover_image_url: "" });
    }
    setShowEditor(true);
  };

  const handleUploadCover = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("program-covers")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("program-covers").getPublicUrl(path);
      setForm((p) => ({ ...p, cover_image_url: urlData.publicUrl }));
      toast({ title: "Cover uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const durations = form.durations
        .split(",")
        .map((s) => parseInt(s.trim()))
        .filter((n) => !isNaN(n) && n > 0);

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category,
        durations,
        is_active: form.is_active,
        cover_image_url: form.cover_image_url || null,
      };

      if (editing) {
        const { error } = await (supabase as any)
          .from("programs")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Program updated" });
      } else {
        const { error } = await (supabase as any)
          .from("programs")
          .insert({ ...payload, sort_order: programs.length });
        if (error) throw error;
        toast({ title: "Program created" });
      }

      queryClient.invalidateQueries({ queryKey: ["admin-programs"] });
      queryClient.invalidateQueries({ queryKey: ["programs-list"] });
      setShowEditor(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this program?")) return;
    const { error } = await (supabase as any).from("programs").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["admin-programs"] });
      queryClient.invalidateQueries({ queryKey: ["programs-list"] });
      toast({ title: "Program deleted" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl tracking-wide">Programs</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage training programs clients can enroll in</p>
        </div>
        <Button onClick={() => openEditor()} className="gap-2">
          <Plus className="w-4 h-4" /> New Program
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-card animate-pulse" />
          ))}
        </div>
      ) : programs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground mb-4">No programs yet. Create your first program.</p>
          <Button onClick={() => openEditor()} variant="outline">
            <Plus className="w-4 h-4 mr-2" /> Create Program
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map((program) => (
            <div
              key={program.id}
              className={`rounded-2xl border border-border overflow-hidden bg-card group relative ${
                !program.is_active ? "opacity-50" : ""
              }`}
            >
              {/* Cover */}
              <div className="relative h-44">
                {program.cover_image_url ? (
                  <img src={program.cover_image_url} alt={program.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Image className="w-10 h-10 text-muted-foreground/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />

                {/* Actions overlay */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEditor(program)}
                    className="p-2 rounded-lg bg-card/80 backdrop-blur-sm hover:bg-card transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(program.id)}
                    className="p-2 rounded-lg bg-card/80 backdrop-blur-sm hover:bg-destructive/80 hover:text-destructive-foreground transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {!program.is_active && (
                  <div className="absolute top-2 left-2">
                    <span className="text-[9px] uppercase tracking-wider bg-muted/80 backdrop-blur-sm text-muted-foreground px-2 py-1 rounded-full">
                      Inactive
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-heading text-sm">{program.name}</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{program.category}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {program.durations.join("/")} wk
                  </span>
                </div>
                {program.description && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{program.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">
              {editing ? "Edit Program" : "New Program"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Cover Image */}
            <div className="space-y-2">
              <Label className="text-xs">Cover Image</Label>
              {form.cover_image_url ? (
                <div className="relative rounded-xl overflow-hidden h-40">
                  <img src={form.cover_image_url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setForm((p) => ({ ...p, cover_image_url: "" }))}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-card/80 backdrop-blur-sm hover:bg-destructive/80 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-40 rounded-xl border-2 border-dashed border-border hover:border-foreground/20 cursor-pointer transition-colors">
                  {uploading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <Image className="w-8 h-8 text-muted-foreground/40 mb-2" />
                      <span className="text-xs text-muted-foreground">Click to upload cover photo</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleUploadCover(e.target.files[0])}
                    disabled={uploading}
                  />
                </label>
              )}
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs">Program Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Beginner Strength"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Short description of the program..."
                rows={3}
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setForm((p) => ({ ...p, category: cat }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      form.category === cat
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Durations */}
            <div className="space-y-1.5">
              <Label className="text-xs">Available Durations (comma-separated weeks)</Label>
              <Input
                value={form.durations}
                onChange={(e) => setForm((p) => ({ ...p, durations: e.target.value }))}
                placeholder="4,8,12"
              />
            </div>

            {/* Active */}
            <div className="flex items-center justify-between">
              <Label className="text-xs">Active (visible to clients)</Label>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
              />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editing ? "Save Changes" : "Create Program"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPrograms;
