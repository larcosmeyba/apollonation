import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Footprints, Flame, Moon, Activity, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface Props {
  clientUserId: string;
}

const ClientHealthData = ({ clientUserId }: Props) => {
  const { data: status } = useQuery({
    queryKey: ["client-health-status", clientUserId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("health_connection_status")
        .select("apple_health_connected, last_sync_at")
        .eq("user_id", clientUserId)
        .maybeSingle();
      return data;
    },
  });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["client-health-logs", clientUserId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("health_data_logs")
        .select("*")
        .eq("user_id", clientUserId)
        .eq("source", "apple_health")
        .order("log_date", { ascending: false })
        .limit(14);
      return data ?? [];
    },
  });

  if (!status?.apple_health_connected) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm font-bold">Apple Health not connected</p>
        <p className="text-xs text-muted-foreground mt-1">
          This client hasn't connected Apple Health on their iPhone yet.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground p-6">Loading health data…</div>;
  }

  const today = logs[0];
  const avg = (key: string) => {
    const vals = logs.map((l: any) => l[key]).filter((v: any) => v != null && v > 0);
    if (!vals.length) return null;
    return Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-sm">Apple Health (last 14 days)</h3>
        </div>
        {status?.last_sync_at && (
          <span className="text-[11px] text-muted-foreground">
            Synced {format(new Date(status.last_sync_at), "MMM d, h:mm a")}
          </span>
        )}
      </div>

      {today && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Stat icon={<Footprints className="w-4 h-4 text-primary" />} label="Today steps" value={(today.steps ?? 0).toLocaleString()} />
          <Stat icon={<Flame className="w-4 h-4 text-orange-400" />} label="Today cal" value={`${today.active_calories ?? 0}`} />
          <Stat icon={<Heart className="w-4 h-4 text-red-400" />} label="Resting HR" value={today.resting_heart_rate ? `${today.resting_heart_rate} bpm` : "—"} />
          <Stat icon={<Moon className="w-4 h-4 text-blue-400" />} label="Sleep" value={today.sleep_minutes ? `${(today.sleep_minutes / 60).toFixed(1)} h` : "—"} />
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Stat icon={<Footprints className="w-4 h-4 text-muted-foreground" />} label="Avg steps" value={(avg("steps") ?? 0).toLocaleString()} />
        <Stat icon={<Flame className="w-4 h-4 text-muted-foreground" />} label="Avg cal" value={`${avg("active_calories") ?? 0}`} />
        <Stat icon={<Heart className="w-4 h-4 text-muted-foreground" />} label="Avg rest HR" value={avg("resting_heart_rate") ? `${avg("resting_heart_rate")} bpm` : "—"} />
        <Stat icon={<Activity className="w-4 h-4 text-muted-foreground" />} label="Workouts" value={`${logs.reduce((a: number, l: any) => a + (l.workout_count ?? 0), 0)}`} />
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/30 text-muted-foreground">
            <tr>
              <th className="text-left p-2 font-bold">Date</th>
              <th className="text-right p-2 font-bold">Steps</th>
              <th className="text-right p-2 font-bold">Cal</th>
              <th className="text-right p-2 font-bold">Rest HR</th>
              <th className="text-right p-2 font-bold">Sleep</th>
              <th className="text-right p-2 font-bold">Workouts</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l: any) => (
              <tr key={l.id} className="border-t border-border">
                <td className="p-2">{format(new Date(l.log_date + "T00:00:00"), "MMM d")}</td>
                <td className="text-right p-2">{(l.steps ?? 0).toLocaleString()}</td>
                <td className="text-right p-2">{l.active_calories ?? 0}</td>
                <td className="text-right p-2">{l.resting_heart_rate ?? "—"}</td>
                <td className="text-right p-2">{l.sleep_minutes ? (l.sleep_minutes / 60).toFixed(1) + "h" : "—"}</td>
                <td className="text-right p-2">{l.workout_count ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Stat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="rounded-lg bg-muted/30 p-2.5">
    <div className="flex items-center gap-1.5 mb-1">
      {icon}
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
    <p className="font-bold text-sm">{value}</p>
  </div>
);

export default ClientHealthData;
