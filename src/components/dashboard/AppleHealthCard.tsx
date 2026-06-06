import { useEffect, useState } from "react";
import { Heart, Activity, RefreshCw, Loader2, CheckCircle2, ShieldCheck, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppleHealth } from "@/hooks/useAppleHealth";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { isNative } from "@/lib/platform";
import { Capacitor } from "@capacitor/core";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/use-toast";

interface TodayRow {
  steps: number | null;
  active_calories: number | null;
  resting_heart_rate: number | null;
  avg_workout_heart_rate: number | null;
  workout_count: number | null;
  workout_duration_minutes: number | null;
}

const AppleHealthCard = () => {
  const { user } = useAuth();
  const { available, connected, syncing, lastSyncAt, error: rawError, diagnostics, connect, sync } = useAppleHealth();
  const error = rawError && /not implemented|not available/i.test(rawError)
    ? "Apple Health requires the latest app update"
    : rawError;
  const [today, setToday] = useState<TodayRow | null>(null);
  const [showPrePrompt, setShowPrePrompt] = useState(false);
  const [permissionStep, setPermissionStep] = useState<"intro" | "system" | "success">("intro");

  const isIOS = isNative() && Capacitor.getPlatform() === "ios";

  useEffect(() => {
    if (!user) return;
    const todayStr = new Date().toISOString().split("T")[0];
    (supabase as any)
      .from("health_data_logs")
      .select("steps, active_calories, resting_heart_rate, avg_workout_heart_rate, workout_count, workout_duration_minutes")
      .eq("user_id", user.id)
      .eq("log_date", todayStr)
      .eq("source", "apple_health")
      .maybeSingle()
      .then(({ data }: any) => setToday(data ?? null));
  }, [user, lastSyncAt]);

  // Surface sync results so the user knows it actually ran
  useEffect(() => {
    if (lastSyncAt && connected) {
      const hasAnyData =
        (today?.steps ?? 0) > 0 ||
        (today?.active_calories ?? 0) > 0 ||
        (today?.workout_count ?? 0) > 0 ||
        (today?.avg_workout_heart_rate ?? 0) > 0;
      if (!hasAnyData) {
        toast({
          title: "Connected, but no data yet",
          description:
            "Open iPhone Settings → Health → Data Access & Devices → Apollo Reborn and turn ON Steps, Active Energy, Workouts, and Heart Rate.",
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastSyncAt]);

  if (!isIOS) return null;
  if (!available) return null;

  const handleConnectClick = () => {
    setPermissionStep("intro");
    setShowPrePrompt(true);
  };

  const handleApprove = async () => {
    setPermissionStep("system");
    try {
      const ok = await connect();
      if (ok) {
        setPermissionStep("success");
        toast({
          title: "Apple Health connected",
          description: "Steps, active calories, workouts, and heart rate will refresh automatically.",
        });
      } else {
        // Keep dialog open so the user can see the error rendered below
        setPermissionStep("intro");
        toast({
          title: "Couldn't connect to Apple Health",
          description:
            rawError ||
            "Open iPhone Settings → Privacy & Security → Health → Apollo Reborn and turn ON all categories, then try again.",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      setPermissionStep("intro");
      toast({
        title: "Apple Health error",
        description: e?.message ?? "Something went wrong requesting Apple Health permissions.",
        variant: "destructive",
      });
    }
  };

  if (!connected) {
    return (
      <>
        <div className="card-apollo p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-heading text-sm">Connect Apple Health</h3>
              <p className="text-xs text-muted-foreground">
                Sync steps, active calories, workouts & heart rate with your coach
              </p>
            </div>
          </div>
          <Button size="sm" className="w-full" onClick={handleConnectClick} disabled={syncing}>
            {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Heart className="w-4 h-4 mr-2" />}
            Connect Apple Health
          </Button>
          {error && (
            <p className="mt-2 text-[11px] text-destructive leading-snug">
              {error}
            </p>
          )}
        </div>

        <AlertDialog open={showPrePrompt} onOpenChange={setShowPrePrompt}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                {permissionStep === "success" ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    Connected to Apple Health
                  </>
                ) : permissionStep === "system" ? (
                  <>
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    Opening Apple Health…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5 text-primary" />
                    Connect Apple Health
                  </>
                )}
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                {permissionStep === "success" ? (
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-center py-3">
                      <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center">
                        <CheckCircle2 className="w-9 h-9 text-green-500" />
                      </div>
                    </div>
                    <p className="text-center font-medium text-foreground">You're all set.</p>
                    <p className="text-center text-muted-foreground">Apollo Reborn is now syncing the following from Apple Health:</p>
                    <ul className="grid grid-cols-1 gap-2 pl-1">
                      <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Steps, walking distance, exercise minutes</li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Active calories and workouts</li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Heart rate and resting heart rate</li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Heart rate during workouts</li>
                    </ul>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm">
                    <p>
                      Apollo Reborn will ask Apple for permission next. Turn on every category so your dashboard and coach see the full picture:
                    </p>
                    <ul className="grid grid-cols-1 gap-2 pl-1">
                      <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Steps, walking distance, and exercise minutes</li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Active calories and workouts</li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Heart rate and resting heart rate</li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Heart rate during workouts</li>
                    </ul>
                    <p className="rounded-lg border border-primary/20 bg-primary/10 p-3 font-bold text-foreground">
                      On Apple's permission screen, tap "Turn On All", then tap "Allow".
                    </p>
                    <p className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Settings className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      If steps still show 0 after connecting, open Settings → Health → Data Access & Devices → Apollo Reborn and confirm Steps is enabled.
                    </p>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              {permissionStep === "success" ? (
                <AlertDialogAction onClick={() => setShowPrePrompt(false)}>Done</AlertDialogAction>
              ) : (
                <>
                  <AlertDialogCancel disabled={syncing}>Not now</AlertDialogCancel>
                  <AlertDialogAction onClick={handleApprove} disabled={syncing}>
                    {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Continue
                  </AlertDialogAction>
                </>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  const workoutMins = today?.workout_duration_minutes ?? 0;
  const steps = today?.steps ?? 0;
  const calories = today?.active_calories ?? 0;
  const activityMin = workoutMins;
  const workoutCount = today?.workout_count ?? 0;
  const workoutHR = today?.avg_workout_heart_rate;

  // Daily goals (defaults; could be wired to user_targets later)
  const STEP_GOAL = 10000;
  const CAL_GOAL = 600;
  const ACTIVITY_GOAL = 30;

  return (
    <div
      className="relative rounded-2xl overflow-hidden p-5"
      style={{
        background:
          "linear-gradient(180deg, hsl(220 14% 12% / 0.95) 0%, hsl(220 16% 8% / 0.98) 100%)",
        border: "1px solid hsl(var(--apollo-gold) / 0.18)",
        boxShadow:
          "var(--shadow-md), inset 0 1px 0 hsl(var(--apollo-gold) / 0.08), 0 0 40px hsl(var(--apollo-gold) / 0.04)",
        backdropFilter: "blur(24px) saturate(140%)",
        WebkitBackdropFilter: "blur(24px) saturate(140%)",
      }}
    >
      {/* Subtle gold glow accent */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, hsl(var(--apollo-gold) / 0.4) 0%, transparent 70%)" }}
      />

      {/* Header */}
      <div className="relative flex items-start justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, hsl(var(--apollo-gold) / 0.18), hsl(var(--apollo-gold) / 0.06))",
              border: "1px solid hsl(var(--apollo-gold) / 0.25)",
            }}
          >
            <Heart className="w-4 h-4" style={{ color: "hsl(var(--apollo-gold))" }} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-sm tracking-wide text-foreground">Apple Health</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-green-400">
                <span className="w-1 h-1 rounded-full bg-green-400" />
                Connected
              </span>
            </div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/40 mt-0.5">Today's Activity</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastSyncAt && (
            <span className="text-[10px] text-foreground/40 hidden sm:inline">
              Last synced {new Date(lastSyncAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={() => sync()}
            disabled={syncing}
            aria-label="Refresh Apple Health data"
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-foreground/5"
            style={{ color: "hsl(var(--apollo-gold))" }}
          >
            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Activity Rings */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <RingMetric
          value={steps}
          goal={STEP_GOAL}
          label="Steps"
          display={steps.toLocaleString()}
          color="hsl(var(--apollo-gold))"
        />
        <RingMetric
          value={calories}
          goal={CAL_GOAL}
          label="Active Cal"
          display={calories.toLocaleString()}
          color="hsl(18 88% 60%)"
        />
        <RingMetric
          value={activityMin}
          goal={ACTIVITY_GOAL}
          label="Activity"
          display={`${activityMin}${activityMin ? " min" : ""}`}
          color="hsl(350 80% 62%)"
        />
      </div>

      {/* Divider */}
      <div
        className="h-px w-full mb-4"
        style={{ background: "linear-gradient(90deg, transparent, hsl(var(--apollo-gold) / 0.18), transparent)" }}
      />

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <SecondaryStat
          icon={<Heart className="w-3.5 h-3.5" style={{ color: "hsl(var(--apollo-gold))" }} />}
          label="Workout HR"
          value={workoutHR ? `${workoutHR}` : "—"}
          unit={workoutHR ? "bpm" : ""}
        />
        <SecondaryStat
          icon={<Activity className="w-3.5 h-3.5" style={{ color: "hsl(var(--apollo-gold))" }} />}
          label="Workouts"
          value={`${workoutCount}`}
          unit={workoutCount === 1 ? "session" : "sessions"}
        />
      </div>

      {/* Footer — opens iOS Settings so user can adjust permissions / disconnect */}
      <a
        href="App-Prefs:HEALTH"
        className="group w-full flex items-center justify-between rounded-xl py-2.5 px-3 transition-colors hover:bg-foreground/[0.04]"
        style={{ border: "1px solid hsl(var(--apollo-gold) / 0.12)" }}
      >
        <span className="text-[11px] uppercase tracking-[0.2em] font-semibold" style={{ color: "hsl(var(--apollo-gold))" }}>
          Manage in iPhone Settings
        </span>
        <span
          className="text-base transition-transform group-hover:translate-x-0.5"
          style={{ color: "hsl(var(--apollo-gold))" }}
          aria-hidden
        >
          →
        </span>
      </a>

      {error && <p className="text-xs text-destructive mt-3">{error}</p>}
    </div>
  );
};

/** Apple-Fitness-style circular progress ring */
const RingMetric = ({
  value,
  goal,
  label,
  display,
  color,
}: {
  value: number;
  goal: number;
  label: string;
  display: string;
  color: string;
}) => {
  const size = 92;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(1, goal > 0 ? value / goal : 0);
  const dash = circumference * pct;
  const pctLabel = Math.round(pct * 100);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="hsl(0 0% 100% / 0.06)"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${dash} ${circumference}`}
            style={{
              filter: `drop-shadow(0 0 6px ${color})`,
              transition: "stroke-dasharray 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[15px] font-bold leading-none text-foreground tracking-tight">{display}</span>
          <span className="text-[9px] uppercase tracking-wider text-foreground/50 mt-0.5">{label}</span>
        </div>
      </div>
      <span
        className="mt-2 text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: pct >= 1 ? "hsl(var(--apollo-gold))" : "hsl(0 0% 100% / 0.45)" }}
      >
        {pctLabel}% Goal
      </span>
    </div>
  );
};

const SecondaryStat = ({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
}) => (
  <div
    className="rounded-xl px-3 py-2.5"
    style={{
      background: "hsl(0 0% 100% / 0.025)",
      border: "1px solid hsl(0 0% 100% / 0.05)",
    }}
  >
    <div className="flex items-center gap-1.5 mb-1">
      {icon}
      <span className="text-[9px] uppercase tracking-[0.15em] text-foreground/50 font-semibold">{label}</span>
    </div>
    <div className="flex items-baseline gap-1">
      <p className="text-base font-bold text-foreground leading-none">{value}</p>
      {unit && <span className="text-[10px] text-foreground/40">{unit}</span>}
    </div>
  </div>
);

export default AppleHealthCard;
