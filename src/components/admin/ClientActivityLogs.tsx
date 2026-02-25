import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";

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

const ClientActivityLogs = ({ userId }: Props) => {
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [detailDayId, setDetailDayId] = useState<string | null>(null);
  const [detailDate, setDetailDate] = useState<string | null>(null);

  // Workout session logs
  const { data: sessions, isLoading } = useQuery({
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

  // Day labels lookup
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

  // Detailed set logs for a specific day + date
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

  // Exercise names for set logs
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

  const openDetail = (dayId: string, logDate: string) => {
    setDetailDayId(dayId);
    setDetailDate(logDate);
  };

  // Group set logs by exercise
  const groupedSets = setLogs?.reduce((acc, log) => {
    const name = exerciseNames?.[log.training_plan_exercise_id] || "Unknown";
    if (!acc[name]) acc[name] = [];
    acc[name].push(log);
    return acc;
  }, {} as Record<string, SetLog[]>) || {};

  return (
    <div className="space-y-4">
      <h3 className="font-heading text-lg">Workout Completion History</h3>
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
            {isLoading ? (
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
                  <Button size="sm" variant="outline" onClick={() => openDetail(s.day_id, s.log_date)}>
                    View Sets
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
    </div>
  );
};

export default ClientActivityLogs;
