import { useEffect, useState } from "react";
import { Heart, Footprints, Flame, Moon, Activity, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppleHealth } from "@/hooks/useAppleHealth";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { isNative } from "@/lib/platform";
import { Capacitor } from "@capacitor/core";

interface TodayRow {
  steps: number | null;
  active_calories: number | null;
  resting_heart_rate: number | null;
  avg_workout_heart_rate: number | null;
  sleep_minutes: number | null;
  workout_count: number | null;
}

const AppleHealthCard = () => {
  const { user } = useAuth();
  const { available, connected, syncing, lastSyncAt, error: rawError, connect, sync } = useAppleHealth();
  const error = rawError && /not implemented|not available/i.test(rawError)
    ? "Apple Health requires the latest app update"
    : rawError;
  const [today, setToday] = useState<TodayRow | null>(null);

  // Apple Health is iOS-only — compute platform but DO NOT early-return before hooks.
  const isIOS = isNative() && Capacitor.getPlatform() === "ios";

  useEffect(() => {
    if (!user) return;
    const todayStr = new Date().toISOString().split("T")[0];
    (supabase as any)
      .from("health_data_logs")
      .select("steps, active_calories, resting_heart_rate, avg_workout_heart_rate, sleep_minutes, workout_count")
      .eq("user_id", user.id)
      .eq("log_date", todayStr)
      .eq("source", "apple_health")
      .maybeSingle()
      .then(({ data }: any) => setToday(data ?? null));
  }, [user, lastSyncAt]);

  if (!isIOS) return null;
  if (!available) return null;

  if (!connected) {
    return (
      <div className="card-apollo p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Heart className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-heading text-sm">Apple Health</h3>
            <p className="text-xs text-muted-foreground">Sync steps, workouts, heart rate & sleep</p>
          </div>
        </div>
        <Button size="sm" className="w-full" onClick={connect} disabled={syncing}>
          {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Heart className="w-4 h-4 mr-2" />}
          Connect Apple Health
        </Button>
        {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      </div>
    );
  }

  const sleepHrs = today?.sleep_minutes ? (today.sleep_minutes / 60).toFixed(1) : "—";

  return (
    <div className="card-apollo p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Heart className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-heading text-sm">Apple Health</h3>
        </div>
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => sync()} disabled={syncing}>
          {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat icon={<Footprints className="w-4 h-4 text-primary" />} label="Steps" value={(today?.steps ?? 0).toLocaleString()} />
        <Stat icon={<Flame className="w-4 h-4 text-orange-400" />} label="Calories" value={`${today?.active_calories ?? 0}`} />
        <Stat icon={<Heart className="w-4 h-4 text-red-400" />} label="Rest HR" value={today?.resting_heart_rate ? `${today.resting_heart_rate} bpm` : "—"} />
        <Stat icon={<Moon className="w-4 h-4 text-blue-400" />} label="Sleep" value={`${sleepHrs} h`} />
      </div>

      {today?.workout_count ? (
        <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
          <Activity className="w-3 h-3" />
          {today.workout_count} workout{today.workout_count > 1 ? "s" : ""} today
          {today.avg_workout_heart_rate ? ` · avg ${today.avg_workout_heart_rate} bpm` : ""}
        </div>
      ) : null}

      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
    </div>
  );
};

const Stat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="rounded-lg bg-muted/30 p-2">
    <div className="flex items-center gap-1.5 mb-0.5">
      {icon}
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
    <p className="font-bold text-sm">{value}</p>
  </div>
);

export default AppleHealthCard;
