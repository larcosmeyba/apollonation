import { useEffect, useState, useCallback, useRef } from "react";
import { isNative } from "@/lib/platform";
import { Capacitor } from "@capacitor/core";
import { Health, type HealthPermission } from "capacitor-health";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Permissions we ask Apple Health for. capacitor-health@8 supports these on iOS.
// Note: this plugin does NOT expose Sleep, Weight, or Resting Heart Rate,
// so those fields will sync as null (UI shows "—"). The previous plugin
// claimed to expose them but silently returned empty arrays on Capacitor 8.
const READ_PERMISSIONS: HealthPermission[] = [
  "READ_STEPS",
  "READ_WORKOUTS",
  "READ_ACTIVE_CALORIES",
  "READ_DISTANCE",
  "READ_HEART_RATE",
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

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const endOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

export const useAppleHealth = () => {
  const { user } = useAuth();
  const [available] = useState<boolean>(isAppleHealthAvailable());
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<HealthSyncDiagnostics>({
    stepSamplesToday: 0,
    calorieSamplesToday: 0,
    sleepSamplesToday: 0,
    workoutSamplesToday: 0,
    lastMessage: null,
  });
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
      const avail = await Health.isHealthAvailable();
      if (!avail?.available) {
        setError("Apple Health is not available on this device.");
        return false;
      }
      await Health.requestHealthPermissions({ permissions: READ_PERMISSIONS });
      setError(null);
      return true;
    } catch (e: any) {
      console.error("[AppleHealth] permission error", e);
      setError(e?.message ?? "Could not access Apple Health.");
      return false;
    }
  }, [available]);

  const sumAggregated = async (
    dataType: "steps" | "active-calories",
    start: Date,
    end: Date,
  ): Promise<{ total: number; bucketCount: number }> => {
    try {
      const res = await Health.queryAggregated({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        dataType,
        bucket: "day",
      });
      const buckets = res?.aggregatedData ?? [];
      const total = buckets.reduce((acc, b) => acc + (Number(b?.value) || 0), 0);
      return { total, bucketCount: buckets.length };
    } catch (e) {
      console.warn(`[AppleHealth] queryAggregated ${dataType} failed`, e);
      return { total: 0, bucketCount: 0 };
    }
  };

  const fetchDayData = useCallback(async (date: Date): Promise<DailyHealthSummary> => {
    const start = startOfDay(date);
    const end = endOfDay(date);
    const isToday = ymd(date) === ymd(new Date());

    // Steps + active calories via aggregated daily buckets.
    const [stepsRes, caloriesRes] = await Promise.all([
      sumAggregated("steps", start, end),
      sumAggregated("active-calories", start, end),
    ]);

    // Workouts (with embedded heart rate samples).
    let workouts: any[] = [];
    try {
      const wRes = await Health.queryWorkouts({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        includeHeartRate: true,
        includeRoute: false,
        includeSteps: false,
      });
      workouts = wRes?.workouts ?? [];
    } catch (e) {
      console.warn("[AppleHealth] queryWorkouts failed", e);
    }

    // Average workout HR across all today's workouts.
    const allHrSamples: number[] = [];
    for (const w of workouts) {
      for (const s of w?.heartRate ?? []) {
        const bpm = Number(s?.bpm);
        if (bpm > 0) allHrSamples.push(bpm);
      }
    }
    const workoutHrAvg = allHrSamples.length
      ? Math.round(allHrSamples.reduce((a, b) => a + b, 0) / allHrSamples.length)
      : null;

    // capacitor-health workout duration is in seconds.
    const workoutMinutes = Math.round(
      workouts.reduce((acc, w) => acc + (Number(w?.duration) || 0) / 60, 0),
    );

    const totalSteps = Math.round(stepsRes.total);
    const totalCalories = Math.round(caloriesRes.total);

    if (isToday) {
      setDiagnostics({
        stepSamplesToday: stepsRes.bucketCount,
        calorieSamplesToday: caloriesRes.bucketCount,
        sleepSamplesToday: 0,
        workoutSamplesToday: workouts.length,
        lastMessage:
          totalSteps > 0
            ? `Synced ${totalSteps.toLocaleString()} steps from Apple Health.`
            : "Apple Health returned 0 steps for today.",
      });
      console.info("[AppleHealth] today", {
        steps: totalSteps,
        calories: totalCalories,
        workouts: workouts.length,
        workoutMinutes,
        workoutHrAvg,
      });
    }

    return {
      log_date: ymd(date),
      steps: totalSteps,
      active_calories: totalCalories,
      // Not exposed by capacitor-health — leave null so UI shows "—".
      resting_heart_rate: null,
      avg_workout_heart_rate: workoutHrAvg,
      workout_count: workouts.length,
      workout_duration_minutes: workoutMinutes,
      sleep_minutes: 0,
      weight_kg: null,
      raw_workouts: workouts.map((w: any) => ({
        name: w?.workoutType,
        duration_min: Math.round((Number(w?.duration) || 0) / 60),
        calories: Number(w?.calories) || 0,
        distance: Number(w?.distance) || 0,
        startDate: w?.startDate,
        sourceName: w?.sourceName,
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
            { onConflict: "user_id" },
          );

        // Mirror today's Apple Health steps into the legacy step_logs table
        // so streaks and dashboards update automatically from the native source.
        const todayRow = summaries[summaries.length - 1];
        if (todayRow) {
          await (supabase as any)
            .from("step_logs")
            .upsert(
              {
                user_id: user.id,
                log_date: todayRow.log_date,
                steps: todayRow.steps,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id,log_date" },
            );
        }

        setConnected(true);
        setLastSyncAt(now);
        syncedThisSessionRef.current = true;
        if (!opts?.silent) {
          console.info("[AppleHealth] sync complete", {
            days: rows.length,
            today: todayRow,
          });
        }
      } catch (e: any) {
        console.error("[AppleHealth] sync failed", e);
        setError(e?.message ?? "Sync failed.");
        setDiagnostics((prev) => ({ ...prev, lastMessage: e?.message ?? "Sync failed." }));
        await (supabase as any)
          .from("health_connection_status")
          .upsert(
            {
              user_id: user.id,
              last_sync_error: e?.message ?? "Sync failed",
            },
            { onConflict: "user_id" },
          );
      } finally {
        setSyncing(false);
      }
    },
    [available, user, syncing, fetchDayData],
  );

  const connect = useCallback(async (): Promise<boolean> => {
    const ok = await requestPermissions();
    if (ok) {
      await sync();
      return true;
    }
    return false;
  }, [requestPermissions, sync]);

  const reconnect = useCallback(async (): Promise<boolean> => {
    if (!available || !user) return false;
    syncedThisSessionRef.current = false;
    setConnected(false);
    await (supabase as any)
      .from("health_connection_status")
      .upsert(
        {
          user_id: user.id,
          apple_health_connected: false,
          last_sync_error: null,
        },
        { onConflict: "user_id" },
      );
    return connect();
  }, [available, user, connect]);

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
    diagnostics,
    connect,
    reconnect,
    sync,
  };
};
