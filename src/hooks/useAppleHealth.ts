import { useEffect, useState, useCallback, useRef } from "react";
import { isNative } from "@/lib/platform";
import { Capacitor } from "@capacitor/core";
import { CapacitorHealthkit, SampleNames } from "@perfood/capacitor-healthkit";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// IMPORTANT: these are the friendly auth names the @perfood plugin maps to
// HKObjectTypes inside requestAuthorization (see the plugin's getTypes()).
// They are NOT the same as SampleNames used for queryHKitSampleType.
// Missing any of these means iOS will not show a toggle for it and queries
// return empty arrays with no error.
const READ_PERMISSIONS = [
  "steps",
  "calories",
  "activity", // includes workouts + sleepAnalysis
  "duration",
  "distance",
  "weight",
  "heartRate",
  "restingHeartRate",
];

const isAppleHealthAvailable = (): boolean =>
  isNative() && Capacitor.getPlatform() === "ios";

interface HealthSyncDiagnostics {
  stepSamplesToday: number;
  calorieSamplesToday: number;
  sleepSamplesToday: number;
  workoutSamplesToday: number;
  lastMessage: string | null;
}

interface DailyHealthSummary {
  log_date: string;
  steps: number;
  active_calories: number;
  resting_heart_rate: number | null;
  avg_workout_heart_rate: number | null;
  workout_count: number;
  workout_duration_minutes: number;
  sleep_minutes: number;
  weight_kg: number | null;
  raw_workouts: any[];
}

