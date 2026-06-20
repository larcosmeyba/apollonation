import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  AdminExercise,
  EQUIPMENT_OPTIONS,
  EXERCISE_CATEGORIES,
  ExerciseCategory,
  muxThumb,
} from "./library/exerciseTypes";
import OnDemandClassPlayer, { PlayerBlock } from "./library/OnDemandClassPlayer";
import PreWorkoutMusicPrompt from "@/components/dashboard/PreWorkoutMusicPrompt";
import RenderMp4Panel from "./library/RenderMp4Panel";
import MissingMuxReport from "./library/MissingMuxReport";
import {
  Plus, Play, Save, Trash2, GripVertical, Sparkles, Loader2, ChevronUp, ChevronDown, FolderOpen,
  Bookmark, Download, ChevronRight,
} from "lucide-react";

type SectionId = "warmup" | "workout_a" | "workout_b" | "workout_c" | "cooldown";

interface Block {
  id: string;
  section: SectionId;
  exercise_id: string | null;
  alt_exercise_id: string | null;
  work_seconds: number;
  rest_seconds: number;
  sets: number;
  set_rest_seconds: number;
  cue_overrides: string;
  weight_prompt: string;
  tempo_prompt: string;
  drop_set: boolean;
}

const SECTIONS: { id: SectionId; label: string; targetSeconds: number }[] = [
  { id: "warmup", label: "Warm Up", targetSeconds: 120 },
  { id: "workout_a", label: "Workout Block A", targetSeconds: 300 },
  { id: "workout_b", label: "Workout Block B", targetSeconds: 300 },
  { id: "workout_c", label: "Workout Block C", targetSeconds: 300 },
  { id: "cooldown", label: "Cool Down", targetSeconds: 180 },
];

const sectionDefaults = (section: SectionId): Partial<Block> => {
  if (section === "warmup") return { work_seconds: 30, rest_seconds: 0, sets: 1, set_rest_seconds: 0 };
  if (section === "cooldown") return { work_seconds: 45, rest_seconds: 0, sets: 1, set_rest_seconds: 0 };
  return { work_seconds: 45, rest_seconds: 15, sets: 1, set_rest_seconds: 0 };
};

const newBlock = (section: SectionId, exercise_id: string | null, alt_id: string | null = null): Block => ({
  id: crypto.randomUUID(),
  section,
  exercise_id,
  alt_exercise_id: alt_id,
  work_seconds: 40,
  rest_seconds: 20,
  sets: 1,
  set_rest_seconds: 30,
  cue_overrides: "",
  weight_prompt: "",
  tempo_prompt: "",
  drop_set: false,
  ...sectionDefaults(section),
});

const blockSeconds = (b: Block) =>
  b.sets * b.work_seconds + Math.max(0, b.sets - 1) * b.set_rest_seconds + b.rest_seconds;

const fmtMMSS = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
};

const CLASS_TYPES = ["strength", "sculpt", "stretch", "cardio"] as const;

