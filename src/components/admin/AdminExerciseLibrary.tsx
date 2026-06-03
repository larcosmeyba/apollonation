import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Search, Loader2, Pencil, Trash2, ExternalLink, Video, VideoOff } from "lucide-react";
import { AdminExercise, muxThumb } from "./library/exerciseTypes";
import ExerciseEditorSheet from "./library/ExerciseEditorSheet";
import { toast } from "sonner";

type LegacyExercise = {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  muscle_group: string | null;
  equipment: string | null;
  difficulty: string | null;
};

const AdminExerciseLibrary = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterOrient, setFilterOrient] = useState<"all" | "horizontal" | "vertical">("all");
  const [filterMuscle, setFilterMuscle] = useState<string>("all");
  const [filterBodyPart, setFilterBodyPart] = useState<string>("all");
  const [editing, setEditing] = useState<AdminExercise | null>(null);
  const [open, setOpen] = useState(false);

  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ["admin-exercises"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_exercises")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as AdminExercise[];
    },
  });

  const filtered = exercises.filter((e) => {
    if (filterOrient !== "all" && e.orientation !== filterOrient) return false;
    if (filterMuscle !== "all" && e.muscle_group !== filterMuscle) return false;
    if (filterBodyPart !== "all" && (e.body_part || "").toLowerCase() !== filterBodyPart.toLowerCase()) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!e.name.toLowerCase().includes(q) && !(e.body_part || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const muscles = Array.from(new Set(exercises.map((e) => e.muscle_group).filter(Boolean))) as string[];
  const bodyParts = Array.from(new Set(exercises.map((e) => e.body_part).filter(Boolean))) as string[];

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this exercise?")) return;
    const { error } = await supabase.from("admin_exercises").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin-exercises"] });
    }
  };

  // Legacy exercises (existing library you've already populated)
  const { data: legacy = [], isLoading: legacyLoading } = useQuery({
    queryKey: ["legacy-exercises"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises")
        .select("id,title,description,video_url,thumbnail_url,muscle_group,equipment,difficulty")
        .order("title", { ascending: true });
      if (error) throw error;
      return (data || []) as LegacyExercise[];
    },
  });

  const [legacySearch, setLegacySearch] = useState("");
  const [legacyVideoFilter, setLegacyVideoFilter] = useState<"all" | "with" | "without">("all");
  const filteredLegacy = legacy.filter((e) => {
    if (legacyVideoFilter === "with" && !e.video_url) return false;
    if (legacyVideoFilter === "without" && e.video_url) return false;
    if (legacySearch && !e.title.toLowerCase().includes(legacySearch.toLowerCase())) return false;
    return true;
  });
  const legacyWithVideo = legacy.filter((e) => e.video_url).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl tracking-wider">EXERCISE LIBRARY</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Premium MUX demos power the class builder. Use the Legacy tab to see exercises already saved with older video links.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="w-4 h-4" /> Add Exercise
        </Button>
      </div>

      <Tabs defaultValue="premium" className="space-y-4">
        <TabsList>
          <TabsTrigger value="premium">
            Premium (MUX) <Badge variant="secondary" className="ml-2">{exercises.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="legacy">
            Legacy Library <Badge variant="secondary" className="ml-2">{legacy.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="premium" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search exercises..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={filterOrient}
              onChange={(e) => setFilterOrient(e.target.value as any)}
              className="bg-card border border-border rounded-md px-3 h-10 text-sm"
            >
              <option value="all">All orientations</option>
              <option value="horizontal">Horizontal</option>
              <option value="vertical">Vertical</option>
            </select>
            <select
              value={filterMuscle}
              onChange={(e) => setFilterMuscle(e.target.value)}
              className="bg-card border border-border rounded-md px-3 h-10 text-sm"
            >
              <option value="all">All muscles</option>
              {muscles.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground ml-auto">
              {filtered.length} of {exercises.length}
            </span>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground mb-4">No premium exercises yet.</p>
              <Button
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
                variant="outline"
              >
                <Plus className="w-4 h-4" /> Add your first exercise
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((ex) => (
                <Card key={ex.id} className="overflow-hidden group">
                  <div className="aspect-video bg-muted relative overflow-hidden">
                    {ex.mux_playback_id ? (
                      <img
                        src={muxThumb(ex.mux_playback_id)}
                        alt={ex.name}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                        No video
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        {ex.orientation}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-sm line-clamp-1">{ex.name}</h3>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setEditing(ex);
                            setOpen(true);
                          }}
                          className="p-1 hover:bg-muted rounded"
                        >
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => handleDelete(ex.id)}
                          className="p-1 hover:bg-muted rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {ex.muscle_group && (
                        <Badge variant="outline" className="text-[10px]">
                          {ex.muscle_group}
                        </Badge>
                      )}
                      {ex.difficulty && (
                        <Badge variant="outline" className="text-[10px]">
                          {ex.difficulty}
                        </Badge>
                      )}
                      {ex.equipment?.slice(0, 2).map((eq) => (
                        <Badge key={eq} variant="outline" className="text-[10px]">
                          {eq}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="legacy" className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search legacy exercises..."
                value={legacySearch}
                onChange={(e) => setLegacySearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={legacyVideoFilter}
              onChange={(e) => setLegacyVideoFilter(e.target.value as any)}
              className="bg-card border border-border rounded-md px-3 h-10 text-sm"
            >
              <option value="all">All ({legacy.length})</option>
              <option value="with">With video ({legacyWithVideo})</option>
              <option value="without">Missing video ({legacy.length - legacyWithVideo})</option>
            </select>
            <span className="text-xs text-muted-foreground ml-auto">
              {filteredLegacy.length} shown
            </span>
          </div>

          {legacyLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin" />
            </div>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="text-left px-4 py-2 w-10">Video</th>
                      <th className="text-left px-4 py-2">Name</th>
                      <th className="text-left px-4 py-2">Muscle</th>
                      <th className="text-left px-4 py-2">Equipment</th>
                      <th className="text-left px-4 py-2">Difficulty</th>
                      <th className="text-left px-4 py-2">Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLegacy.map((ex) => (
                      <tr key={ex.id} className="border-t border-border hover:bg-muted/30">
                        <td className="px-4 py-2">
                          {ex.video_url ? (
                            <Video className="w-4 h-4 text-primary" />
                          ) : (
                            <VideoOff className="w-4 h-4 text-muted-foreground/50" />
                          )}
                        </td>
                        <td className="px-4 py-2 font-medium">{ex.title}</td>
                        <td className="px-4 py-2 text-muted-foreground">{ex.muscle_group || "—"}</td>
                        <td className="px-4 py-2 text-muted-foreground">{ex.equipment || "—"}</td>
                        <td className="px-4 py-2 text-muted-foreground">{ex.difficulty || "—"}</td>
                        <td className="px-4 py-2">
                          {ex.video_url ? (
                            <a
                              href={ex.video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
                            >
                              Open <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">No video</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <ExerciseEditorSheet
        open={open}
        onOpenChange={setOpen}
        exercise={editing}
        allExercises={exercises}
        onSaved={() => qc.invalidateQueries({ queryKey: ["admin-exercises"] })}
      />
    </div>
  );
};

export default AdminExerciseLibrary;