const ymd = (d: Date) => {
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const sumValues = (rows: any[]): number =>
  (rows || []).reduce((acc, r) => acc + (Number(r?.value) || 0), 0);

const durationToMinutes = (value: unknown): number => {
  const duration = Number(value) || 0;
  if (duration <= 0) return 0;
  // @perfood/capacitor-healthkit returns duration in hours for sleep/workouts.
  if (duration <= 48) return duration * 60;
  // Defensive fallback if a native implementation ever returns seconds.
  if (duration > 1000) return duration / 60;
  return duration;
};

export const useAppleHealth = () => {
  const { user } = useAuth();
  const [available] = useState<boolean>(isAppleHealthAvailable());
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const syncedThisSessionRef = useRef(false);

  // Load saved connection state
  useEffect(() => {
    if (!user) return;
    (supabase as any)
      .from("health_connection_status")
      .select("apple_health_connected, last_sync_at")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) {
          setConnected(!!data.apple_health_connected);
          setLastSyncAt(data.last_sync_at ?? null);
        }
      });
  }, [user]);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (!available) {
      setError("Apple Health is only available on iPhone.");
      return false;
    }
    try {
      await CapacitorHealthkit.isAvailable();
      await CapacitorHealthkit.requestAuthorization({
        all: [],
        read: READ_PERMISSIONS,
        write: [],
      });
      setError(null);
      return true;
    } catch (e: any) {
      console.error("[AppleHealth] permission error", e);
      setError(e?.message ?? "Could not access Apple Health.");
      return false;
    }
  }, [available]);

  const fetchDayData = useCallback(async (date: Date): Promise<DailyHealthSummary> => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    const baseQ = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      limit: 0,
    };

    const safeQuery = async (sampleName: string): Promise<any[]> => {
      try {
        const res: any = await CapacitorHealthkit.queryHKitSampleType({
          ...baseQ,
          sampleName,
        });
        return res?.resultData ?? [];
      } catch (e) {
        console.warn(`[AppleHealth] query ${sampleName} failed`, e);
        return [];
      }
    };

    const [steps, calories, workouts, sleep, weight, restingHr, hr] = await Promise.all([
      safeQuery(SampleNames.STEP_COUNT),
      safeQuery(SampleNames.ACTIVE_ENERGY_BURNED),
      safeQuery(SampleNames.WORKOUT_TYPE),
      safeQuery(SampleNames.SLEEP_ANALYSIS),
      safeQuery(SampleNames.WEIGHT),
      safeQuery(SampleNames.RESTING_HEART_RATE),
      safeQuery(SampleNames.HEART_RATE),
    ]);

    const totalSteps = Math.round(sumValues(steps));
    const totalCalories = Math.round(sumValues(calories));

    // Sleep: count "asleep" minutes
    const sleepMinutes = Math.round(
      (sleep || [])
        .filter((s: any) => /asleep/i.test(s?.sleepState ?? ""))
        .reduce((acc: number, s: any) => acc + (Number(s?.duration) || 0) / 60, 0)
    );

    // Workouts
    const workoutCount = workouts.length;
    const workoutMinutes = Math.round(
      (workouts || []).reduce((acc: number, w: any) => acc + (Number(w?.duration) || 0) / 60, 0)
    );

    // Weight: last reading of the day, kg
    const lastWeight = weight.length ? Number(weight[weight.length - 1]?.value) : null;

    // HR
    const restingValues = (restingHr || []).map((r: any) => Number(r?.value)).filter((v) => v > 0);
    const restingAvg = restingValues.length
      ? Math.round(restingValues.reduce((a, b) => a + b, 0) / restingValues.length)
      : null;

    const workoutHrValues = (hr || []).map((r: any) => Number(r?.value)).filter((v) => v > 0);
    const workoutHrAvg = workoutHrValues.length
      ? Math.round(workoutHrValues.reduce((a, b) => a + b, 0) / workoutHrValues.length)
      : null;

    return {
      log_date: ymd(date),
      steps: totalSteps,
      active_calories: totalCalories,
      resting_heart_rate: restingAvg,
      avg_workout_heart_rate: workoutHrAvg,
      workout_count: workoutCount,
      workout_duration_minutes: workoutMinutes,
      sleep_minutes: sleepMinutes,
      weight_kg: lastWeight,
      raw_workouts: workouts.map((w: any) => ({
        name: w?.workoutActivityName,
        duration_min: Math.round((Number(w?.duration) || 0) / 60),
        calories: Number(w?.totalEnergyBurned) || 0,
        startDate: w?.startDate,
      })),
    };
  }, []);

  const sync = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!available || !user) return;
      if (syncing) return;
      setSyncing(true);
      setError(null);
      try {
        // Pull last 7 days to keep things fresh
        const today = new Date();
        const days: Date[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          days.push(d);
        }
        const summaries = await Promise.all(days.map((d) => fetchDayData(d)));

        const rows = summaries.map((s) => ({
          user_id: user.id,
          log_date: s.log_date,
          source: "apple_health",
          steps: s.steps,
          active_calories: s.active_calories,
          resting_heart_rate: s.resting_heart_rate,
          avg_workout_heart_rate: s.avg_workout_heart_rate,
          workout_count: s.workout_count,
          workout_duration_minutes: s.workout_duration_minutes,
          sleep_minutes: s.sleep_minutes,
          weight_kg: s.weight_kg,
          raw_workouts: s.raw_workouts,
          synced_at: new Date().toISOString(),
        }));

        const { error: upsertErr } = await (supabase as any)
          .from("health_data_logs")
          .upsert(rows, { onConflict: "user_id,log_date,source" });

        if (upsertErr) throw upsertErr;

        const now = new Date().toISOString();
        await (supabase as any)
          .from("health_connection_status")
          .upsert(
            {
              user_id: user.id,
              apple_health_connected: true,
              last_sync_at: now,
              last_sync_error: null,
              permissions_granted: READ_PERMISSIONS,
            },
            { onConflict: "user_id" }
          );

        // Mirror today's steps into the legacy step_logs table so the rest of
        // the app (streaks, dashboards) keeps working unchanged.
        const todayRow = summaries[summaries.length - 1];
        if (todayRow && todayRow.steps > 0) {
          await (supabase as any)
            .from("step_logs")
            .upsert(
              {
                user_id: user.id,
                log_date: todayRow.log_date,
                steps: todayRow.steps,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id,log_date" }
            );
        }

        setConnected(true);
        setLastSyncAt(now);
        syncedThisSessionRef.current = true;
      } catch (e: any) {
        console.error("[AppleHealth] sync failed", e);
        setError(e?.message ?? "Sync failed.");
        await (supabase as any)
          .from("health_connection_status")
          .upsert(
            {
              user_id: user.id,
              last_sync_error: e?.message ?? "Sync failed",
            },
            { onConflict: "user_id" }
          );
      } finally {
        setSyncing(false);
      }
    },
    [available, user, syncing, fetchDayData]
  );

  const connect = useCallback(async () => {
    const ok = await requestPermissions();
    if (ok) {
      await sync();
    }
  }, [requestPermissions, sync]);

  // Auto-sync on app open (once per session, only if previously connected)
  useEffect(() => {
    if (!available || !user || !connected) return;
    if (syncedThisSessionRef.current) return;
    sync({ silent: true });
  }, [available, user, connected, sync]);

  // Re-sync every time the app returns to the foreground so steps/calories
  // stay current without the user pressing refresh.
  useEffect(() => {
    if (!available || !user || !connected) return;
    let cleanup: (() => void) | null = null;
    (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) sync({ silent: true });
        });
        cleanup = () => handle.remove();
      } catch (e) {
        console.warn("[AppleHealth] could not attach appStateChange listener", e);
      }
    })();
    return () => {
      if (cleanup) cleanup();
    };
  }, [available, user, connected, sync]);

  return {
    available,
    connected,
    syncing,
    lastSyncAt,
    error,
    connect,
    sync,
  };
};