const AdminClassBuilder = () => {
  const qc = useQueryClient();
  const [classId, setClassId] = useState<string | null>(null);
  const [meta, setMeta] = useState({
    title: "",
    description: "",
    duration_minutes: 20,
    class_type: "strength" as (typeof CLASS_TYPES)[number],
    equipment: [] as string[],
    difficulty: "beginner" as "beginner" | "intermediate" | "advanced",
    intro_enabled: true,
    thumbnail_url: "" as string,
  });
  const [thumbUploading, setThumbUploading] = useState(false);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [targetSection, setTargetSection] = useState<SectionId>("workout_a");
  const [collapsed, setCollapsed] = useState<Record<SectionId, boolean>>({
    warmup: false, workout_a: false, workout_b: false, workout_c: false, cooldown: false,
  });
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ExerciseCategory | "all">("all");
  const [difficultyFilter, setDifficultyFilter] = useState<"all" | "beginner" | "intermediate" | "advanced">("all");
  const [previewing, setPreviewing] = useState(false);
  const [musicPrompting, setMusicPrompting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showOpenList, setShowOpenList] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const { data: exercises = [] } = useQuery({
    queryKey: ["admin-exercises"],
    queryFn: async () => {
      const { data, error } = await supabase.from("admin_exercises").select("*");
      if (error) throw error;
      return (data || []) as AdminExercise[];
    },
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["admin-classes"],
    queryFn: async () => {
      const { data } = await supabase.from("admin_classes").select("*").order("updated_at", { ascending: false });
      return data || [];
    },
  });

  const horizontalLib = useMemo(
    () => exercises.filter((e) => e.orientation === "horizontal" && e.mux_playback_id),
    [exercises]
  );

  const filteredLib = horizontalLib.filter((e) => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== "all" && e.category !== categoryFilter) return false;
    if (difficultyFilter !== "all" && e.difficulty !== difficultyFilter) return false;
    return true;
  });

  const exById = useMemo(() => {
    const m = new Map<string, AdminExercise>();
    exercises.forEach((e) => m.set(e.id, e));
    return m;
  }, [exercises]);

  const addExercise = (id: string, section: SectionId = targetSection) => {
    const ex = exById.get(id);
    setBlocks((b) => [...b, newBlock(section, id, ex?.alternative_exercise_id || null)]);
    setCollapsed((c) => ({ ...c, [section]: false }));
  };

  const updateBlock = (id: string, patch: Partial<Block>) =>
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const removeBlock = (id: string) => setBlocks((bs) => bs.filter((b) => b.id !== id));

  const moveBlockInSection = (id: string, dir: -1 | 1) => {
    setBlocks((bs) => {
      const target = bs.find((b) => b.id === id);
      if (!target) return bs;
      const sameSection = bs.filter((b) => b.section === target.section);
      const idxInSection = sameSection.findIndex((b) => b.id === id);
      const j = idxInSection + dir;
      if (j < 0 || j >= sameSection.length) return bs;
      const swap = sameSection[j];
      // Rebuild: swap positions of target and swap in bs
      const aIdx = bs.indexOf(target);
      const bIdx = bs.indexOf(swap);
      const copy = [...bs];
      [copy[aIdx], copy[bIdx]] = [copy[bIdx], copy[aIdx]];
      return copy;
    });
  };

  const sectionBlocks = (s: SectionId) => blocks.filter((b) => b.section === s);
  const sectionSeconds = (s: SectionId) => sectionBlocks(s).reduce((sum, b) => sum + blockSeconds(b), 0);
  const totalSeconds = blocks.reduce((sum, b) => sum + blockSeconds(b), 0);

  const orderedBlocks = useMemo(
    () => SECTIONS.flatMap((s) => sectionBlocks(s.id)),
    [blocks]
  );

  const playerBlocks: PlayerBlock[] = orderedBlocks.map((b) => ({
    exercise: b.exercise_id ? exById.get(b.exercise_id) || null : null,
    alt: b.alt_exercise_id ? exById.get(b.alt_exercise_id) || null : null,
    work_seconds: b.work_seconds,
    rest_seconds: b.rest_seconds,
    sets: b.sets,
    set_rest_seconds: b.set_rest_seconds,
    cue_overrides: b.cue_overrides,
    weight_prompt: b.weight_prompt,
    tempo_prompt: b.tempo_prompt,
    drop_set: b.drop_set,
    section: b.section,
  }));

  const loadClass = async (id: string) => {
    const { data: c } = await supabase.from("admin_classes").select("*").eq("id", id).maybeSingle();
    const { data: bs } = await supabase
      .from("admin_class_blocks")
      .select("*")
      .eq("class_id", id)
      .order("sort_order");
    if (!c) return;
    setClassId(id);
    setMeta({
      title: c.title,
      description: c.description || "",
      duration_minutes: c.duration_minutes,
      class_type: c.class_type as any,
      equipment: c.equipment || [],
      difficulty: c.difficulty as any,
      intro_enabled: c.intro_enabled,
      thumbnail_url: (c as any).thumbnail_url || "",
    });
    setBlocks(
      (bs || []).map((b: any) => ({
        id: b.id,
        section: (b.section as SectionId) || "workout_a",
        exercise_id: b.exercise_id,
        alt_exercise_id: b.alt_exercise_id,
        work_seconds: b.work_seconds,
        rest_seconds: b.rest_seconds,
        sets: b.sets,
        set_rest_seconds: b.set_rest_seconds,
        cue_overrides: b.cue_overrides || "",
        weight_prompt: b.weight_prompt || "",
        tempo_prompt: b.tempo_prompt || "",
        drop_set: b.drop_set,
      }))
    );
    setShowOpenList(false);
  };

  const newClass = () => {
    setClassId(null);
    setMeta({
      title: "",
      description: "",
      duration_minutes: 20,
      class_type: "strength",
      equipment: [],
      difficulty: "beginner",
      intro_enabled: true,
      thumbnail_url: "",
    });
    setBlocks([]);
  };

  const saveClass = async (status: "draft" | "published") => {
    if (!meta.title.trim()) return toast.error("Title required");
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = { ...meta, status, created_by: user?.id };
    let id = classId;
    if (id) {
      const { error } = await supabase.from("admin_classes").update(payload).eq("id", id);
      if (error) { setSaving(false); return toast.error(error.message); }
      await supabase.from("admin_class_blocks").delete().eq("class_id", id);
    } else {
      const { data, error } = await supabase.from("admin_classes").insert(payload).select().single();
      if (error || !data) { setSaving(false); return toast.error(error?.message || "Failed"); }
      id = data.id;
      setClassId(id);
    }
    if (orderedBlocks.length > 0) {
      const rows = orderedBlocks.map((b, i) => ({
        class_id: id!,
        sort_order: i,
        kind: "exercise",
        section: b.section,
        exercise_id: b.exercise_id,
        alt_exercise_id: b.alt_exercise_id,
        work_seconds: b.work_seconds,
        rest_seconds: b.rest_seconds,
        sets: b.sets,
        set_rest_seconds: b.set_rest_seconds,
        cue_overrides: b.cue_overrides || null,
        weight_prompt: b.weight_prompt || null,
        tempo_prompt: b.tempo_prompt || null,
        drop_set: b.drop_set,
      }));
      const { error } = await supabase.from("admin_class_blocks").insert(rows as any);
      if (error) { setSaving(false); return toast.error(error.message); }
    }
    setSaving(false);
    toast.success(`Class ${status === "published" ? "published" : "saved"}`);
    qc.invalidateQueries({ queryKey: ["admin-classes"] });
  };

  // ── Templates ────────────────────────────────────────────────
  const { data: templates = [] } = useQuery({
    queryKey: ["admin-class-templates"],
    queryFn: async () => {
      const { data } = await supabase.from("admin_class_templates" as any).select("*").order("created_at", { ascending: false });
      return (data || []) as any[];
    },
  });

  const saveTemplate = async () => {
    if (blocks.length === 0) return toast.error("Add exercises before saving as template");
    const name = window.prompt("Template name:", meta.title || `${meta.class_type} ${meta.duration_minutes}m`);
    if (!name) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("admin_class_templates" as any).insert({
      title: name,
      description: meta.description || null,
      duration_minutes: meta.duration_minutes,
      class_type: meta.class_type,
      payload: { meta, blocks },
      created_by: user?.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Template saved");
    qc.invalidateQueries({ queryKey: ["admin-class-templates"] });
  };

  const loadTemplate = (t: any) => {
    const p = t.payload || {};
    if (p.meta) setMeta((m) => ({ ...m, ...p.meta }));
    if (Array.isArray(p.blocks)) setBlocks(p.blocks.map((b: any) => ({
      ...newBlock(b.section || "workout_a", b.exercise_id, b.alt_exercise_id),
      ...b,
      section: (b.section as SectionId) || "workout_a",
      id: crypto.randomUUID(),
    })));
    setClassId(null);
    setShowTemplates(false);
    toast.success(`Loaded "${t.title}"`);
  };

  const deleteTemplate = async (id: string) => {
    if (!window.confirm("Delete this template?")) return;
    const { error } = await supabase.from("admin_class_templates" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-class-templates"] });
  };

  const exportClass = () => {
    const payload = {
      version: 2,
      exported_at: new Date().toISOString(),
      meta,
      blocks: orderedBlocks.map((b) => {
        const ex = b.exercise_id ? exById.get(b.exercise_id) : null;
        return {
          ...b,
          exercise: ex ? { id: ex.id, name: ex.name, mux_playback_id: ex.mux_playback_id, category: ex.category } : null,
        };
      }),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(meta.title || "class").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Class exported");
  };

  const aiGenerate = async () => {
    if (horizontalLib.length === 0) return toast.error("Add horizontal exercises to your library first");
    setAiLoading(true);
    const { data, error } = await supabase.functions.invoke("generate-ondemand-class", {
      body: {
        duration_minutes: meta.duration_minutes,
        class_type: meta.class_type,
        difficulty: meta.difficulty,
        equipment: meta.equipment,
        use_sections: true,
        exercises: horizontalLib.map((e) => ({
          id: e.id,
          name: e.name,
          category: e.category,
          muscle_group: e.muscle_group,
          equipment: e.equipment,
          difficulty: e.difficulty,
          movement_type: e.movement_type,
        })),
      },
    });
    setAiLoading(false);
    if (error) return toast.error(error.message);
    if (!data?.blocks || !Array.isArray(data.blocks)) return toast.error("AI returned no blocks");
    const VALID: SectionId[] = ["warmup", "workout_a", "workout_b", "workout_c", "cooldown"];
    const generated: Block[] = data.blocks
      .filter((b: any) => exById.has(b.exercise_id))
      .map((b: any) => {
        const ex = exById.get(b.exercise_id);
        const section: SectionId = VALID.includes(b.section) ? b.section : "workout_a";
        return {
          ...newBlock(section, b.exercise_id, ex?.alternative_exercise_id || null),
          work_seconds: Math.max(10, Math.min(120, Number(b.work_seconds) || 40)),
          rest_seconds: Math.max(0, Math.min(120, Number(b.rest_seconds) || 15)),
          sets: Math.max(1, Math.min(8, Number(b.sets) || 1)),
          set_rest_seconds: Math.max(0, Math.min(120, Number(b.set_rest_seconds) || 0)),
          cue_overrides: b.cue || "",
          weight_prompt: b.weight_prompt || "",
          tempo_prompt: b.tempo_prompt || "",
        };
      });
    if (generated.length === 0) return toast.error("AI returned no usable blocks");
    setBlocks(generated);
    if (!meta.title) setMeta((m) => ({ ...m, title: data.title || `${m.class_type} ${m.duration_minutes}m` }));
    toast.success(`AI generated ${generated.length} blocks across 5 sections`);
  };

  const sectionTone = (id: SectionId) =>
    id === "warmup" ? "border-amber-500/40 bg-amber-500/5"
    : id === "cooldown" ? "border-sky-500/40 bg-sky-500/5"
    : "border-primary/30 bg-primary/5";

  return (
    <div className="max-w-[1600px] mx-auto">
      <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="font-heading text-2xl tracking-wider">CLASS BUILDER</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Compose premium on-demand classes — Warm Up · 3 Workout Blocks · Cool Down.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowOpenList((s) => !s)}>
            <FolderOpen className="w-4 h-4" /> Open
          </Button>
          <Button variant="outline" onClick={() => setShowTemplates((s) => !s)}>
            <Bookmark className="w-4 h-4" /> Templates
          </Button>
          <Button variant="outline" onClick={newClass}>
            <Plus className="w-4 h-4" /> New
          </Button>
          <Button variant="outline" onClick={() => setMusicPrompting(true)} disabled={blocks.length === 0}>
            <Play className="w-4 h-4" /> Preview
          </Button>
          <Button variant="outline" onClick={saveTemplate} disabled={blocks.length === 0}>
            <Bookmark className="w-4 h-4" /> Save as Template
          </Button>
          <Button variant="outline" onClick={exportClass} disabled={blocks.length === 0}>
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button variant="outline" onClick={() => saveClass("draft")} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft
          </Button>
          <Button onClick={() => saveClass("published")} disabled={saving}>
            Publish
          </Button>
        </div>
      </div>

      {showTemplates && (
        <Card className="p-4 mb-4">
          <div className="text-sm font-medium mb-2">Class templates</div>
          {templates.length === 0 ? (
            <p className="text-xs text-muted-foreground">No templates saved yet. Click "Save as Template" to create one.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {templates.map((t: any) => (
                <div key={t.id} className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card/40">
                  <button onClick={() => loadTemplate(t)} className="flex-1 text-left min-w-0">
                    <div className="text-sm font-medium truncate">{t.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.duration_minutes}m · {t.class_type}
                    </div>
                  </button>
                  <button onClick={() => deleteTemplate(t.id)} className="p-1 hover:bg-muted rounded">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {showOpenList && (
        <Card className="p-4 mb-4">
          <div className="text-sm font-medium mb-2">Open existing class</div>
          {classes.length === 0 ? (
            <p className="text-xs text-muted-foreground">No classes saved yet.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {classes.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => loadClass(c.id)}
                  className="text-left p-3 rounded-lg border border-border hover:bg-muted transition-colors"
                >
                  <div className="text-sm font-medium truncate">{c.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.duration_minutes}m · {c.class_type} · {c.status}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      <MissingMuxReport />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-4">
        {/* LEFT: Library */}
        <Card className="p-3 lg:max-h-[calc(100vh-240px)] lg:overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Library</div>
            <button
              onClick={() => setCategoryFilter(meta.class_type as ExerciseCategory)}
              className="text-[10px] px-2 py-0.5 rounded-full border border-primary/40 text-primary hover:bg-primary/10"
              title={`Show only ${meta.class_type} videos`}
            >
              Match: {meta.class_type}
            </button>
          </div>

          {/* Target section selector */}
          <div className="mb-2 p-2 rounded-lg border border-primary/30 bg-primary/5">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Add to section</div>
            <select
              value={targetSection}
              onChange={(e) => setTargetSection(e.target.value as SectionId)}
              className="w-full bg-background border border-input rounded h-8 px-2 text-xs"
            >
              {SECTIONS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          <Input
            placeholder="Search exercises by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2"
          />
          <div className="flex flex-wrap gap-1 mb-3">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`text-[10px] px-2 py-1 rounded-full border transition ${
                categoryFilter === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              All ({horizontalLib.length})
            </button>
            {EXERCISE_CATEGORIES.map((c) => {
              const count = horizontalLib.filter((e) => e.category === c).length;
              return (
                <button
                  key={c}
                  onClick={() => setCategoryFilter(c)}
                  className={`text-[10px] px-2 py-1 rounded-full border transition capitalize ${
                    categoryFilter === c
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {c} ({count})
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-1 mb-3">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground self-center mr-1">Level:</span>
            {(["all", "beginner", "intermediate", "advanced"] as const).map((d) => {
              const count = d === "all" ? horizontalLib.length : horizontalLib.filter((e) => e.difficulty === d).length;
              return (
                <button
                  key={d}
                  onClick={() => setDifficultyFilter(d)}
                  className={`text-[10px] px-2 py-1 rounded-full border transition capitalize ${
                    difficultyFilter === d
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {d} ({count})
                </button>
              );
            })}
          </div>

          {(() => {
            const renderRow = (ex: AdminExercise) => (
              <button
                key={ex.id}
                onClick={() => addExercise(ex.id)}
                className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-muted text-left"
              >
                {ex.mux_playback_id && (
                  <img src={muxThumb(ex.mux_playback_id)} alt="" className="w-14 h-9 object-cover rounded" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate">{ex.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {ex.muscle_group || "—"} · {ex.difficulty}
                  </div>
                </div>
                <Plus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              </button>
            );

            return (
              <div className="space-y-1.5">
                {filteredLib.map(renderRow)}
                {filteredLib.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    No exercises match your filters.
                  </p>
                )}
              </div>
            );
          })()}
        </Card>

        {/* CENTER: Timeline by section */}
        <Card className="p-4 lg:max-h-[calc(100vh-240px)] lg:overflow-y-auto">
          {/* Summary header */}
          <div className="mb-4 p-3 rounded-lg border border-border bg-card/60">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Timeline</div>
            <div className="text-xs text-muted-foreground mb-3 leading-relaxed">
              {SECTIONS.map((s, i) => (
                <span key={s.id}>
                  {i > 0 && <span className="mx-1.5 text-muted-foreground/40">·</span>}
                  <span className="text-foreground/90">{s.label}</span>
                </span>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
              {SECTIONS.map((s) => {
                const secs = sectionSeconds(s.id);
                const delta = secs - s.targetSeconds;
                const status = secs === 0 ? "empty" : Math.abs(delta) <= 10 ? "ok" : delta > 0 ? "over" : "under";
                const color =
                  status === "ok" ? "text-emerald-400"
                  : status === "over" ? "text-amber-400"
                  : status === "under" ? "text-rose-400"
                  : "text-muted-foreground";
                return (
                  <div key={s.id} className="flex flex-col">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className={`font-mono font-medium ${color}`}>
                      {fmtMMSS(secs)} <span className="text-muted-foreground text-[10px]">/ {fmtMMSS(s.targetSeconds)}</span>
                      {status === "over" && <span className="ml-1 text-[10px]">▲</span>}
                      {status === "under" && <span className="ml-1 text-[10px]">▼</span>}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Total Class Time</span>
              <span className="font-mono font-semibold text-base">
                {fmtMMSS(totalSeconds)} <span className="text-muted-foreground text-xs font-normal">/ {meta.duration_minutes}:00</span>
              </span>
            </div>
          </div>

          {SECTIONS.map((sec) => {
            const items = sectionBlocks(sec.id);
            const isCollapsed = collapsed[sec.id];
            return (
              <div key={sec.id} className={`mb-3 rounded-lg border ${sectionTone(sec.id)}`}>
                <div className="flex items-center gap-2 p-2.5">
                  <button
                    onClick={() => setCollapsed((c) => ({ ...c, [sec.id]: !c[sec.id] }))}
                    className="p-0.5 hover:bg-muted rounded"
                  >
                    {isCollapsed
                      ? <ChevronRight className="w-4 h-4" />
                      : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <span className="text-sm font-semibold uppercase tracking-wide">{sec.label}</span>
                  <span className="text-[11px] text-muted-foreground">({items.length} ex · {fmtMMSS(sectionSeconds(sec.id))})</span>
                  <div className="flex-1" />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7"
                    onClick={() => {
                      setTargetSection(sec.id);
                      toast.info(`Adding to ${sec.label} — pick from the library`);
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </Button>
                </div>

                {!isCollapsed && (
                  <div className="px-2.5 pb-2.5 space-y-2">
                    {items.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-xs">
                        Empty. Set "Add to section" to {sec.label} and click an exercise on the left.
                      </div>
                    ) : items.map((b, i) => {
                      const ex = b.exercise_id ? exById.get(b.exercise_id) : null;
                      return (
                        <div key={b.id} className="border border-border rounded-lg p-3 bg-card/70">
                          <div className="flex items-center gap-2 mb-2">
                            <GripVertical className="w-4 h-4 text-muted-foreground" />
                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                              #{i + 1}
                            </span>
                            {ex?.mux_playback_id && (
                              <img src={muxThumb(ex.mux_playback_id)} alt="" className="w-12 h-7 object-cover rounded" />
                            )}
                            <span className="font-medium text-sm flex-1 truncate">{ex?.name || "Missing"}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">{fmtMMSS(blockSeconds(b))}</span>
                            <button onClick={() => moveBlockInSection(b.id, -1)} className="p-1 hover:bg-muted rounded">
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => moveBlockInSection(b.id, 1)} className="p-1 hover:bg-muted rounded">
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => removeBlock(b.id)} className="p-1 hover:bg-muted rounded">
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                            <label className="space-y-1">
                              <span className="text-muted-foreground">Work (s)</span>
                              <Input type="number" value={b.work_seconds}
                                onChange={(e) => updateBlock(b.id, { work_seconds: +e.target.value })} className="h-8" />
                            </label>
                            <label className="space-y-1">
                              <span className="text-muted-foreground">Rest (s)</span>
                              <Input type="number" value={b.rest_seconds}
                                onChange={(e) => updateBlock(b.id, { rest_seconds: +e.target.value })} className="h-8" />
                            </label>
                            <label className="space-y-1">
                              <span className="text-muted-foreground">Sets</span>
                              <Input type="number" value={b.sets}
                                onChange={(e) => updateBlock(b.id, { sets: +e.target.value })} className="h-8" />
                            </label>
                            <label className="space-y-1">
                              <span className="text-muted-foreground">Set Rest (s)</span>
                              <Input type="number" value={b.set_rest_seconds}
                                onChange={(e) => updateBlock(b.id, { set_rest_seconds: +e.target.value })} className="h-8" />
                            </label>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 text-xs">
                            <Input placeholder="Weight prompt" value={b.weight_prompt}
                              onChange={(e) => updateBlock(b.id, { weight_prompt: e.target.value })} className="h-8" />
                            <Input placeholder="Tempo (e.g. Slow 3-1-1)" value={b.tempo_prompt}
                              onChange={(e) => updateBlock(b.id, { tempo_prompt: e.target.value })} className="h-8" />
                          </div>
                          <Input placeholder="Cue override" value={b.cue_overrides}
                            onChange={(e) => updateBlock(b.id, { cue_overrides: e.target.value })}
                            className="h-8 mt-2 text-xs" />
                          <div className="flex items-center gap-3 mt-2 text-xs">
                            <label className="flex items-center gap-1.5">
                              <input type="checkbox" checked={b.drop_set}
                                onChange={(e) => updateBlock(b.id, { drop_set: e.target.checked })} />
                              Drop set
                            </label>
                            <select
                              value={b.alt_exercise_id || ""}
                              onChange={(e) => updateBlock(b.id, { alt_exercise_id: e.target.value || null })}
                              className="bg-background border border-input rounded h-7 px-2 text-xs flex-1"
                            >
                              <option value="">Alternate: none</option>
                              {horizontalLib.filter((x) => x.id !== b.exercise_id).map((x) => (
                                <option key={x.id} value={x.id}>Alt: {x.name}</option>
                              ))}
                            </select>
                            <select
                              value={b.section}
                              onChange={(e) => updateBlock(b.id, { section: e.target.value as SectionId })}
                              className="bg-background border border-input rounded h-7 px-2 text-xs"
                              title="Move to section"
                            >
                              {SECTIONS.map((s) => (
                                <option key={s.id} value={s.id}>{s.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </Card>

        {/* RIGHT: Settings */}
        <Card className="p-4 lg:max-h-[calc(100vh-240px)] lg:overflow-y-auto space-y-3">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Class Settings</div>
          <div>
            <Label>Title</Label>
            <Input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={2} value={meta.description}
              onChange={(e) => setMeta({ ...meta, description: e.target.value })} />
          </div>
          <div>
            <Label>Thumbnail</Label>
            {meta.thumbnail_url ? (
              <div className="relative mt-1">
                <img src={meta.thumbnail_url} alt="Class thumbnail" className="w-full h-32 object-cover rounded-md border border-border" />
                <button
                  type="button"
                  onClick={() => setMeta((p) => ({ ...p, thumbnail_url: "" }))}
                  className="absolute top-1 right-1 bg-black/70 text-white text-[10px] px-2 py-1 rounded"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="mt-1 flex items-center justify-center w-full h-24 rounded-md border border-dashed border-border cursor-pointer hover:bg-muted text-xs text-muted-foreground">
                {thumbUploading ? "Uploading…" : "Upload thumbnail (JPG/PNG, ≤5MB)"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) return toast.error("Max 5MB");
                    setThumbUploading(true);
                    const ext = file.name.split(".").pop() || "jpg";
                    const fileName = `class-${Date.now()}.${ext}`;
                    const { error } = await supabase.storage.from("thumbnails").upload(fileName, file, { contentType: file.type });
                    if (error) { setThumbUploading(false); return toast.error(error.message); }
                    const { data: urlData } = supabase.storage.from("thumbnails").getPublicUrl(fileName);
                    setMeta((p) => ({ ...p, thumbnail_url: urlData.publicUrl }));
                    setThumbUploading(false);
                  }}
                />
              </label>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Duration</Label>
              <select value={meta.duration_minutes}
                onChange={(e) => setMeta({ ...meta, duration_minutes: +e.target.value })}
                className="w-full bg-background border border-input rounded-md h-10 px-2 text-sm">
                {[15, 20, 30, 45].map((d) => (<option key={d} value={d}>{d} min</option>))}
              </select>
            </div>
            <div>
              <Label>Type</Label>
              <select value={meta.class_type}
                onChange={(e) => setMeta({ ...meta, class_type: e.target.value as any })}
                className="w-full bg-background border border-input rounded-md h-10 px-2 text-sm">
                {CLASS_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
              </select>
            </div>
            <div>
              <Label>Difficulty</Label>
              <select value={meta.difficulty}
                onChange={(e) => setMeta({ ...meta, difficulty: e.target.value as any })}
                className="w-full bg-background border border-input rounded-md h-10 px-2 text-sm">
                <option>beginner</option><option>intermediate</option><option>advanced</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={meta.intro_enabled}
                  onChange={(e) => setMeta({ ...meta, intro_enabled: e.target.checked })} />
                Apollo intro
              </label>
            </div>
          </div>
          <div>
            <Label>Equipment</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {EQUIPMENT_OPTIONS.map((eq) => {
                const on = meta.equipment.includes(eq);
                return (
                  <button key={eq} type="button"
                    onClick={() =>
                      setMeta((m) => ({
                        ...m,
                        equipment: on ? m.equipment.filter((x) => x !== eq) : [...m.equipment, eq],
                      }))
                    }
                    className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      on ? "bg-primary text-primary-foreground border-primary" : "border-border"
                    }`}>
                    {eq}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <Button onClick={aiGenerate} disabled={aiLoading} className="w-full" variant="apollo">
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              AI Generate Class
            </Button>
            <p className="text-[10px] text-muted-foreground mt-2">
              Builds Warm Up, Workout A/B/C, and Cool Down using your library — filtered by category, muscle group, difficulty, and equipment.
            </p>
          </div>

          <RenderMp4Panel classId={classId} hasBlocks={blocks.length > 0} />
        </Card>
      </div>

      <PreWorkoutMusicPrompt
        open={musicPrompting}
        onCancel={() => setMusicPrompting(false)}
        onReady={() => { setMusicPrompting(false); setPreviewing(true); }}
      />

      {previewing && (
        <OnDemandClassPlayer
          title={meta.title || "Apollo Class"}
          blocks={playerBlocks}
          introEnabled={meta.intro_enabled}
          adminEditable
          onClose={() => setPreviewing(false)}
        />

      )}
    </div>
  );
};

export default AdminClassBuilder;
