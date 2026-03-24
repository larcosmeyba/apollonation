import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isFuture, isBefore } from "date-fns";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const FuelCalendar = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [logDialogDate, setLogDialogDate] = useState<string | null>(null);
  const [quickAdd, setQuickAdd] = useState({ meal_name: "", calories: "", protein: "", carbs: "", fat: "" });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Fetch all macro logs for the month
  const { data: monthLogs = [] } = useQuery({
    queryKey: ["fuel-calendar-logs", user?.id, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("macro_logs")
        .select("log_date, calories")
        .eq("user_id", user.id)
        .gte("log_date", format(monthStart, "yyyy-MM-dd"))
        .lte("log_date", format(monthEnd, "yyyy-MM-dd"));
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Build a set of dates that have logs
  const loggedDates = new Set(monthLogs.map((l) => l.log_date));

  // Calculate streak
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = format(subDays(today, i), "yyyy-MM-dd");
    // For today, don't break streak if not yet logged
    if (i === 0) {
      const todayLogged = monthLogs.some((l) => l.log_date === d);
      if (todayLogged) streak++;
      continue;
    }
    // Check if this date had logs (we only have current month data, so check)
    // For simplicity, streak is based on current month view
    if (loggedDates.has(d)) {
      streak++;
    } else {
      break;
    }
  }

  // Weekly score
  const last7 = Array.from({ length: 7 }, (_, i) => format(subDays(today, 6 - i), "yyyy-MM-dd"));
  const weekLogged = last7.filter((d) => loggedDates.has(d)).length;
  const weekDayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const getDateStatus = (date: Date): "logged" | "missing" | "future" | "today" => {
    if (isFuture(date) && !isToday(date)) return "future";
    const dateStr = format(date, "yyyy-MM-dd");
    if (loggedDates.has(dateStr)) return "logged";
    if (isToday(date)) return "today";
    return "missing";
  };

  const handleQuickLog = async () => {
    if (!user || !logDialogDate) return;
    if (!quickAdd.meal_name || !quickAdd.calories) {
      toast({ title: "Enter meal name & calories", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("macro_logs").insert({
      user_id: user.id,
      log_date: logDialogDate,
      meal_name: quickAdd.meal_name,
      calories: parseInt(quickAdd.calories) || 0,
      protein_grams: parseInt(quickAdd.protein) || 0,
      carbs_grams: parseInt(quickAdd.carbs) || 0,
      fat_grams: parseInt(quickAdd.fat) || 0,
      ai_estimated: false,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Meals logged!", description: `Logged for ${logDialogDate}` });
    setLogDialogDate(null);
    setQuickAdd({ meal_name: "", calories: "", protein: "", carbs: "", fat: "" });
    queryClient.invalidateQueries({ queryKey: ["fuel-calendar-logs"] });
    queryClient.invalidateQueries({ queryKey: ["macro-logs"] });
  };

  // Day offset for first day of month
  const firstDayOffset = (monthStart.getDay() + 6) % 7; // Monday-based

  return (
    <>
      <Dialog open={!!logDialogDate} onOpenChange={(open) => !open && setLogDialogDate(null)}>
        <DialogContent className="sm:max-w-md bg-background border-border">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Log Meals — {logDialogDate}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Meal Name</Label><Input placeholder="e.g., Chicken Salad" value={quickAdd.meal_name} onChange={(e) => setQuickAdd(p => ({ ...p, meal_name: e.target.value }))} className="bg-muted border-border" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Calories</Label><Input type="number" placeholder="0" value={quickAdd.calories} onChange={(e) => setQuickAdd(p => ({ ...p, calories: e.target.value }))} className="bg-muted border-border" /></div>
              <div><Label>Protein (g)</Label><Input type="number" placeholder="0" value={quickAdd.protein} onChange={(e) => setQuickAdd(p => ({ ...p, protein: e.target.value }))} className="bg-muted border-border" /></div>
              <div><Label>Carbs (g)</Label><Input type="number" placeholder="0" value={quickAdd.carbs} onChange={(e) => setQuickAdd(p => ({ ...p, carbs: e.target.value }))} className="bg-muted border-border" /></div>
              <div><Label>Fat (g)</Label><Input type="number" placeholder="0" value={quickAdd.fat} onChange={(e) => setQuickAdd(p => ({ ...p, fat: e.target.value }))} className="bg-muted border-border" /></div>
            </div>
            <Button variant="apollo" className="w-full" onClick={handleQuickLog}>Log Meals</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        {/* Streak + Weekly Score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <span className="font-heading text-sm">{streak} Day Streak</span>
          </div>
          <span className="text-xs text-muted-foreground">{weekLogged}/7 this week</span>
        </div>

        {/* Weekly overview */}
        <div className="flex items-center justify-between px-1">
          {last7.map((dateStr, i) => {
            const logged = loggedDates.has(dateStr);
            const dayLabel = ["M", "T", "W", "T", "F", "S", "S"][new Date(dateStr + "T00:00:00").getDay() === 0 ? 6 : new Date(dateStr + "T00:00:00").getDay() - 1];
            return (
              <div key={dateStr} className="flex flex-col items-center gap-1">
                <span className="text-[9px] text-muted-foreground">{dayLabel}</span>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium ${
                  logged ? "bg-green-500/20 text-green-400" : isFuture(new Date(dateStr + "T00:00:00")) ? "bg-muted/30 text-muted-foreground" : "bg-destructive/20 text-destructive"
                }`}>
                  {logged ? "✔" : isFuture(new Date(dateStr + "T00:00:00")) ? "·" : "✕"}
                </div>
              </div>
            );
          })}
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-heading text-sm">{format(currentMonth, "MMMM yyyy")}</span>
          <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <div key={i} className="text-center text-[9px] text-muted-foreground py-1">{d}</div>
          ))}
          {/* Empty slots for offset */}
          {Array.from({ length: firstDayOffset }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {daysInMonth.map((date) => {
            const status = getDateStatus(date);
            const dateStr = format(date, "yyyy-MM-dd");
            const clickable = status === "missing" || status === "today";
            return (
              <button
                key={dateStr}
                onClick={() => clickable && setLogDialogDate(dateStr)}
                disabled={!clickable}
                className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all ${
                  status === "logged"
                    ? "bg-green-500/15 text-green-400 border border-green-500/30"
                    : status === "missing"
                    ? "bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25 cursor-pointer"
                    : status === "today"
                    ? "bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 cursor-pointer"
                    : "text-muted-foreground/40"
                }`}
              >
                {format(date, "d")}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4 justify-center text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-500/30" /> Logged</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-destructive/30" /> Missing</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-muted/30" /> Future</span>
        </div>
      </div>
    </>
  );
};

export default FuelCalendar;
