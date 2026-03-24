import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Plus, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { format } from "date-fns";

const PHOTO_TYPES = ["front", "side", "back"] as const;

const DashboardTransformation = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [photoType, setPhotoType] = useState<string>("front");
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ["progress-photos", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await (supabase as any)
        .from("progress_photos")
        .select("*")
        .eq("user_id", user.id)
        .order("photo_date", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Group photos by date
  const dateGroups = photos.reduce((acc: Record<string, any[]>, photo: any) => {
    const d = photo.photo_date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(photo);
    return acc;
  }, {});

  const dates = Object.keys(dateGroups).sort((a, b) => b.localeCompare(a));
  const currentDate = dates[selectedDateIdx];
  const currentPhotos = currentDate ? dateGroups[currentDate] : [];

  const getSignedUrl = async (path: string) => {
    const { data } = await supabase.storage.from("progress-photos").createSignedUrl(path, 3600);
    return data?.signedUrl || "";
  };

  const handleUpload = async (file: File) => {
    if (!user || !file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("progress-photos").upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await (supabase as any).from("progress_photos").insert({
        user_id: user.id,
        photo_type: photoType,
        photo_url: filePath,
        weight_lbs: weight ? parseFloat(weight) : null,
        body_fat_pct: bodyFat ? parseFloat(bodyFat) : null,
      });
      if (dbError) throw dbError;

      toast({ title: "Photo uploaded!" });
      queryClient.invalidateQueries({ queryKey: ["progress-photos"] });
      setDialogOpen(false);
      setWeight("");
      setBodyFat("");
      setSelectedDateIdx(0);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl tracking-wide">Transformation</h1>
            <p className="text-xs text-muted-foreground">Track your visual progress</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="apollo" size="sm"><Plus className="w-4 h-4 mr-1" /> Add Photo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Progress Photo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Photo Type</Label>
                  <Select value={photoType} onValueChange={setPhotoType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PHOTO_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Weight (lbs)</Label>
                    <Input type="number" placeholder="175" value={weight} onChange={(e) => setWeight(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Body Fat %</Label>
                    <Input type="number" placeholder="15" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} />
                  </div>
                </div>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                <Button variant="apollo" className="w-full" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Camera className="w-4 h-4 mr-2" />}
                  {uploading ? "Uploading..." : "Take or Select Photo"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground">Loading...</div>
        ) : dates.length === 0 ? (
          <div className="text-center py-20">
            <Camera className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">No progress photos yet. Upload your first photo to start tracking.</p>
          </div>
        ) : (
          <>
            {/* Date navigation */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" disabled={selectedDateIdx >= dates.length - 1} onClick={() => setSelectedDateIdx((i) => i + 1)}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="text-center">
                <p className="font-heading text-lg">{format(new Date(currentDate + "T12:00:00"), "MMMM d, yyyy")}</p>
                <p className="text-[10px] text-muted-foreground">{dates.length} check-in{dates.length !== 1 && "s"} total</p>
              </div>
              <Button variant="ghost" size="icon" disabled={selectedDateIdx <= 0} onClick={() => setSelectedDateIdx((i) => i - 1)}>
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            {/* Photo grid */}
            <div className="grid grid-cols-3 gap-3">
              {PHOTO_TYPES.map((type) => {
                const photo = currentPhotos.find((p: any) => p.photo_type === type);
                return (
                  <div key={type} className="rounded-xl border border-border bg-card overflow-hidden">
                    <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest py-2 border-b border-border/50">{type}</p>
                    {photo ? (
                      <PhotoImage path={photo.photo_url} />
                    ) : (
                      <div className="aspect-[3/4] flex items-center justify-center bg-muted/20">
                        <Camera className="w-6 h-6 text-muted-foreground/20" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Stats for this date */}
            {currentPhotos[0] && (currentPhotos[0].weight_lbs || currentPhotos[0].body_fat_pct) && (
              <div className="flex items-center justify-center gap-6 text-sm">
                {currentPhotos[0].weight_lbs && (
                  <div className="text-center">
                    <p className="font-heading text-lg">{currentPhotos[0].weight_lbs}</p>
                    <p className="text-[10px] text-muted-foreground">lbs</p>
                  </div>
                )}
                {currentPhotos[0].body_fat_pct && (
                  <div className="text-center">
                    <p className="font-heading text-lg">{currentPhotos[0].body_fat_pct}%</p>
                    <p className="text-[10px] text-muted-foreground">Body Fat</p>
                  </div>
                )}
              </div>
            )}

            {/* Timeline dots */}
            <div className="flex items-center justify-center gap-1 py-2">
              {dates.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedDateIdx(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${i === selectedDateIdx ? "bg-primary" : "bg-muted"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

// Separate component for signed URL image loading
const PhotoImage = ({ path }: { path: string }) => {
  const { data: url } = useQuery({
    queryKey: ["signed-photo", path],
    queryFn: async () => {
      const { data } = await supabase.storage.from("progress-photos").createSignedUrl(path, 3600);
      return data?.signedUrl || "";
    },
    staleTime: 1000 * 60 * 30,
  });

  if (!url) return <div className="aspect-[3/4] flex items-center justify-center bg-muted/20"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>;
  return <img src={url} alt="Progress" className="aspect-[3/4] object-cover w-full" />;
};

export default DashboardTransformation;
