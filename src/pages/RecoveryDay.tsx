import { useMemo, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import MuxVideo from "@/components/video/MuxVideo";
import { RECOVERY_PROGRAM } from "@/data/recoveryProgram";
import { useRecoveryPool, resolveDayExercises } from "./RecoveryProgram";
import { ChevronLeft, Clock, Loader2, Timer } from "lucide-react";

const RecoveryDay = () => {
  const { day } = useParams<{ day: string }>();
  const dayNum = Number(day);
  const meta = RECOVERY_PROGRAM.find((d) => d.day === dayNum);
  const { data: pool, isLoading } = useRecoveryPool();
  const [active, setActive] = useState<number>(0);

  if (!meta) return <Navigate to="/dashboard/recovery-program" replace />;

  const exercises = useMemo(() => (pool ? resolveDayExercises(meta, pool) : []), [pool, meta]);
  const current = exercises[active];

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 pb-32 pt-4 space-y-5">
        <Link
          to="/dashboard/recovery-program"
          className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-foreground/50 hover:text-primary"
        >
          <ChevronLeft className="w-3 h-3" /> Recovery Program
        </Link>

        <header>
          <div className="flex items-baseline gap-2">
            <p className="text-[10px] uppercase tracking-[0.22em] text-primary font-bold">Day {meta.day}</p>
            <p className="text-[10px] uppercase tracking-wider text-foreground/40 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {meta.durationMinutes} min
            </p>
          </div>
          <h1 className="font-heading text-2xl text-foreground leading-tight mt-1">{meta.title}</h1>
          <p className="text-sm text-foreground/60 mt-1">{meta.subtitle}</p>
        </header>

        {isLoading && (
          <div className="flex items-center gap-2 text-foreground/50 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading session…
          </div>
        )}

        {!isLoading && exercises.length === 0 && (
          <div className="rounded-xl border border-border/25 p-4 text-sm text-foreground/60">
            No Mux clips matched this day yet — check back after more recovery videos are uploaded.
          </div>
        )}

        {current && (
          <div className="rounded-2xl overflow-hidden border border-border/25 bg-black">
            <MuxVideo
              key={current.id}
              playbackId={current.mux_playback_id}
              title={current.name}
              videoId={current.id}
              category="recovery"
              poster={current.thumbnail_url ?? undefined}
              autoPlay
              playsInline
              controls
              className="w-full aspect-video bg-black"
            />
            <div className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-primary font-bold">
                {active + 1} of {exercises.length}
              </p>
              <h3 className="font-heading text-xl text-foreground mt-1">{current.name}</h3>
              {current.coaching_notes && (
                <p className="text-sm text-foreground/65 mt-2 leading-relaxed">{current.coaching_notes}</p>
              )}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setActive((i) => Math.max(0, i - 1))}
                  disabled={active === 0}
                  className="flex-1 py-2.5 rounded-lg border border-border/30 text-sm font-medium text-foreground/80 disabled:opacity-30"
                >
                  Previous
                </button>
                <button
                  onClick={() => setActive((i) => Math.min(exercises.length - 1, i + 1))}
                  disabled={active >= exercises.length - 1}
                  className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {exercises.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.22em] text-foreground/50 font-bold">Up Next</p>
            {exercises.map((ex, i) => (
              <button
                key={ex.id}
                onClick={() => setActive(i)}
                className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                  i === active ? "border-primary/50 bg-primary/5" : "border-border/20 hover:border-foreground/30"
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-foreground/5 flex items-center justify-center text-[11px] text-foreground/60 font-semibold flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground/90 truncate">{ex.name}</p>
                  {ex.body_part && (
                    <p className="text-[11px] text-foreground/45 mt-0.5">{ex.body_part}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default RecoveryDay;
