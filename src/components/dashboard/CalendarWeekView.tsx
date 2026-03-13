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
                today ? "border-[hsl(18,55%,45%)]/50 bg-[hsl(18,55%,45%)]/5" : "border-[hsl(25,30%,65%)] bg-[hsl(35,35%,78%)]"
              } ${hasDraggedDay ? "hover:border-[hsl(18,55%,45%)]/50 hover:bg-[hsl(18,55%,45%)]/5" : ""}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(date)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${today ? "text-[hsl(18,55%,45%)]" : ""}`}>
                  {format(date, "d")}
                </span>
                {completed && (
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="w-3 h-3 text-green-500" />
                  </div>
                )}
              </div>

              {workout && (
                <div
                  draggable
                  onDragStart={() => onDragStart(workout, date)}
                  className="mb-1.5 p-1.5 rounded bg-[hsl(18,55%,45%)]/15 border border-[hsl(18,55%,45%)]/25 cursor-grab active:cursor-grabbing"
                >
                  <div className="flex items-center gap-1">
                    <Dumbbell className="w-3 h-3 text-[hsl(18,55%,45%)] flex-shrink-0" />
                    <span className="text-[11px] font-medium truncate">
                      {workout.focus || workout.day_label || `Day ${workout.day_number}`}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {workout.training_plan_exercises?.length || 0} exercises
                  </p>
                </div>
              )}

              {meals.length > 0 && (
                <div className="p-1.5 rounded bg-[hsl(80,25%,40%)]/10 border border-[hsl(80,25%,40%)]/20">
                  <div className="flex items-center gap-1">
                    <Utensils className="w-3 h-3 text-[hsl(80,25%,40%)] flex-shrink-0" />
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
                today ? "border-[hsl(18,55%,45%)]/50 bg-[hsl(18,55%,45%)]/5" : "border-[hsl(25,30%,65%)] bg-[hsl(35,35%,78%)]"
              }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(date)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${today ? "text-[hsl(18,55%,45%)]" : ""}`}>
                    {format(date, "EEE, MMM d")}
                  </span>
                  {today && (
                    <Badge variant="outline" className="text-[10px] border-[hsl(18,55%,45%)]/40 text-[hsl(18,55%,45%)] px-1.5 py-0">
                      Today
                    </Badge>
                  )}
                </div>
                {completed && (
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="w-3 h-3 text-green-500" />
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {workout && (
                  <div
                    draggable
                    onDragStart={() => onDragStart(workout, date)}
                    className="flex items-center gap-2 p-2 rounded bg-[hsl(18,55%,45%)]/15 border border-[hsl(18,55%,45%)]/25 cursor-grab active:cursor-grabbing flex-1 min-w-0"
                  >
                    <Dumbbell className="w-4 h-4 text-[hsl(18,55%,45%)] flex-shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs font-medium block truncate">
                        {workout.focus || workout.day_label || `Day ${workout.day_number}`}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {workout.training_plan_exercises?.length || 0} exercises
                      </span>
                    </div>
                  </div>
                )}

                {meals.length > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded bg-primary/5 border border-primary/10 flex-1 min-w-0">
                    <Utensils className="w-4 h-4 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs font-medium block">{meals.length} meals</span>
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
