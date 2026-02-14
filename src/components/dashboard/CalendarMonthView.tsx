import { useMemo } from "react";
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
import { Dumbbell, Utensils, Check } from "lucide-react";

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

            return (
              <div
                key={date.toISOString()}
                className={`min-h-[90px] rounded-lg border p-1.5 transition-all ${
                  !inMonth
                    ? "opacity-30 border-border/50 bg-card/50"
                    : today
                    ? "border-apollo-gold/50 bg-apollo-gold/5"
                    : "border-border bg-card"
                } ${hasDraggedDay && inMonth ? "hover:border-apollo-gold/50 hover:bg-apollo-gold/5" : ""}`}
                onDragOver={(e) => inMonth && e.preventDefault()}
                onDrop={() => inMonth && onDrop(date)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium ${today ? "text-apollo-gold" : ""}`}>
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
                    onDragStart={() => onDragStart(workout, date)}
                    className="mb-1 p-1 rounded bg-apollo-gold/10 border border-apollo-gold/20 cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex items-center gap-0.5">
                      <Dumbbell className="w-2.5 h-2.5 text-apollo-gold flex-shrink-0" />
                      <span className="text-[10px] font-medium truncate">
                        {workout.focus || workout.day_label || `D${workout.day_number}`}
                      </span>
                    </div>
                  </div>
                )}

                {meals.length > 0 && inMonth && (
                  <div className="p-1 rounded bg-primary/5 border border-primary/10">
                    <div className="flex items-center gap-0.5">
                      <Utensils className="w-2.5 h-2.5 text-primary flex-shrink-0" />
                      <span className="text-[10px] font-medium">{meals.length}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
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

            return (
              <div
                key={date.toISOString()}
                className={`min-h-[52px] rounded-md border p-1 transition-all ${
                  !inMonth
                    ? "opacity-20 border-transparent"
                    : today
                    ? "border-apollo-gold/50 bg-apollo-gold/5"
                    : "border-border bg-card"
                }`}
              >
                <span className={`text-[10px] font-medium block text-center ${today ? "text-apollo-gold" : ""}`}>
                  {format(date, "d")}
                </span>

                {inMonth && (
                  <div className="flex flex-col items-center gap-0.5 mt-0.5">
                    {workout && (
                      <div className="w-4 h-4 rounded-full bg-apollo-gold/20 flex items-center justify-center">
                        <Dumbbell className="w-2.5 h-2.5 text-apollo-gold" />
                      </div>
                    )}
                    {meals.length > 0 && (
                      <div className="w-4 h-4 rounded-full bg-primary/15 flex items-center justify-center">
                        <Utensils className="w-2.5 h-2.5 text-primary" />
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
      </div>
    </>
  );
};

export default CalendarMonthView;
