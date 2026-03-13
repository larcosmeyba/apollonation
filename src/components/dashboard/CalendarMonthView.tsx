import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { Dumbbell, Utensils, Check, X } from "lucide-react";

interface CalendarMonthViewProps {
  currentDate: Date;
  getWorkoutForDate: (date: Date) => any;
  getMealsForDate: (date: Date) => any[];
  isWorkoutCompleted: (date: Date) => boolean;
  onDragStart: (day: any, sourceDate: Date) => void;
  onDrop: (targetDate: Date) => void;
  hasDraggedDay: boolean;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const CalendarMonthView = ({
  currentDate,
  getWorkoutForDate,
  getMealsForDate,
  isWorkoutCompleted,
  onDragStart,
  onDrop,
  hasDraggedDay,
}: CalendarMonthViewProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentDate]);

  const handleDayClick = (date: Date, inMonth: boolean) => {
    if (!inMonth) return;
    setSelectedDate((prev) => (prev && isSameDay(prev, date) ? null : date));
  };

  const selectedWorkout = selectedDate ? getWorkoutForDate(selectedDate) : null;
  const selectedMeals = selectedDate ? getMealsForDate(selectedDate) : [];
  const selectedCompleted = selectedDate ? isWorkoutCompleted(selectedDate) : false;

  return (
    <>
      {/* Desktop grid */}
      <div className="hidden md:block">
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}

          {calendarDays.map((date) => {
            const inMonth = isSameMonth(date, currentDate);
            const workout = getWorkoutForDate(date);
            const meals = getMealsForDate(date);
            const completed = isWorkoutCompleted(date);
            const today = isToday(date);
            const isSelected = selectedDate && isSameDay(date, selectedDate);

            return (
              <div
                key={date.toISOString()}
                onClick={() => handleDayClick(date, inMonth)}
                className={`min-h-[90px] rounded-lg border p-1.5 transition-all cursor-pointer ${
                  !inMonth
                    ? "opacity-30 border-[hsl(35,20%,70%)]/50 bg-[hsl(35,25%,88%)]/50 cursor-default"
                    : isSelected
                    ? "border-[hsl(18,55%,45%)] bg-[hsl(18,55%,45%)]/10 ring-1 ring-[hsl(18,55%,45%)]/30"
                    : today
                    ? "border-[hsl(18,55%,45%)]/50 bg-[hsl(18,55%,45%)]/5"
                    : "border-[hsl(25,30%,65%)] bg-[hsl(35,35%,78%)] hover:border-[hsl(25,40%,35%)]/40"
                } ${hasDraggedDay && inMonth ? "hover:border-[hsl(18,55%,45%)]/50 hover:bg-[hsl(18,55%,45%)]/5" : ""}`}
                onDragOver={(e) => inMonth && e.preventDefault()}
                onDrop={() => inMonth && onDrop(date)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium ${today ? "text-[hsl(18,55%,45%)]" : ""}`}>
                    {format(date, "d")}
                  </span>
                  {completed && (
                    <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-green-500" />
                    </div>
                  )}
                </div>

                {workout && inMonth && (
                  <div
                    draggable
                    onDragStart={(e) => { e.stopPropagation(); onDragStart(workout, date); }}
                    className="mb-1 p-1 rounded bg-[hsl(18,55%,45%)]/15 border border-[hsl(18,55%,45%)]/25 cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex items-center gap-0.5">
                      <Dumbbell className="w-2.5 h-2.5 text-[hsl(18,55%,45%)] flex-shrink-0" />
                      <span className="text-[10px] font-medium truncate">
                        {workout.focus || workout.day_label || `D${workout.day_number}`}
                      </span>
                    </div>
                  </div>
                )}

                {meals.length > 0 && inMonth && (
                  <div className="p-1 rounded bg-[hsl(80,25%,40%)]/10 border border-[hsl(80,25%,40%)]/20">
                    <div className="flex items-center gap-0.5">
                      <Utensils className="w-2.5 h-2.5 text-[hsl(80,25%,40%)] flex-shrink-0" />
                      <span className="text-[10px] font-medium">{meals.length}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Desktop expanded detail panel */}
        {selectedDate && isSameMonth(selectedDate, currentDate) && (
          <DayDetailPanel
            date={selectedDate}
            workout={selectedWorkout}
            meals={selectedMeals}
            completed={selectedCompleted}
            onClose={() => setSelectedDate(null)}
          />
        )}
      </div>

      {/* Mobile: compact month grid */}
      <div className="md:hidden">
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((day) => (
            <div key={day} className="text-center text-[10px] font-medium text-muted-foreground py-1">
              {day.charAt(0)}
            </div>
          ))}

          {calendarDays.map((date) => {
            const inMonth = isSameMonth(date, currentDate);
            const workout = getWorkoutForDate(date);
            const meals = getMealsForDate(date);
            const completed = isWorkoutCompleted(date);
            const today = isToday(date);
            const isSelected = selectedDate && isSameDay(date, selectedDate);

            return (
              <div
                key={date.toISOString()}
                onClick={() => handleDayClick(date, inMonth)}
                className={`min-h-[52px] rounded-md border p-1 transition-all ${
                  !inMonth
                    ? "opacity-20 border-transparent"
                    : isSelected
                    ? "border-[hsl(18,55%,45%)] bg-[hsl(18,55%,45%)]/10 ring-1 ring-[hsl(18,55%,45%)]/30"
                    : today
                    ? "border-[hsl(18,55%,45%)]/50 bg-[hsl(18,55%,45%)]/5"
                    : "border-[hsl(25,30%,65%)] bg-[hsl(35,35%,78%)]"
                }`}
              >
                <span className={`text-[10px] font-medium block text-center ${today ? "text-[hsl(18,55%,45%)]" : ""}`}>
                  {format(date, "d")}
                </span>

                {inMonth && (
                  <div className="flex flex-col items-center gap-0.5 mt-0.5">
                    {workout && (
                      <div className="w-4 h-4 rounded-full bg-[hsl(18,55%,45%)]/20 flex items-center justify-center">
                        <Dumbbell className="w-2.5 h-2.5 text-[hsl(18,55%,45%)]" />
                      </div>
                    )}
                    {meals.length > 0 && (
                      <div className="w-4 h-4 rounded-full bg-[hsl(80,25%,40%)]/15 flex items-center justify-center">
                        <Utensils className="w-2.5 h-2.5 text-[hsl(80,25%,40%)]" />
                      </div>
                    )}
                    {completed && (
                      <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-green-500" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile expanded detail panel */}
        {selectedDate && isSameMonth(selectedDate, currentDate) && (
          <DayDetailPanel
            date={selectedDate}
            workout={selectedWorkout}
            meals={selectedMeals}
            completed={selectedCompleted}
            onClose={() => setSelectedDate(null)}
          />
        )}
      </div>
    </>
  );
};

/* ── Day Detail Panel ── */
interface DayDetailPanelProps {
  date: Date;
  workout: any;
  meals: any[];
  completed: boolean;
  onClose: () => void;
}

const DayDetailPanel = ({ date, workout, meals, completed, onClose }: DayDetailPanelProps) => {
  const totalCals = meals.reduce((sum: number, m: any) => sum + (m.calories || 0), 0);

  return (
    <div className="mt-3 rounded-lg border border-[hsl(18,55%,45%)]/30 bg-[hsl(35,35%,78%)] p-4 animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-heading text-sm font-semibold">
            {format(date, "EEEE, MMMM d")}
          </h3>
          {completed && (
            <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check className="w-3 h-3 text-green-500" />
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Workout section */}
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Dumbbell className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-primary">Workout</span>
          </div>
          {workout ? (
            <div>
              <p className="text-sm font-medium">
                {workout.focus || workout.day_label || `Day ${workout.day_number}`}
              </p>
              {workout.training_plan_exercises?.length > 0 ? (
                <ul className="mt-1.5 space-y-0.5">
                  {workout.training_plan_exercises.map((ex: any, i: number) => (
                    <li key={ex.id || i} className="text-xs text-muted-foreground flex items-baseline gap-1">
                      <span className="text-[10px] text-primary/60">{i + 1}.</span>
                      <span>{ex.exercise_name}</span>
                      {ex.sets && ex.reps && (
                        <span className="text-[10px] text-muted-foreground/60 ml-auto whitespace-nowrap">
                          {ex.sets}×{ex.reps}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">No exercises listed</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Rest day — no workout scheduled</p>
          )}
        </div>

        {/* Meals section */}
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Utensils className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-primary">Meals</span>
          </div>
          {meals.length > 0 ? (
            <div>
              <ul className="space-y-0.5">
                {meals.map((meal: any, i: number) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-baseline justify-between gap-2">
                    <span className="truncate">{meal.meal_name || `Meal ${i + 1}`}</span>
                    {meal.calories != null && (
                      <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap">
                        {meal.calories} cal
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="text-xs font-medium mt-2 pt-1.5 border-t border-primary/10">
                Total: {totalCals} cal
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No meals logged</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarMonthView;
