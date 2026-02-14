import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import CalendarWeekView from "@/components/dashboard/CalendarWeekView";
import CalendarMonthView from "@/components/dashboard/CalendarMonthView";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays, LayoutGrid, Dumbbell, Utensils, Check } from "lucide-react";
import {
  format,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  isSameDay,
  isToday,
} from "date-fns";
import { useToast } from "@/hooks/use-toast";

type ViewMode = "week" | "month";

const DashboardCalendar = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedDay, setDraggedDay] = useState<any>(null);

  const currentWeekStart = useMemo(
    () => startOfWeek(currentDate, { weekStartsOn: 1 }),
    [currentDate]
  );

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)),
    [currentWeekStart]
  );

  // Date range for data fetching (covers both views)
  const fetchRange = useMemo(() => {
    if (viewMode === "week") {
      return {
        start: currentWeekStart,
        end: addDays(currentWeekStart, 6),
      };
    }
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    // Extend to cover partial weeks at edges
    return {
      start: startOfWeek(monthStart, { weekStartsOn: 1 }),
      end: addDays(monthEnd, 7),
    };
  }, [viewMode, currentWeekStart, currentDate]);

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

  // Fetch macro logs for the visible range
  const { data: macroLogs = [] } = useQuery({
    queryKey: ["calendar-macros", user?.id, format(fetchRange.start, "yyyy-MM-dd"), format(fetchRange.end, "yyyy-MM-dd")],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("macro_logs")
        .select("log_date, meal_name, calories")
        .eq("user_id", user.id)
        .gte("log_date", format(fetchRange.start, "yyyy-MM-dd"))
        .lte("log_date", format(fetchRange.end, "yyyy-MM-dd"));
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch workout progress for the visible range
  const { data: completedWorkouts = [] } = useQuery({
    queryKey: ["calendar-progress", user?.id, format(fetchRange.start, "yyyy-MM-dd"), format(fetchRange.end, "yyyy-MM-dd")],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("user_workout_progress")
        .select("completed_at, workout_id")
        .eq("user_id", user.id)
        .gte("completed_at", fetchRange.start.toISOString())
        .lte("completed_at", fetchRange.end.toISOString());
      return data || [];
    },
    enabled: !!user,
  });

  const getWorkoutForDate = useCallback((date: Date) => {
    if (!planData) return null;
    const { plan, days } = planData;
    const cycleStart = plan.client_questionnaires?.cycle_start_date
      ? new Date(plan.client_questionnaires.cycle_start_date)
      : new Date(plan.created_at);

    const diffDays = Math.floor((date.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return null;

    const totalDays = plan.duration_weeks * 7;
    const dayNumber = (diffDays % totalDays) + 1;

    const rescheduled = days.find((d: any) =>
      d.scheduled_date && isSameDay(new Date(d.scheduled_date), date)
    );
    if (rescheduled) return rescheduled;

    return days.find((d: any) => !d.scheduled_date && d.day_number === dayNumber) || null;
  }, [planData]);

  const getMealsForDate = useCallback((date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return macroLogs.filter((m: any) => m.log_date === dateStr);
  }, [macroLogs]);

  const isWorkoutCompleted = useCallback((date: Date) => {
    return completedWorkouts.some((w: any) =>
      isSameDay(new Date(w.completed_at), date)
    );
  }, [completedWorkouts]);

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

  const navigatePrev = () => {
    setCurrentDate((d) => (viewMode === "week" ? subWeeks(d, 1) : subMonths(d, 1)));
  };

  const navigateNext = () => {
    setCurrentDate((d) => (viewMode === "week" ? addWeeks(d, 1) : addMonths(d, 1)));
  };

  const headerLabel =
    viewMode === "week"
      ? `${format(currentWeekStart, "MMM d")} — ${format(addDays(currentWeekStart, 6), "MMM d, yyyy")}`
      : format(currentDate, "MMMM yyyy");

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="font-heading text-3xl md:text-4xl mb-2">
            My <span className="text-apollo-gold">Calendar</span>
          </h1>
          <p className="text-muted-foreground">Track workouts, meals, and progress</p>
        </div>

        {/* Controls: view toggle + navigation */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            <Button
              variant={viewMode === "week" ? "default" : "ghost"}
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setViewMode("week")}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Week
            </Button>
            <Button
              variant={viewMode === "month" ? "default" : "ghost"}
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setViewMode("month")}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Month
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={navigatePrev}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            <h2 className="font-heading text-sm md:text-lg min-w-[140px] text-center">
              {headerLabel}
            </h2>
            <Button variant="ghost" size="sm" onClick={navigateNext}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Calendar view */}
        {viewMode === "week" ? (
          <CalendarWeekView
            weekDates={weekDates}
            getWorkoutForDate={getWorkoutForDate}
            getMealsForDate={getMealsForDate}
            isWorkoutCompleted={isWorkoutCompleted}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            hasDraggedDay={!!draggedDay}
          />
        ) : (
          <CalendarMonthView
            currentDate={currentDate}
            getWorkoutForDate={getWorkoutForDate}
            getMealsForDate={getMealsForDate}
            isWorkoutCompleted={isWorkoutCompleted}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            hasDraggedDay={!!draggedDay}
          />
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 md:gap-6 mt-4 text-xs text-muted-foreground">
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
          <span className="hidden md:inline text-apollo-gold/60">Drag workouts to reschedule</span>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardCalendar;
