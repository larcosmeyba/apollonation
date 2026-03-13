import { format, isToday } from "date-fns";
import { Dumbbell, Utensils, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CalendarWeekViewProps {
  weekDates: Date[];
  getWorkoutForDate: (date: Date) => any;
  getMealsForDate: (date: Date) => any[];
  isWorkoutCompleted: (date: Date) => boolean;
  onDragStart: (day: any, sourceDate: Date) => void;
  onDrop: (targetDate: Date) => void;
  hasDraggedDay: boolean;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const CalendarWeekView = ({
  weekDates,
  getWorkoutForDate,
  getMealsForDate,
  isWorkoutCompleted,
  onDragStart,
  onDrop,
  hasDraggedDay,
}: CalendarWeekViewProps) => {
  return (
    <>
      {/* Desktop: 7-col grid */}
      <div className="hidden md:grid grid-cols-7 gap-2">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}

        {weekDates.map((date) => {
          const workout = getWorkoutForDate(date);
          const meals = getMealsForDate(date);
          const completed = isWorkoutCompleted(date);
          const today = isToday(date);

          return (
            <div
              key={date.toISOString()}
              className={`min-h-[140px] rounded-lg border p-2 transition-all ${
                today ? "border-primary/50 bg-primary/5" : "border-border bg-card"
              } ${hasDraggedDay ? "hover:border-primary/50 hover:bg-primary/5" : ""}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(date)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${today ? "text-primary" : "text-foreground"}`}>
                  {format(date, "d")}
                </span>
                {completed && (
                  <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center">
                    <Check className="w-3 h-3 text-accent" />
                  </div>
                )}
              </div>

              {workout && (
                <div
                  draggable
                  onDragStart={() => onDragStart(workout, date)}
                  className="mb-1.5 p-1.5 rounded bg-primary/10 border border-primary/20 cursor-grab active:cursor-grabbing"
                >
                  <div className="flex items-center gap-1">
                    <Dumbbell className="w-3 h-3 text-primary flex-shrink-0" />
                    <span className="text-[11px] font-medium truncate text-foreground">
                      {workout.focus || workout.day_label || `Day ${workout.day_number}`}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {workout.training_plan_exercises?.length || 0} exercises
                  </p>
                </div>
              )}

              {meals.length > 0 && (
                <div className="p-1.5 rounded bg-accent/10 border border-accent/15">
                  <div className="flex items-center gap-1">
                    <Utensils className="w-3 h-3 text-accent flex-shrink-0" />
                    <span className="text-[11px] font-medium text-foreground">{meals.length} meals</span>
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

      {/* Mobile: stacked day cards */}
      <div className="md:hidden flex flex-col gap-2">
        {weekDates.map((date) => {
          const workout = getWorkoutForDate(date);
          const meals = getMealsForDate(date);
          const completed = isWorkoutCompleted(date);
          const today = isToday(date);

          return (
            <div
              key={date.toISOString()}
              className={`rounded-lg border p-3 transition-all ${
                today ? "border-primary/50 bg-primary/5" : "border-border bg-card"
              }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(date)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${today ? "text-primary" : "text-foreground"}`}>
                    {format(date, "EEE, MMM d")}
                  </span>
                  {today && (
                    <Badge variant="outline" className="text-[10px] border-primary/40 text-primary px-1.5 py-0">
                      Today
                    </Badge>
                  )}
                </div>
                {completed && (
                  <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center">
                    <Check className="w-3 h-3 text-accent" />
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {workout && (
                  <div
                    draggable
                    onDragStart={() => onDragStart(workout, date)}
                    className="flex items-center gap-2 p-2 rounded bg-primary/10 border border-primary/20 cursor-grab active:cursor-grabbing flex-1 min-w-0"
                  >
                    <Dumbbell className="w-4 h-4 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs font-medium block truncate text-foreground">
                        {workout.focus || workout.day_label || `Day ${workout.day_number}`}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {workout.training_plan_exercises?.length || 0} exercises
                      </span>
                    </div>
                  </div>
                )}

                {meals.length > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded bg-accent/10 border border-accent/15 flex-1 min-w-0">
                    <Utensils className="w-4 h-4 text-accent flex-shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs font-medium block text-foreground">{meals.length} meals</span>
                      <span className="text-[11px] text-muted-foreground">
                        {meals.reduce((sum: number, m: any) => sum + (m.calories || 0), 0)} cal
                      </span>
                    </div>
                  </div>
                )}

                {!workout && meals.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Rest day</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default CalendarWeekView;
