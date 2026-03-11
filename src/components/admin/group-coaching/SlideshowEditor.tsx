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

interface LocalSlide {
  id: string;
  slideshow_id: string;
  slide_number: number;
  slide_type: string;
  exercise_name: string;
  sets: number | null;
  reps: string;
  rest_seconds: number | null;
  coaching_cue: string;
  block_label: string;
  thumbnail_url?: string | null;
  video_url?: string | null;
  notes?: string | null;
}

const SlideshowEditor = ({ slideshowId, slideshow, slides, onBack }: SlideshowEditorProps) => {
  const [title, setTitle] = useState(slideshow.title || "");
  const [equipment, setEquipment] = useState<string[]>(slideshow.equipment || []);
  const [newEquipment, setNewEquipment] = useState("");
  const [localSlides, setLocalSlides] = useState<LocalSlide[]>(
    slides
      .filter((s) => s.slide_type === "exercise")
      .map((s) => ({
        ...s,
        block_label: s.block_label || "Block 1",
      }))
  );
  const [saving, setSaving] = useState(false);

  // Get unique block labels in order
  const blockLabels = [...new Set(localSlides.map((s) => s.block_label))];

  const addBlock = () => {
    const nextNum = blockLabels.length + 1;
    const label = `Block ${nextNum}`;
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
        block_label: label,
      },
    ]);
  };

  const addExerciseToBlock = (blockLabel: string) => {
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
        block_label: blockLabel,
      },
    ]);
  };

  const updateSlide = (id: string, field: string, value: any) => {
    setLocalSlides((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const removeSlide = (id: string) => {
    setLocalSlides((prev) => prev.filter((s) => s.id !== id));
  };

  const renameBlock = (oldLabel: string, newLabel: string) => {
    setLocalSlides((prev) =>
      prev.map((s) => (s.block_label === oldLabel ? { ...s, block_label: newLabel } : s))
    );
  };

  const removeBlock = (blockLabel: string) => {
    setLocalSlides((prev) => prev.filter((s) => s.block_label !== blockLabel));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase
        .from("group_coaching_slideshows")
        .update({ title, equipment })
        .eq("id", slideshowId);

      await supabase.from("slideshow_slides").delete().eq("slideshow_id", slideshowId);

      if (localSlides.length > 0) {
        const newSlides = localSlides.map((s, i) => ({
          slideshow_id: slideshowId,
          slide_number: i + 1,
          slide_type: "exercise" as const,
          exercise_name: s.exercise_name,
          sets: s.sets ? Number(s.sets) : null,
          reps: s.reps,
          rest_seconds: s.rest_seconds ? Number(s.rest_seconds) : null,
          coaching_cue: s.coaching_cue,
          block_label: s.block_label,
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

      {/* Info about auto slides */}
      <div className="rounded-lg border border-border bg-card/50 p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground text-sm">Slideshow Structure</p>
        <p>📋 Welcome Slide → 🔥 Dynamic Warm-Up (5 min) → 💪 Workout Blocks → 🧘 Cool Down + QR Code</p>
        <p>The warm-up and cool-down slides are automatic. Edit your workout blocks below.</p>
      </div>

      {/* Blocks */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <label className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Workout Blocks</label>
          <Button variant="outline" size="sm" onClick={addBlock}>
            <Plus className="w-4 h-4 mr-1" /> Add Block
          </Button>
        </div>

        {blockLabels.map((blockLabel) => {
          const blockSlides = localSlides.filter((s) => s.block_label === blockLabel);
          return (
            <div key={blockLabel} className="space-y-3">
              <div className="flex items-center gap-3">
                <Input
                  value={blockLabel}
                  onChange={(e) => renameBlock(blockLabel, e.target.value)}
                  className="text-sm font-heading tracking-wider max-w-[200px] h-8 uppercase"
                />
                <span className="text-xs text-muted-foreground">{blockSlides.length} exercise{blockSlides.length !== 1 ? "s" : ""}</span>
                <div className="flex-1" />
                <Button variant="ghost" size="sm" onClick={() => addExerciseToBlock(blockLabel)} className="text-xs">
                  <Plus className="w-3 h-3 mr-1" /> Exercise
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive h-7 w-7"
                  onClick={() => {
                    if (confirm(`Delete "${blockLabel}" and all its exercises?`)) removeBlock(blockLabel);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>

              {blockSlides.map((slide, i) => (
                <Card key={slide.id} className="bg-card border-border ml-4">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center gap-1 pt-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground w-5 text-center font-medium">
                          {String.fromCharCode(65 + i)}
                        </span>
                      </div>
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                          <Input
                            value={slide.exercise_name || ""}
                            onChange={(e) => updateSlide(slide.id, "exercise_name", e.target.value)}
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
                              onChange={(e) => updateSlide(slide.id, "sets", e.target.value)}
                              className="text-sm h-8"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground">Reps</label>
                            <Input
                              value={slide.reps || ""}
                              onChange={(e) => updateSlide(slide.id, "reps", e.target.value)}
                              className="text-sm h-8"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground">Rest (s)</label>
                            <Input
                              type="number"
                              value={slide.rest_seconds || ""}
                              onChange={(e) => updateSlide(slide.id, "rest_seconds", e.target.value)}
                              className="text-sm h-8"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground">Coaching Cue</label>
                          <Input
                            value={slide.coaching_cue || ""}
                            onChange={(e) => updateSlide(slide.id, "coaching_cue", e.target.value)}
                            placeholder="Motivational cue..."
                            className="text-sm h-8"
                          />
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-8 w-8 mt-1" onClick={() => removeSlide(slide.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          );
        })}

        {blockLabels.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No blocks yet. Click "Add Block" to start building your workout.
          </div>
        )}
      </div>
    </div>
  );
};

export default SlideshowEditor;
