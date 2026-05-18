import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Category {
  id: string;
  slug: string;
  name: string;
  thumbnail_url: string | null;
  sort_order: number;
  updated_at: string;
}

const AdminCategories = () => {
  const qc = useQueryClient();
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["admin-workout-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_categories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Category[];
    },
  });

  const handleUpload = async (cat: Category, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image must be under 8MB");
      return;
    }
    setUploadingId(cat.id);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `categories/${cat.slug}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("thumbnails")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("thumbnails").getPublicUrl(path);
      const { error: dbErr } = await supabase
        .from("workout_categories")
        .update({ thumbnail_url: pub.publicUrl })
        .eq("id", cat.id);
      if (dbErr) throw dbErr;
      toast.success(`${cat.name} thumbnail updated`);
      qc.invalidateQueries({ queryKey: ["admin-workout-categories"] });
      qc.invalidateQueries({ queryKey: ["workout-categories"] });
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploadingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Workout Categories</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Edit the cover photos shown for each category on the website and in the app.
          Changes appear instantly for all users — no app update required.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => {
          const isUploading = uploadingId === cat.id;
          return (
            <div
              key={cat.id}
              className="bg-card border border-border rounded-xl overflow-hidden flex flex-col"
            >
              <div className="relative aspect-video bg-muted">
                {cat.thumbnail_url ? (
                  <img
                    src={`${cat.thumbnail_url}?v=${new Date(cat.updated_at).getTime()}`}
                    alt={cat.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <span className="absolute bottom-3 left-3 text-white font-bold text-lg drop-shadow">
                  {cat.name}
                </span>
              </div>

              <div className="p-3 flex items-center gap-2">
                <input
                  ref={(el) => (fileInputs.current[cat.id] = el)}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(cat, f);
                    e.target.value = "";
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled={isUploading}
                  onClick={() => fileInputs.current[cat.id]?.click()}
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {cat.thumbnail_url ? "Replace photo" : "Upload photo"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminCategories;
