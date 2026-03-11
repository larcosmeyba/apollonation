import { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus, Trash2, GripVertical, Play, Upload, Music, Clock,
  Timer, Film, Loader2, ChevronUp, ChevronDown, Eye, Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  WorkoutProject, WorkoutBlock, ExerciseClip, MusicTrack,
  TEMPLATES, MUSIC_LIBRARY,
} from "./types";
import WorkoutPreview from "./WorkoutPreview";
import { useWorkoutDownload } from "./useWorkoutDownload";
import { Progress } from "@/components/ui/progress";

const OnDemandEditor = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState("build");

  // Project state
  const [project, setProject] = useState<WorkoutProject>({
    title: "",
    coachedBy: "Coach Marcos",
    templateMinutes: 15,
    blocks: [],
    musicTrack: null,
    introEnabled: true,
    introDurationSeconds: 5,
  });

  // Uploaded clips library
  const [clips, setClips] = useState<ExerciseClip[]>([]);

  // Fetch exercises from library for reference
  const { data: exercises } = useQuery({
    queryKey: ["admin-exercises-for-editor"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises")
        .select("id, title, video_url, thumbnail_url")
        .not("video_url", "is", null)
        .order("title");
      if (error) throw error;
      return data;
    },
  });

  // Upload a clip
  const handleClipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 50MB per clip", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `clip-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("exercise-videos")
      .upload(fileName, file, { contentType: file.type });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("exercise-videos").getPublicUrl(fileName);
    const clipName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    const newClip: ExerciseClip = {
      id: crypto.randomUUID(),
      name: clipName,
      videoUrl: urlData.publicUrl,
      durationSeconds: 12,
    };
    setClips((prev) => [...prev, newClip]);
    setUploading(false);
    toast({ title: "Clip uploaded!" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Add exercise from library
  const addExerciseFromLibrary = (ex: { id: string; title: string; video_url: string | null; thumbnail_url: string | null }) => {
    if (!ex.video_url) return;
    const clip: ExerciseClip = {
      id: ex.id,
      name: ex.title,
      videoUrl: ex.video_url,
      thumbnailUrl: ex.thumbnail_url ?? undefined,
      durationSeconds: 12,
    };
    if (!clips.find((c) => c.id === clip.id)) {
      setClips((prev) => [...prev, clip]);
    }
  };

  // Apply template
  const applyTemplate = (templateIdx: number) => {
    const t = TEMPLATES[templateIdx];
    setProject((prev) => ({
      ...prev,
      templateMinutes: t.minutes,
      blocks: [], // Clear blocks — user fills in exercises
    }));
    toast({ title: `${t.label} template applied`, description: `${t.rounds} blocks — add exercises below` });
  };

  // Add a block
  const addBlock = (type: "exercise" | "rest", clip?: ExerciseClip) => {
    const block: WorkoutBlock = {
      id: crypto.randomUUID(),
      type,
      exerciseClip: clip,
      durationSeconds: type === "exercise" ? 40 : 15,
      label: type === "rest" ? "Rest" : clip?.name || "Exercise",
    };
    setProject((prev) => ({ ...prev, blocks: [...prev.blocks, block] }));
  };

  // Remove block
  const removeBlock = (id: string) => {
    setProject((prev) => ({ ...prev, blocks: prev.blocks.filter((b) => b.id !== id) }));
  };

  // Move block
  const moveBlock = (idx: number, direction: -1 | 1) => {
    setProject((prev) => {
      const blocks = [...prev.blocks];
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= blocks.length) return prev;
      [blocks[idx], blocks[newIdx]] = [blocks[newIdx], blocks[idx]];
      return { ...prev, blocks };
    });
  };

  // Update block duration
  const updateBlockDuration = (id: string, seconds: number) => {
    setProject((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === id ? { ...b, durationSeconds: seconds } : b)),
    }));
  };

  // Update block label
  const updateBlockLabel = (id: string, label: string) => {
    setProject((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === id ? { ...b, label } : b)),
    }));
  };

  // Total duration
  const totalSeconds = project.blocks.reduce((s, b) => s + b.durationSeconds, 0) + (project.introEnabled ? project.introDurationSeconds : 0);
  const totalMin = Math.floor(totalSeconds / 60);
  const totalSec = totalSeconds % 60;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="font-heading text-xl">On-Demand Video Builder</h2>
          <p className="text-sm text-muted-foreground">Assemble workout videos from exercise clips</p>
        </div>
        <Button variant="apollo" onClick={() => setShowPreview(!showPreview)}>
          <Eye className="w-4 h-4 mr-2" />
          {showPreview ? "Hide Preview" : "Preview Workout"}
        </Button>
      </div>

      {/* Preview */}
      {showPreview && (
        <div className="mb-6">
          <WorkoutPreview project={project} />
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="build"><Film className="w-3.5 h-3.5 mr-1.5" />Build</TabsTrigger>
          <TabsTrigger value="clips"><Upload className="w-3.5 h-3.5 mr-1.5" />Clips</TabsTrigger>
          <TabsTrigger value="music"><Music className="w-3.5 h-3.5 mr-1.5" />Music</TabsTrigger>
          <TabsTrigger value="templates"><Clock className="w-3.5 h-3.5 mr-1.5" />Templates</TabsTrigger>
        </TabsList>

        {/* ─── BUILD TAB ─── */}
        <TabsContent value="build" className="space-y-5 mt-4">
          {/* Project settings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>Workout Title</Label>
              <Input
                value={project.title}
                onChange={(e) => setProject((p) => ({ ...p, title: e.target.value }))}
                placeholder="Full Body Burn"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Coached By</Label>
              <Input
                value={project.coachedBy}
                onChange={(e) => setProject((p) => ({ ...p, coachedBy: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Intro Duration (sec)</Label>
              <Input
                type="number"
                value={project.introDurationSeconds}
                onChange={(e) => setProject((p) => ({ ...p, introDurationSeconds: parseInt(e.target.value) || 5 }))}
                min={3}
                max={15}
                className="mt-1"
              />
            </div>
          </div>

          {/* Duration summary */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Timer className="w-4 h-4" />
              <span>Total: <span className="text-foreground font-medium">{totalMin}:{totalSec.toString().padStart(2, "0")}</span></span>
            </div>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{project.blocks.length} blocks</span>
            {project.musicTrack && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">♪ {project.musicTrack.title}</span>
              </>
            )}
          </div>

          {/* Add buttons */}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => addBlock("rest")}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Rest
            </Button>
            {clips.length > 0 && (
              <Select onValueChange={(clipId) => {
                const clip = clips.find((c) => c.id === clipId);
                if (clip) addBlock("exercise", clip);
              }}>
                <SelectTrigger className="w-[200px] h-9 text-sm">
                  <SelectValue placeholder="+ Add exercise clip" />
                </SelectTrigger>
                <SelectContent>
                  {clips.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {clips.length === 0 && (
              <p className="text-xs text-muted-foreground self-center ml-2">
                Upload clips in the Clips tab first →
              </p>
            )}
          </div>

          {/* Block list */}
          <div className="space-y-2">
            {project.blocks.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center text-muted-foreground text-sm">
                  <Film className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No blocks yet — use a template or add exercises manually
                </CardContent>
              </Card>
            )}
            {project.blocks.map((block, i) => (
              <div
                key={block.id}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
                  block.type === "rest" ? "bg-muted/50 border-border" : "bg-card border-border"
                }`}
              >
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveBlock(i, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-20">
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => moveBlock(i, 1)} disabled={i === project.blocks.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-20">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="w-6 text-center text-xs text-muted-foreground font-mono">{i + 1}</div>

                {block.type === "exercise" && block.exerciseClip?.thumbnailUrl && (
                  <img src={block.exerciseClip.thumbnailUrl} alt="" className="w-12 h-8 object-cover rounded" />
                )}
                {block.type === "exercise" && !block.exerciseClip?.thumbnailUrl && (
                  <div className="w-12 h-8 bg-muted rounded flex items-center justify-center">
                    <Play className="w-3 h-3 text-muted-foreground" />
                  </div>
                )}
                {block.type === "rest" && (
                  <div className="w-12 h-8 bg-apollo-gold/10 rounded flex items-center justify-center">
                    <Timer className="w-3 h-3 text-apollo-gold" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <Input
                    value={block.label || ""}
                    onChange={(e) => updateBlockLabel(block.id, e.target.value)}
                    className="h-7 text-sm border-0 bg-transparent px-0 focus-visible:ring-0"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    value={block.durationSeconds}
                    onChange={(e) => updateBlockDuration(block.id, parseInt(e.target.value) || 10)}
                    min={5}
                    max={300}
                    className="w-16 h-7 text-xs text-center"
                  />
                  <span className="text-[10px] text-muted-foreground">sec</span>
                </div>

                <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => removeBlock(block.id)}>
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ─── CLIPS TAB ─── */}
        <TabsContent value="clips" className="space-y-5 mt-4">
          <div>
            <h3 className="font-medium text-sm mb-3">Upload Exercise Clips</h3>
            <p className="text-xs text-muted-foreground mb-3">Upload short 10–15 second clips. They will loop seamlessly during the workout.</p>
            <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleClipUpload} />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="border-dashed w-full sm:w-auto">
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              {uploading ? "Uploading…" : "Upload Clip"}
            </Button>
          </div>

          {/* Uploaded clips */}
          {clips.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {clips.map((clip) => (
                <Card key={clip.id} className="overflow-hidden group">
                  <div className="aspect-video bg-muted relative">
                    <video src={clip.videoUrl} className="w-full h-full object-cover" muted preload="metadata" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => addBlock("exercise", clip)}>
                        <Plus className="w-3 h-3 mr-1" /> Add
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-2">
                    <p className="text-xs font-medium truncate">{clip.name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Exercise library */}
          {exercises && exercises.length > 0 && (
            <div>
              <h3 className="font-medium text-sm mb-3 mt-6">From Exercise Library</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {exercises.slice(0, 12).map((ex) => (
                  <Card key={ex.id} className="overflow-hidden group cursor-pointer" onClick={() => addExerciseFromLibrary(ex)}>
                    <div className="aspect-video bg-muted relative">
                      {ex.thumbnail_url ? (
                        <img src={ex.thumbnail_url} alt={ex.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="w-6 h-6 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-2">
                      <p className="text-xs font-medium truncate">{ex.title}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ─── MUSIC TAB ─── */}
        <TabsContent value="music" className="space-y-4 mt-4">
          <p className="text-xs text-muted-foreground">
            All tracks are royalty-free — safe for YouTube, Instagram, and social media.
          </p>
          <div className="space-y-2">
            {MUSIC_LIBRARY.map((track) => {
              const isSelected = project.musicTrack?.id === track.id;
              return (
                <div
                  key={track.id}
                  onClick={() => setProject((p) => ({ ...p, musicTrack: isSelected ? null : track }))}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    isSelected ? "border-apollo-gold bg-apollo-gold/5" : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isSelected ? "bg-apollo-gold/20" : "bg-muted"
                  }`}>
                    <Music className={`w-4 h-4 ${isSelected ? "text-apollo-gold" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{track.title}</p>
                    <p className="text-xs text-muted-foreground">{track.genre} • {track.artist}</p>
                  </div>
                  {isSelected && (
                    <span className="text-xs text-apollo-gold font-medium">Selected</span>
                  )}
                </div>
              );
            })}
          </div>
          {project.musicTrack && (
            <div className="mt-3">
              <Label className="text-xs text-muted-foreground">Preview</Label>
              <audio controls src={project.musicTrack.url} className="w-full mt-1 h-8" />
            </div>
          )}
        </TabsContent>

        {/* ─── TEMPLATES TAB ─── */}
        <TabsContent value="templates" className="space-y-4 mt-4">
          <p className="text-xs text-muted-foreground">
            Start with a preset template, then customize exercises and timing.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {TEMPLATES.map((t, i) => (
              <Card
                key={i}
                className="cursor-pointer hover:border-apollo-gold/50 transition-colors"
                onClick={() => applyTemplate(i)}
              >
                <CardContent className="p-5 text-center">
                  <div className="w-14 h-14 mx-auto rounded-full bg-apollo-gold/10 flex items-center justify-center mb-3">
                    <Clock className="w-6 h-6 text-apollo-gold" />
                  </div>
                  <h3 className="font-heading text-base">{t.label}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t.exerciseSec}s work / {t.restSec}s rest
                  </p>
                  <p className="text-xs text-muted-foreground">~{t.rounds} blocks</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OnDemandEditor;
