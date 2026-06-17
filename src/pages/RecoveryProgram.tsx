import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { RECOVERY_PROGRAM, type RecoveryDay } from "@/data/recoveryProgram";
import { ChevronRight, Waves, Clock, Loader2, Timer } from "lucide-react";

type RecoveryExercise = {
  id: string;
  name: string;
  body_part: string | null;
  mux_playback_id: string;
  thumbnail_url: string | null;
  coaching_notes: string | null;
  suggested_time: number | null;
};

export function useRecoveryPool() {
  return useQuery({
    queryKey: ["recovery-mux-pool"],
    queryFn: async (): Promise<RecoveryExercise[]> => {
      const { data, error } = await (supabase as any)
        .from("admin_exercises")
        .select("id,name,body_part,mux_playback_id,thumbnail_url,coaching_notes,suggested_time,is_recovery,is_cooldown")
        .not("mux_playback_id", "is", null)
        .or("is_recovery.eq.true,is_cooldown.eq.true")
        .order("name");
      if (error) throw error;
      return (data ?? []) as RecoveryExercise[];
    },
    staleTime: 1000 * 60 * 30,
  });
}

export function resolveDayExercises(day: RecoveryDay, pool: RecoveryExercise[]): RecoveryExercise[] {
  const inc = day.include.map((s) => s.toLowerCase());
  const exc = (day.exclude ?? []).map((s) => s.toLowerCase());
  const seen = new Set<string>();
  const picks: RecoveryExercise[] = [];
  // Walk include keywords in order so curation feels intentional.
  for (const kw of inc) {
    for (const ex of pool) {
      if (picks.length >= day.cap) break;
      const name = (ex.name || "").toLowerCase();
      if (!name.includes(kw)) continue;
      if (exc.some((e) => name.includes(e))) continue;
      if (seen.has(ex.id)) continue;
      seen.add(ex.id);
      picks.push(ex);
    }
    if (picks.length >= day.cap) break;
  }
  return picks;
}

const RecoveryProgram = () => {
  const { data: pool, isLoading } = useRecoveryPool();

  const days = useMemo(() => {
    if (!pool) return [];
    return RECOVERY_PROGRAM.map((d) => ({
      ...d,
      exercises: resolveDayExercises(d, pool),
    }));
  }, [pool]);

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 pb-24 pt-6 space-y-6">
        <header>
          <p className="text-[10px] uppercase tracking-[0.22em] text-primary font-bold mb-2">7-Day Recovery Reset</p>
          <h1 className="font-heading text-3xl text-foreground leading-tight">Recovery & Mobility Program</h1>
          <p className="text-sm text-foreground/60 mt-2">
            A 7-day flow for off-days and deload weeks. Foam roll, mobilize, stretch, breathe —
            every session is built from in-house Apollo video.
          </p>
        </header>

        {isLoading && (
          <div className="flex items-center gap-2 text-foreground/50 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading recovery library…
          </div>
        )}

        <div className="space-y-3">
          {days.map((d) => (
            <Link
              key={d.day}
              to={`/dashboard/recovery-program/${d.day}`}
              className="block rounded-2xl border border-border/25 p-4 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Waves className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <p className="text-[10px] uppercase tracking-wider text-primary font-bold">Day {d.day}</p>
                    <p className="text-[10px] uppercase tracking-wider text-foreground/40 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {d.durationMinutes} min
                    </p>
                  </div>
                  <h3 className="font-heading text-lg text-foreground leading-tight mt-1">{d.title}</h3>
                  <p className="text-xs text-foreground/55 mt-1 line-clamp-2">{d.subtitle}</p>
                  <p className="text-[11px] text-foreground/40 mt-1.5 flex items-center gap-1">
                    <Timer className="w-3 h-3" />
                    {d.holdInstructions}
                  </p>
                  <p className="text-[11px] text-foreground/40 mt-1">
                    {d.exercises.length} {d.exercises.length === 1 ? "movement" : "movements"}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-foreground/30 mt-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default RecoveryProgram;
