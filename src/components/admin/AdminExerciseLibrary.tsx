import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AdminExercise,
  EXERCISE_CATEGORIES,
  ExerciseCategory,
  muxThumb,
} from "./library/exerciseTypes";
import ExerciseEditorSheet from "./library/ExerciseEditorSheet";
import { Search, Pencil, Library, AlertCircle, Loader2 } from "lucide-react";

const AdminExerciseLibrary = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ExerciseCategory | "all" | "uncategorized">("all");
  const [editExercise, setEditExercise] = useState<AdminExercise | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ["admin-exercises"],
    queryFn: async () => {
      const { data, error } = await supabase.from("admin_exercises").select("*").order("name");
      if (error) throw error;
      return (data || []) as AdminExercise[];
    },
  });

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    return exercises.filter((e) => {
      if (s && !e.name.toLowerCase().includes(s)) return false;
      if (categoryFilter === "all") return true;
      if (categoryFilter === "uncategorized") return !e.category;
      return e.category === categoryFilter;
    });
  }, [exercises, search, categoryFilter]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of EXERCISE_CATEGORIES) map.set(c, 0);
    map.set("uncategorized", 0);
    for (const e of exercises) {
      if (!e.category) {
        map.set("uncategorized", (map.get("uncategorized") || 0) + 1);
      } else {
        map.set(e.category, (map.get(e.category) || 0) + 1);
      }
    }
    return map;
  }, [exercises]);

  const openEditor = (ex: AdminExercise) => {
    setEditExercise(ex);
    setEditorOpen(true);
  };

  const handleSaved = () => {
    qc.invalidateQueries({ queryKey: ["admin-exercises"] });
    toast.success("Exercise updated");
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl tracking-wider flex items-center gap-2">
            <Library className="w-6 h-6 text-primary" />
            EXERCISE LIBRARY
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse, search, and edit exercise categories. Click any card to change its category or details.
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          {exercises.length} total exercises
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setCategoryFilter("all")}
            className={`text-[10px] px-2.5 py-1.5 rounded-full border transition ${
              categoryFilter === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            All ({exercises.length})
          </button>
          {EXERCISE_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`text-[10px] px-2.5 py-1.5 rounded-full border transition capitalize ${
                categoryFilter === c
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {c} ({counts.get(c) || 0})
            </button>
          ))}
          <button
            onClick={() => setCategoryFilter("uncategorized")}
            className={`text-[10px] px-2.5 py-1.5 rounded-full border transition ${
              categoryFilter === "uncategorized"
                ? "bg-amber-500 text-white border-amber-500"
                : "border-border text-muted-foreground hover:border-amber-500/40"
            }`}
          >
            <AlertCircle className="w-3 h-3 inline mr-1" />
            Uncategorized ({counts.get("uncategorized") || 0})
          </button>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground text-sm">
          No exercises match your filter.
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map((ex) => (
            <button
              key={ex.id}
              onClick={() => openEditor(ex)}
              className="group text-left rounded-xl border border-border bg-card/50 hover:bg-card hover:border-primary/40 transition-all overflow-hidden"
              title="Click to edit"
            >
              <div className="relative aspect-[16/10] bg-black">
                {ex.mux_playback_id ? (
                  <img
                    src={muxThumb(ex.mux_playback_id)}
                    alt={ex.name}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground uppercase tracking-wider">
                    No Video
                  </div>
                )}
                <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Pencil className="w-3.5 h-3.5 text-white drop-shadow" />
                </div>
                {ex.orientation === "vertical" && (
                  <Badge variant="secondary" className="absolute bottom-1.5 left-1.5 text-[9px] h-4 px-1 bg-black/70 text-white border-0">
                    VERT
                  </Badge>
                )}
              </div>
              <div className="p-2.5">
                <div className="text-xs font-medium truncate leading-tight">{ex.name}</div>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {ex.category ? (
                    <Badge variant="outline" className="text-[9px] h-4 px-1 capitalize">
                      {ex.category}
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[9px] h-4 px-1">
                      Uncategorized
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground">{ex.muscle_group || "—"}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <ExerciseEditorSheet
        open={editorOpen}
        onOpenChange={setEditorOpen}
        exercise={editExercise}
        allExercises={exercises}
        onSaved={handleSaved}
      />
    </div>
  );
};

export default AdminExerciseLibrary;