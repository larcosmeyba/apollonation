import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AdminExercise,
  EQUIPMENT_OPTIONS,
  MOVEMENT_TYPES,
  MUSCLE_GROUPS,
  muxMp4,
  muxThumb,
} from "./exerciseTypes";
import { Loader2, X, Sparkles } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  exercise: AdminExercise | null;
  allExercises: AdminExercise[];
  onSaved: () => void;
}

const blank: Partial<AdminExercise> = {
  name: "",
  mux_playback_id: "",
  orientation: "horizontal",
  muscle_group: "full-body",
  equipment: [],
  difficulty: "beginner",
  movement_type: null,
  alternative_exercise_id: null,
  coaching_notes: "",
  weight_recommendation: "",
  tempo_recommendation: "",
  contraindications: "",
  loop_in_seconds: 0,
  loop_out_seconds: null,
  tags: [],
};

const ExerciseEditorSheet = ({ open, onOpenChange, exercise, allExercises, onSaved }: Props) => {
  const [form, setForm] = useState<Partial<AdminExercise>>(blank);
  const [saving, setSaving] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setForm(exercise ? { ...exercise } : blank);
  }, [exercise, open]);

  const set = <K extends keyof AdminExercise>(k: K, v: AdminExercise[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleArr = (k: "equipment" | "tags", v: string) => {
    const cur = (form[k] as string[]) || [];
    set(k, cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]);
  };

  const handleSave = async () => {
    if (!form.name?.trim()) return toast.error("Name required");
    setSaving(true);
    const payload = {
      ...form,
      thumbnail_url: form.mux_playback_id ? muxThumb(form.mux_playback_id) : null,
      alternative_exercise_id: form.alternative_exercise_id || null,
    };
    const res = exercise
      ? await supabase.from("admin_exercises").update(payload).eq("id", exercise.id)
      : await supabase.from("admin_exercises").insert(payload as any);
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success("Saved");
    onSaved();
    onOpenChange(false);
  };

  const setLoopFromVideo = (which: "in" | "out") => {
    const t = videoRef.current?.currentTime ?? 0;
    set(which === "in" ? "loop_in_seconds" : "loop_out_seconds", Number(t.toFixed(2)));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{exercise ? "Edit Exercise" : "Add Exercise"}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4 pb-12">
          <div>
            <Label>Name *</Label>
            <Input value={form.name || ""} onChange={(e) => set("name", e.target.value)} />
          </div>

          <div>
            <Label>MUX Playback ID</Label>
            <Input
              placeholder="e.g. abc123XyZ"
              value={form.mux_playback_id || ""}
              onChange={(e) => set("mux_playback_id", e.target.value.trim())}
            />
            <p className="text-xs text-muted-foreground mt-1">
              From your MUX dashboard. Thumbnail auto-fetched.
            </p>
          </div>

          {form.mux_playback_id && (
            <div className="space-y-2">
              <video
                ref={videoRef}
                src={muxMp4(form.mux_playback_id)}
                controls
                onLoadedMetadata={(e) => setDuration((e.target as HTMLVideoElement).duration)}
                className="w-full rounded-lg bg-black aspect-video"
              />
              <div className="flex flex-wrap gap-2 items-center">
                <Button type="button" variant="outline" size="sm" onClick={() => setLoopFromVideo("in")}>
                  Set Loop In
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setLoopFromVideo("out")}>
                  Set Loop Out
                </Button>
                <span className="text-xs text-muted-foreground">
                  In: {form.loop_in_seconds ?? 0}s · Out: {form.loop_out_seconds ?? "end"}
                  {duration > 0 && ` · Duration: ${duration.toFixed(1)}s`}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Orientation</Label>
              <select
                value={form.orientation}
                onChange={(e) => set("orientation", e.target.value as any)}
                className="w-full bg-background border border-input rounded-md h-10 px-3 text-sm"
              >
                <option value="horizontal">Horizontal</option>
                <option value="vertical">Vertical</option>
              </select>
            </div>
            <div>
              <Label>Difficulty</Label>
              <select
                value={form.difficulty}
                onChange={(e) => set("difficulty", e.target.value as any)}
                className="w-full bg-background border border-input rounded-md h-10 px-3 text-sm"
              >
                <option>beginner</option>
                <option>intermediate</option>
                <option>advanced</option>
              </select>
            </div>
            <div>
              <Label>Muscle Group</Label>
              <select
                value={form.muscle_group || ""}
                onChange={(e) => set("muscle_group", e.target.value)}
                className="w-full bg-background border border-input rounded-md h-10 px-3 text-sm"
              >
                {MUSCLE_GROUPS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Movement Type</Label>
              <select
                value={form.movement_type || ""}
                onChange={(e) => set("movement_type", e.target.value || null)}
                className="w-full bg-background border border-input rounded-md h-10 px-3 text-sm"
              >
                <option value="">—</option>
                {MOVEMENT_TYPES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label>Equipment</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {EQUIPMENT_OPTIONS.map((eq) => {
                const on = form.equipment?.includes(eq);
                return (
                  <button
                    key={eq}
                    type="button"
                    onClick={() => toggleArr("equipment", eq)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      on ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                    }`}
                  >
                    {eq}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label>Alternative (Beginner-Friendly) Exercise</Label>
            <select
              value={form.alternative_exercise_id || ""}
              onChange={(e) => set("alternative_exercise_id", e.target.value || null)}
              className="w-full bg-background border border-input rounded-md h-10 px-3 text-sm"
            >
              <option value="">— None —</option>
              {allExercises
                .filter((x) => x.id !== exercise?.id)
                .map((x) => (
                  <option key={x.id} value={x.id}>{x.name}</option>
                ))}
            </select>
          </div>

          <div>
            <Label>Coaching Notes</Label>
            <Textarea
              rows={3}
              value={form.coaching_notes || ""}
              onChange={(e) => set("coaching_notes", e.target.value)}
              placeholder="Cues displayed during the class…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Weight Recommendation</Label>
              <Input
                value={form.weight_recommendation || ""}
                onChange={(e) => set("weight_recommendation", e.target.value)}
                placeholder="e.g. 15-25 lbs"
              />
            </div>
            <div>
              <Label>Tempo</Label>
              <Input
                value={form.tempo_recommendation || ""}
                onChange={(e) => set("tempo_recommendation", e.target.value)}
                placeholder="e.g. 3-1-1"
              />
            </div>
          </div>

          <div>
            <Label>Tags (comma-separated)</Label>
            <Input
              value={(form.tags || []).join(", ")}
              onChange={(e) =>
                set("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))
              }
              placeholder="strength, lower-body, explosive"
            />
            {(form.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {(form.tags || []).map((t) => (
                  <Badge key={t} variant="secondary" className="text-[10px]">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4 sticky bottom-0 bg-background py-3">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" /> Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ExerciseEditorSheet;
