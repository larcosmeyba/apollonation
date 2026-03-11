import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, Plus, Trash2, GripVertical, Save } from "lucide-react";
import { toast } from "sonner";

interface SlideshowEditorProps {
  slideshowId: string;
  slideshow: any;
  slides: any[];
  onBack: () => void;
}

const SlideshowEditor = ({ slideshowId, slideshow, slides, onBack }: SlideshowEditorProps) => {
  const [title, setTitle] = useState(slideshow.title || "");
  const [equipment, setEquipment] = useState<string[]>(slideshow.equipment || []);
  const [newEquipment, setNewEquipment] = useState("");
  const [localSlides, setLocalSlides] = useState(
    slides.filter((s) => s.slide_type === "exercise").map((s) => ({ ...s }))
  );
  const [saving, setSaving] = useState(false);

  const addSlide = () => {
    setLocalSlides((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        slideshow_id: slideshowId,
        slide_number: prev.length + 1,
        slide_type: "exercise",
        exercise_name: "",
        sets: 3,
        reps: "10",
        rest_seconds: 30,
        coaching_cue: "",
      },
    ]);
  };

  const updateSlide = (index: number, field: string, value: any) => {
    setLocalSlides((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const removeSlide = (index: number) => {
    setLocalSlides((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update slideshow metadata
      await supabase
        .from("group_coaching_slideshows")
        .update({ title, equipment })
        .eq("id", slideshowId);

      // Delete old slides
      await supabase.from("slideshow_slides").delete().eq("slideshow_id", slideshowId);

      // Insert updated slides
      if (localSlides.length > 0) {
        const newSlides = localSlides.map((s, i) => ({
          slideshow_id: slideshowId,
          slide_number: i + 1,
          slide_type: "exercise",
          exercise_name: s.exercise_name,
          sets: s.sets ? Number(s.sets) : null,
          reps: s.reps,
          rest_seconds: s.rest_seconds ? Number(s.rest_seconds) : null,
          coaching_cue: s.coaching_cue,
          thumbnail_url: s.thumbnail_url || null,
          video_url: s.video_url || null,
          notes: s.notes || null,
        }));
        const { error } = await supabase.from("slideshow_slides").insert(newSlides);
        if (error) throw error;
      }

      toast.success("Slideshow saved!");
      onBack();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Button onClick={handleSave} disabled={saving} className="bg-foreground text-background hover:opacity-90">
          <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <label className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Title</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-sm font-medium" />
      </div>

      {/* Equipment */}
      <div className="space-y-2">
        <label className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Equipment</label>
        <div className="flex flex-wrap gap-2">
          {equipment.map((e) => (
            <span
              key={e}
              className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-full border border-border bg-card text-foreground"
            >
              {e}
              <button onClick={() => setEquipment((prev) => prev.filter((x) => x !== e))} className="text-muted-foreground hover:text-foreground">
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2 max-w-xs">
          <Input
            value={newEquipment}
            onChange={(e) => setNewEquipment(e.target.value)}
            placeholder="Add equipment..."
            className="text-sm h-9"
            onKeyDown={(e) => {
              if (e.key === "Enter" && newEquipment.trim()) {
                setEquipment((prev) => [...prev, newEquipment.trim()]);
                setNewEquipment("");
              }
            }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (newEquipment.trim()) {
                setEquipment((prev) => [...prev, newEquipment.trim()]);
                setNewEquipment("");
              }
            }}
          >
            Add
          </Button>
        </div>
      </div>

      {/* Exercises */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Exercises</label>
          <Button variant="outline" size="sm" onClick={addSlide}>
            <Plus className="w-4 h-4 mr-1" /> Add Exercise
          </Button>
        </div>

        {localSlides.map((slide, i) => (
          <Card key={slide.id} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex items-center gap-1 pt-2">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground w-5 text-center">{i + 1}</span>
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <Input
                      value={slide.exercise_name || ""}
                      onChange={(e) => updateSlide(i, "exercise_name", e.target.value)}
                      placeholder="Exercise name"
                      className="text-sm font-medium"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground">Sets</label>
                      <Input
                        type="number"
                        value={slide.sets || ""}
                        onChange={(e) => updateSlide(i, "sets", e.target.value)}
                        className="text-sm h-8"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Reps</label>
                      <Input
                        value={slide.reps || ""}
                        onChange={(e) => updateSlide(i, "reps", e.target.value)}
                        className="text-sm h-8"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Rest (s)</label>
                      <Input
                        type="number"
                        value={slide.rest_seconds || ""}
                        onChange={(e) => updateSlide(i, "rest_seconds", e.target.value)}
                        className="text-sm h-8"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Coaching Cue</label>
                    <Input
                      value={slide.coaching_cue || ""}
                      onChange={(e) => updateSlide(i, "coaching_cue", e.target.value)}
                      placeholder="Motivational cue..."
                      className="text-sm h-8"
                    />
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-8 w-8 mt-1" onClick={() => removeSlide(i)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {localSlides.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No exercises yet. Click "Add Exercise" to get started.
          </div>
        )}
      </div>
    </div>
  );
};

export default SlideshowEditor;
