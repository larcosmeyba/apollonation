import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Dumbbell, Utensils, Check } from "lucide-react";
import {
  format,
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
  isToday,
} from "date-fns";
import { useToast } from "@/hooks/use-toast";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DashboardCalendar = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [draggedDay, setDraggedDay] = useState<any>(null);

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)),
    [currentWeekStart]
  );

  // Fetch active training plan + days
  const { data: planData } = useQuery({
    queryKey: ["calendar-plan", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data: plans } = await (supabase as any)
        .from("client_training_plans")
        .select("*, client_questionnaires!client_training_plans_questionnaire_id_fkey(cycle_start_date)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1);
      const plan = plans?.[0];
      if (!plan) return null;

      const { data: days } = await (supabase as any)
        .from("training_plan_days")
        .select("*, training_plan_exercises(*)")
        .eq("plan_id", plan.id)
        .order("day_number");

      return { plan, days: days || [] };
    },
    enabled: !!user,
  });

  // Fetch macro logs for the week
  const { data: macroLogs = [] } = useQuery({
    queryKey: ["calendar-macros", user?.id, format(currentWeekStart, "yyyy-MM-dd")],
    queryFn: async () => {
      if (!user) return [];
      const weekEnd = addDays(currentWeekStart, 6);
      const { data } = await supabase
        .from("macro_logs")
        .select("log_date, meal_name, calories")
        .eq("user_id", user.id)
        .gte("log_date", format(currentWeekStart, "yyyy-MM-dd"))
        .lte("log_date", format(weekEnd, "yyyy-MM-dd"));
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch workout progress for the week
  const { data: completedWorkouts = [] } = useQuery({
    queryKey: ["calendar-progress", user?.id, format(currentWeekStart, "yyyy-MM-dd")],
    queryFn: async () => {
      if (!user) return [];
      const weekEnd = addDays(currentWeekStart, 6);
      const { data } = await supabase
        .from("user_workout_progress")
        .select("completed_at, workout_id")
        .eq("user_id", user.id)
        .gte("completed_at", currentWeekStart.toISOString())
        .lte("completed_at", weekEnd.toISOString());
      return data || [];
    },
    enabled: !!user,
  });

  // Map training days to calendar dates
  const getWorkoutForDate = (date: Date) => {
    if (!planData) return null;
    const { plan, days } = planData;
    const cycleStart = plan.client_questionnaires?.cycle_start_date
      ? new Date(plan.client_questionnaires.cycle_start_date)
      : new Date(plan.created_at);

    const diffDays = Math.floor((date.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return null;

    const totalDays = plan.duration_weeks * 7;
    const dayNumber = (diffDays % totalDays) + 1;

    // Check for rescheduled day first
    const rescheduled = days.find((d: any) =>
      d.scheduled_date && isSameDay(new Date(d.scheduled_date), date)
    );
    if (rescheduled) return rescheduled;

    // Default mapping
    return days.find((d: any) => !d.scheduled_date && d.day_number === dayNumber) || null;
  };

  const getMealsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return macroLogs.filter((m: any) => m.log_date === dateStr);
  };

  const isWorkoutCompleted = (date: Date) => {
    return completedWorkouts.some((w: any) =>
      isSameDay(new Date(w.completed_at), date)
    );
  };

  // Drag and drop handlers
  const handleDragStart = (day: any, sourceDate: Date) => {
    setDraggedDay({ ...day, sourceDate });
  };

  const handleDrop = async (targetDate: Date) => {
    if (!draggedDay) return;

    try {
      await (supabase as any)
        .from("training_plan_days")
        .update({ scheduled_date: format(targetDate, "yyyy-MM-dd") })
        .eq("id", draggedDay.id);

      queryClient.invalidateQueries({ queryKey: ["calendar-plan"] });
      toast({ title: "Workout rescheduled", description: `Moved to ${format(targetDate, "EEEE, MMM d")}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setDraggedDay(null);
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="font-heading text-3xl md:text-4xl mb-2">
            My <span className="text-apollo-gold">Calendar</span>
          </h1>
          <p className="text-muted-foreground">Track workouts, meals, and progress</p>
        </div>

        {/* Week navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" onClick={() => setCurrentWeekStart(w => subWeeks(w, 1))}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>
          <h2 className="font-heading text-lg">
            {format(currentWeekStart, "MMM d")} — {format(addDays(currentWeekStart, 6), "MMM d, yyyy")}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => setCurrentWeekStart(w => addWeeks(w, 1))}>
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Day headers */}
          {WEEKDAYS.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}

          {/* Day cells */}
          {weekDates.map((date) => {
            const workout = getWorkoutForDate(date);
            const meals = getMealsForDate(date);
            const completed = isWorkoutCompleted(date);
            const today = isToday(date);

            return (
              <div
                key={date.toISOString()}
                className={`min-h-[140px] rounded-lg border p-2 transition-all ${
                  today
                    ? "border-apollo-gold/50 bg-apollo-gold/5"
                    : "border-border bg-card"
                } ${draggedDay ? "hover:border-apollo-gold/50 hover:bg-apollo-gold/5" : ""}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(date)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${today ? "text-apollo-gold" : ""}`}>
                    {format(date, "d")}
                  </span>
                  {completed && (
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Check className="w-3 h-3 text-green-500" />
                    </div>
                  )}
                </div>

                {/* Workout for this day */}
                {workout && (
                  <div
                    draggable
                    onDragStart={() => handleDragStart(workout, date)}
                    className="mb-1.5 p-1.5 rounded bg-apollo-gold/10 border border-apollo-gold/20 cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex items-center gap-1">
                      <Dumbbell className="w-3 h-3 text-apollo-gold flex-shrink-0" />
                      <span className="text-[11px] font-medium truncate">
                        {workout.focus || workout.day_label || `Day ${workout.day_number}`}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {workout.training_plan_exercises?.length || 0} exercises
                    </p>
                  </div>
                )}

                {/* Meals for this day */}
                {meals.length > 0 && (
                  <div className="p-1.5 rounded bg-primary/5 border border-primary/10">
                    <div className="flex items-center gap-1">
                      <Utensils className="w-3 h-3 text-primary flex-shrink-0" />
                      <span className="text-[11px] font-medium">{meals.length} meals</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {meals.reduce((sum: number, m: any) => sum + (m.calories || 0), 0)} cal
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-apollo-gold/20 border border-apollo-gold/30" />
            <span>Workout</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-primary/10 border border-primary/20" />
            <span>Meals logged</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-green-500" />
            </div>
            <span>Completed</span>
          </div>
          <span className="text-apollo-gold/60">Drag workouts to reschedule</span>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardCalendar;
