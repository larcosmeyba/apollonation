import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dumbbell, Play, Copy, Plus, Sparkles, Trash2, ChevronLeft, Flame, Heart, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { ClassType, SlideExercise } from "./group-coaching/types";
import SlideshowPresenter from "./group-coaching/SlideshowPresenter";
import SlideshowEditor from "./group-coaching/SlideshowEditor";

const classIcons: Record<string, typeof Dumbbell> = { sculpt: Flame, strength: Dumbbell, stretch: Heart };

const AdminGroupCoaching = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [presenting, setPresenting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiClassType, setAiClassType] = useState<ClassType>("sculpt");
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [generating, setGenerating] = useState(false);
  const queryClient = useQueryClient();

  // Fetch all slideshows
  const { data: slideshows = [] } = useQuery({
    queryKey: ["group-coaching-slideshows"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_coaching_slideshows")
        .select("*")
        .order("is_template", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch slides for selected slideshow
  const { data: slides = [] } = useQuery({
    queryKey: ["slideshow-slides", selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      const { data, error } = await supabase
        .from("slideshow_slides")
        .select("*")
        .eq("slideshow_id", selectedId)
        .order("slide_number", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedId,
  });

  // Duplicate slideshow
  const duplicateMutation = useMutation({
    mutationFn: async (slideshowId: string) => {
      const source = slideshows.find((s) => s.id === slideshowId);
      if (!source) throw new Error("Not found");

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      // Create copy
      const { data: newShow, error: showErr } = await supabase
        .from("group_coaching_slideshows")
        .insert({
          title: `${source.title} (Copy)`,
          class_type: source.class_type,
          equipment: source.equipment,
          is_template: false,
          created_by: user.user.id,
        })
        .select()
        .single();
      if (showErr) throw showErr;

      // Copy slides
      const { data: sourceSlides } = await supabase
        .from("slideshow_slides")
        .select("*")
        .eq("slideshow_id", slideshowId)
        .order("slide_number");

      if (sourceSlides && sourceSlides.length > 0) {
        const newSlides = sourceSlides.map(({ id, slideshow_id, created_at, ...rest }) => ({
          ...rest,
          slideshow_id: newShow.id,
        }));
        await supabase.from("slideshow_slides").insert(newSlides);
      }

      return newShow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-coaching-slideshows"] });
      toast.success("Slideshow duplicated!");
    },
    onError: () => toast.error("Failed to duplicate"),
  });

  // Delete slideshow
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("group_coaching_slideshows").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-coaching-slideshows"] });
      toast.success("Slideshow deleted");
    },
  });

  // AI Generate
  const handleAiGenerate = async () => {
    setGenerating(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("generate-slideshow", {
        body: { prompt: aiPrompt || `Create an awesome ${aiClassType} class`, classType: aiClassType },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Save to DB
      const { data: newShow, error: showErr } = await supabase
        .from("group_coaching_slideshows")
        .insert({
          title: data.title || `AI ${aiClassType} Class`,
          class_type: aiClassType,
          equipment: data.equipment || [],
          is_template: false,
          created_by: user.user.id,
        })
        .select()
        .single();
      if (showErr) throw showErr;

      if (data.exercises?.length) {
        const newSlides = data.exercises.map((ex: any, i: number) => ({
          slideshow_id: newShow.id,
          slide_number: i + 1,
          slide_type: "exercise",
          exercise_name: ex.exercise_name,
          sets: ex.sets,
          reps: ex.reps,
          rest_seconds: ex.rest_seconds,
          coaching_cue: ex.coaching_cue,
        }));
        await supabase.from("slideshow_slides").insert(newSlides);
      }

      queryClient.invalidateQueries({ queryKey: ["group-coaching-slideshows"] });
      setShowAiPanel(false);
      setAiPrompt("");
      toast.success("AI slideshow created!");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate slideshow");
    } finally {
      setGenerating(false);
    }
  };

  // Convert slides to exercise format for presenter
  const exercisesForPresenter: SlideExercise[] = slides
    .filter((s) => s.slide_type === "exercise")
    .map((s) => ({
      name: s.exercise_name || "Exercise",
      thumbnail_url: s.thumbnail_url,
      video_url: s.video_url,
      sets: s.sets,
      reps: s.reps,
      rest_seconds: s.rest_seconds,
      notes: s.coaching_cue || s.notes,
    }));

  // Group exercises into blocks
  const blocksForPresenter = (() => {
    const exerciseSlides = slides.filter((s) => s.slide_type === "exercise");
    const blockMap = new Map<string, SlideExercise[]>();
    exerciseSlides.forEach((s) => {
      const label = s.block_label || "Block 1";
      if (!blockMap.has(label)) blockMap.set(label, []);
      blockMap.get(label)!.push({
        name: s.exercise_name || "Exercise",
        thumbnail_url: s.thumbnail_url,
        video_url: s.video_url,
        sets: s.sets,
        reps: s.reps,
        rest_seconds: s.rest_seconds,
        notes: s.coaching_cue || s.notes,
      });
    });
    return Array.from(blockMap.entries()).map(([label, exercises]) => ({ label, exercises }));
  })();

  const selected = slideshows.find((s) => s.id === selectedId);

  // Presenting mode
  if (presenting && selected) {
    return (
      <SlideshowPresenter
        classType={selected.class_type as ClassType}
        exercises={exercisesForPresenter}
        blocks={blocksForPresenter}
        initialEquipment={selected.equipment || []}
        onExit={() => setPresenting(false)}
      />
    );
  }

  // Editing mode
  if (editing && selectedId && selected) {
    return (
      <SlideshowEditor
        slideshowId={selectedId}
        slideshow={selected}
        slides={slides}
        onBack={() => {
          setEditing(false);
          queryClient.invalidateQueries({ queryKey: ["slideshow-slides", selectedId] });
          queryClient.invalidateQueries({ queryKey: ["group-coaching-slideshows"] });
        }}
      />
    );
  }

  // Selected slideshow preview
  if (selectedId && selected) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="w-4 h-4 mr-1" /> Edit
            </Button>
            <Button onClick={() => setPresenting(true)} className="bg-foreground text-background hover:opacity-90">
              <Play className="w-4 h-4 mr-2" /> Present
            </Button>
          </div>
        </div>

        <div className="text-center space-y-1">
          <p className="text-xs tracking-[0.3em] text-muted-foreground uppercase">
            {selected.class_type} · {slides.filter((s) => s.slide_type === "exercise").length} exercises
          </p>
          <h2 className="font-heading text-xl tracking-wider text-foreground">{selected.title}</h2>
          {(selected.equipment as string[])?.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-3">
              {(selected.equipment as string[]).map((e) => (
                <span key={e} className="px-3 py-1 text-xs rounded-full border border-border bg-card text-muted-foreground">
                  {e}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {slides.filter((s) => s.slide_type === "exercise").map((s, i) => (
            <Card key={s.id} className="bg-card border-border rounded-xl">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{s.exercise_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[s.sets && `${s.sets} sets`, s.reps && `${s.reps} reps`, s.rest_seconds && `${s.rest_seconds}s rest`].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
                {s.coaching_cue && (
                  <p className="text-xs text-muted-foreground italic pl-11">"{s.coaching_cue}"</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Main gallery
  const templates = slideshows.filter((s) => s.is_template);
  const custom = slideshows.filter((s) => !s.is_template);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl tracking-wider text-foreground">GROUP COACHING</h1>
          <p className="text-sm text-muted-foreground mt-1">Create and present workout slideshows for group classes</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowAiPanel(true)}>
          <Sparkles className="w-4 h-4 mr-1" /> AI Generate
        </Button>
      </div>

      {/* AI Generate Panel */}
      {showAiPanel && (
        <Card className="bg-card border-border">
          <CardContent className="p-6 space-y-4">
            <h3 className="font-heading text-sm tracking-wider text-foreground">GENERATE WITH AI</h3>
            <div className="flex gap-2">
              {(["sculpt", "strength", "stretch"] as ClassType[]).map((ct) => {
                const Icon = classIcons[ct];
                return (
                  <button
                    key={ct}
                    onClick={() => setAiClassType(ct)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors ${
                      aiClassType === ct ? "border-foreground/40 bg-muted text-foreground" : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {ct.charAt(0).toUpperCase() + ct.slice(1)}
                  </button>
                );
              })}
            </div>
            <Input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g. Upper body sculpt, 45 min, focus on shoulders and arms..."
              className="text-sm"
            />
            <div className="flex items-center gap-2">
              <Button onClick={handleAiGenerate} disabled={generating} className="bg-foreground text-background hover:opacity-90">
                <Sparkles className="w-4 h-4 mr-1" />
                {generating ? "Generating..." : "Generate Slideshow"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowAiPanel(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Templates */}
      {templates.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Templates</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {templates.map((t) => {
              const Icon = classIcons[t.class_type] || Dumbbell;
              return (
                <Card key={t.id} className="bg-card border-border rounded-xl overflow-hidden group">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Icon className="w-5 h-5 text-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{t.class_type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => setSelectedId(t.id)}>
                        <Play className="w-3 h-3 mr-1" /> Preview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => duplicateMutation.mutate(t.id)}
                        disabled={duplicateMutation.isPending}
                      >
                        <Copy className="w-3 h-3 mr-1" /> Duplicate
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* My Slideshows */}
      <div className="space-y-3">
        <h2 className="text-xs tracking-[0.2em] text-muted-foreground uppercase">My Slideshows</h2>
        {custom.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {custom.map((s) => {
              const Icon = classIcons[s.class_type] || Dumbbell;
              return (
                <Card key={s.id} className="bg-card border-border rounded-xl overflow-hidden">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Icon className="w-5 h-5 text-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{s.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{s.class_type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => setSelectedId(s.id)}>
                        <Play className="w-3 h-3 mr-1" /> Open
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive h-9 w-9"
                        onClick={() => {
                          if (confirm("Delete this slideshow?")) deleteMutation.mutate(s.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Plus className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No custom slideshows yet. Duplicate a template or generate one with AI.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminGroupCoaching;
