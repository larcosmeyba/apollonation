import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format, formatDistanceToNow } from "date-fns";
import { Camera, Footprints, Dumbbell, Flame, Watch } from "lucide-react";

interface Props {
  userId: string;
}

interface SessionLog {
  id: string;
  day_id: string;
  log_date: string;
  completed_at: string | null;
  notes: string | null;
}

interface SetLog {
  id: string;
  training_plan_exercise_id: string;
  set_number: number;
  weight: number | null;
  reps_completed: number | null;
  log_date: string;
}

interface MacroLog {
  id: string;
  log_date: string;
  meal_name: string | null;
  calories: number | null;
  protein_grams: number | null;
  carbs_grams: number | null;
  fat_grams: number | null;
  photo_url: string | null;
  notes: string | null;
  ai_estimated: boolean | null;
  created_at: string;
}

interface StepLog {
  id: string;
  log_date: string;
  steps: number;
  created_at: string;
}

const ClientActivityLogs = ({ userId }: Props) => {
  const [activityTab, setActivityTab] = useState("workouts");
  const [detailDayId, setDetailDayId] = useState<string | null>(null);
  const [detailDate, setDetailDate] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // ── Workout session logs ──
  const { data: sessions, isLoading: loadingSessions } = useQuery({
    queryKey: ["admin-client-sessions", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_session_logs")
        .select("*")
        .eq("user_id", userId)
        .order("log_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as SessionLog[];
    },
  });

  const dayIds = sessions?.map(s => s.day_id) || [];
  const { data: dayLabels } = useQuery({
    queryKey: ["admin-day-labels", dayIds],
    queryFn: async () => {
      if (dayIds.length === 0) return {};
      const { data, error } = await supabase
        .from("training_plan_days")
        .select("id, day_label, day_number, focus")
        .in("id", dayIds);
      if (error) throw error;
      const map: Record<string, { label: string; focus: string | null }> = {};
      data.forEach(d => { map[d.id] = { label: d.day_label || `Day ${d.day_number}`, focus: d.focus }; });
      return map;
    },
    enabled: dayIds.length > 0,
  });

  const { data: setLogs, isLoading: loadingSets } = useQuery({
    queryKey: ["admin-client-set-logs", userId, detailDayId, detailDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercise_set_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("day_id", detailDayId!)
        .eq("log_date", detailDate!)
        .order("training_plan_exercise_id")
        .order("set_number");
      if (error) throw error;
      return data as SetLog[];
    },
    enabled: !!detailDayId && !!detailDate,
  });

  const exerciseIds = [...new Set(setLogs?.map(s => s.training_plan_exercise_id) || [])];
  const { data: exerciseNames } = useQuery({
    queryKey: ["admin-exercise-names", exerciseIds],
    queryFn: async () => {
      if (exerciseIds.length === 0) return {};
      const { data, error } = await supabase
        .from("training_plan_exercises")
        .select("id, exercise_name")
        .in("id", exerciseIds);
      if (error) throw error;
      const map: Record<string, string> = {};
      data.forEach(e => { map[e.id] = e.exercise_name; });
      return map;
    },
    enabled: exerciseIds.length > 0,
  });

  const groupedSets = setLogs?.reduce((acc, log) => {
    const name = exerciseNames?.[log.training_plan_exercise_id] || "Unknown";
    if (!acc[name]) acc[name] = [];
    acc[name].push(log);
    return acc;
  }, {} as Record<string, SetLog[]>) || {};

  // ── Food / Macro Logs ──
  const { data: macroLogs, isLoading: loadingMacros } = useQuery({
    queryKey: ["admin-client-macros", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("macro_logs")
        .select("*")
        .eq("user_id", userId)
        .order("log_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as MacroLog[];
    },
  });

  // ── Step Logs ──
  const { data: stepLogs, isLoading: loadingSteps } = useQuery({
    queryKey: ["admin-client-steps", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("step_logs")
        .select("*")
        .eq("user_id", userId)
        .order("log_date", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data as StepLog[];
    },
  });

  // ── Daily calorie summary (grouped from macro logs) ──
  const dailyCalories = macroLogs?.reduce((acc, log) => {
    const date = log.log_date;
    if (!acc[date]) acc[date] = { calories: 0, protein: 0, carbs: 0, fat: 0, meals: 0 };
    acc[date].calories += log.calories || 0;
    acc[date].protein += log.protein_grams || 0;
    acc[date].carbs += log.carbs_grams || 0;
    acc[date].fat += log.fat_grams || 0;
    acc[date].meals += 1;
    return acc;
  }, {} as Record<string, { calories: number; protein: number; carbs: number; fat: number; meals: number }>) || {};

  const handlePhotoClick = async (photoUrl: string) => {
    // Photo URL could be a storage path
    if (photoUrl.startsWith("http")) {
      setPhotoPreview(photoUrl);
    } else {
      const { data } = await supabase.storage.from("food-photos").createSignedUrl(photoUrl, 300);
      setPhotoPreview(data?.signedUrl || null);
    }
  };

  return (
    <div className="space-y-4">
      <Tabs value={activityTab} onValueChange={setActivityTab}>
        <TabsList>
          <TabsTrigger value="workouts" className="gap-1.5"><Dumbbell className="w-3.5 h-3.5" /> Workouts</TabsTrigger>
          <TabsTrigger value="food" className="gap-1.5"><Camera className="w-3.5 h-3.5" /> Food Logs</TabsTrigger>
          <TabsTrigger value="calories" className="gap-1.5"><Flame className="w-3.5 h-3.5" /> Daily Calories</TabsTrigger>
          <TabsTrigger value="steps" className="gap-1.5"><Footprints className="w-3.5 h-3.5" /> Steps</TabsTrigger>
        </TabsList>

        {/* ── WORKOUTS ── */}
        <TabsContent value="workouts">
          <div className="card-apollo overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Workout</TableHead>
                  <TableHead>Focus</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingSessions ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : sessions?.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No workout sessions logged yet.</TableCell></TableRow>
                ) : sessions?.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{format(new Date(s.log_date), "MMM d, yyyy")}</TableCell>
                    <TableCell>{dayLabels?.[s.day_id]?.label || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{dayLabels?.[s.day_id]?.focus || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={s.completed_at ? "default" : "secondary"}>
                        {s.completed_at ? "Completed" : "In Progress"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => { setDetailDayId(s.day_id); setDetailDate(s.log_date); }}>
                        View Sets
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── FOOD LOGS ── */}
        <TabsContent value="food">
          <div className="card-apollo overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Meal</TableHead>
                  <TableHead>Calories</TableHead>
                  <TableHead>P / C / F</TableHead>
                  <TableHead>Photo</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingMacros ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : macroLogs?.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No food logs yet.</TableCell></TableRow>
                ) : macroLogs?.map(m => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium text-sm">{format(new Date(m.log_date), "MMM d")}</TableCell>
                    <TableCell className="text-sm">
                      {m.meal_name || "—"}
                      {m.ai_estimated && <Badge variant="outline" className="ml-1 text-[9px] py-0">AI</Badge>}
                    </TableCell>
                    <TableCell className="font-medium">{m.calories ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {m.protein_grams ?? 0}g / {m.carbs_grams ?? 0}g / {m.fat_grams ?? 0}g
                    </TableCell>
                    <TableCell>
                      {m.photo_url ? (
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => handlePhotoClick(m.photo_url!)}>
                          <Camera className="w-3 h-3" /> View
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{m.notes || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── DAILY CALORIES ── */}
        <TabsContent value="calories">
          <div className="card-apollo overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Total Calories</TableHead>
                  <TableHead>Protein</TableHead>
                  <TableHead>Carbs</TableHead>
                  <TableHead>Fat</TableHead>
                  <TableHead>Meals Logged</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingMacros ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : Object.keys(dailyCalories).length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No calorie data yet.</TableCell></TableRow>
                ) : Object.entries(dailyCalories)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .map(([date, totals]) => (
                  <TableRow key={date}>
                    <TableCell className="font-medium">{format(new Date(date), "MMM d, yyyy")}</TableCell>
                    <TableCell className="font-bold">{totals.calories}</TableCell>
                    <TableCell>{totals.protein}g</TableCell>
                    <TableCell>{totals.carbs}g</TableCell>
                    <TableCell>{totals.fat}g</TableCell>
                    <TableCell><Badge variant="outline">{totals.meals}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── STEPS ── */}
        <TabsContent value="steps">
          <div className="card-apollo overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Steps</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingSteps ? (
                  <TableRow><TableCell colSpan={2} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : stepLogs?.length === 0 ? (
                  <TableRow><TableCell colSpan={2} className="text-center py-8 text-muted-foreground">No step logs yet.</TableCell></TableRow>
                ) : stepLogs?.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{format(new Date(s.log_date), "MMM d, yyyy")}</TableCell>
                    <TableCell className="font-bold">{s.steps.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Set detail dialog */}
      <Dialog open={!!detailDayId} onOpenChange={(o) => { if (!o) { setDetailDayId(null); setDetailDate(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Set Logs — {detailDate ? format(new Date(detailDate), "MMM d, yyyy") : ""}
            </DialogTitle>
          </DialogHeader>
          {loadingSets ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
          ) : Object.keys(groupedSets).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No set data logged for this session.</p>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {Object.entries(groupedSets).map(([name, sets]) => (
                <div key={name} className="p-3 rounded-lg bg-muted/30 border border-border/50">
                  <p className="font-medium text-sm mb-2">{name}</p>
                  <div className="grid grid-cols-3 gap-1 text-xs text-muted-foreground font-medium mb-1">
                    <span>Set</span><span>Weight</span><span>Reps</span>
                  </div>
                  {sets.map(s => (
                    <div key={s.id} className="grid grid-cols-3 gap-1 text-sm py-0.5">
                      <span>{s.set_number}</span>
                      <span>{s.weight != null ? `${s.weight} lbs` : "—"}</span>
                      <span>{s.reps_completed ?? "—"}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Photo preview dialog */}
      <Dialog open={!!photoPreview} onOpenChange={(o) => { if (!o) setPhotoPreview(null); }}>
        <DialogContent className="max-w-sm p-2">
          <DialogHeader>
            <DialogTitle>Food Photo</DialogTitle>
          </DialogHeader>
          {photoPreview && (
            <img src={photoPreview} alt="Food log photo" className="w-full rounded-lg object-contain max-h-[70vh]" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientActivityLogs;
