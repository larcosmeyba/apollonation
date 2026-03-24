import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { format, subDays } from "date-fns";
import {
  Moon, Droplets, Activity, Flame, Camera, Utensils,
  TrendingUp, TrendingDown, Minus,
} from "lucide-react";

interface Props {
  userId: string;
}

/** Admin view of client recovery logs, transformation photos, nutrition streaks */
const AdminClientInsights = ({ userId }: Props) => {
  // Recovery logs (last 7 days)
  const { data: recoveryLogs = [] } = useQuery({
    queryKey: ["admin-client-recovery", userId],
    queryFn: async () => {
      const sevenDaysAgo = format(subDays(new Date(), 6), "yyyy-MM-dd");
      const { data } = await (supabase as any)
        .from("recovery_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("log_date", sevenDaysAgo)
        .order("log_date", { ascending: false });
      return data || [];
    },
  });

  // Progress photos (recent)
  const { data: photos = [] } = useQuery({
    queryKey: ["admin-client-photos", userId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("progress_photos")
        .select("photo_date, photo_type, weight_lbs, body_fat_pct")
        .eq("user_id", userId)
        .order("photo_date", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  // Nutrition streak (last 30 days)
  const { data: macroLogs = [] } = useQuery({
    queryKey: ["admin-client-macro-streak", userId],
    queryFn: async () => {
      const thirtyDaysAgo = format(subDays(new Date(), 29), "yyyy-MM-dd");
      const { data } = await (supabase as any)
        .from("macro_logs")
        .select("log_date")
        .eq("user_id", userId)
        .gte("log_date", thirtyDaysAgo);
      return data || [];
    },
  });

  // Challenge enrollments
  const { data: challengeEnrollments = [] } = useQuery({
    queryKey: ["admin-client-challenges", userId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("challenge_enrollments")
        .select("*, challenges(*)")
        .eq("user_id", userId);
      return data || [];
    },
  });

  const avgSleep = recoveryLogs.length
    ? (recoveryLogs.reduce((s: number, l: any) => s + (l.sleep_hours || 0), 0) / recoveryLogs.length).toFixed(1)
    : "—";
  const avgSoreness = recoveryLogs.length
    ? (recoveryLogs.reduce((s: number, l: any) => s + (l.soreness_rating || 0), 0) / recoveryLogs.length).toFixed(1)
    : "—";
  const avgHydration = recoveryLogs.length
    ? (recoveryLogs.reduce((s: number, l: any) => s + (l.hydration_liters || 0), 0) / recoveryLogs.length).toFixed(1)
    : "—";

  const loggedDates = new Set(macroLogs.map((l: any) => l.log_date));
  let streak = 0;
  for (let i = 0; i < 30; i++) {
    const d = format(subDays(new Date(), i), "yyyy-MM-dd");
    if (i === 0) { if (loggedDates.has(d)) streak++; continue; }
    if (loggedDates.has(d)) streak++;
    else break;
  }

  const uniquePhotoDates = [...new Set(photos.map((p: any) => p.photo_date))];

  return (
    <div className="space-y-6">
      {/* Recovery Overview */}
      <div className="card-apollo p-5 space-y-4">
        <h3 className="font-heading text-sm uppercase tracking-wider text-primary flex items-center gap-2">
          <Moon className="w-4 h-4" /> Recovery (7-Day Avg)
        </h3>
        {recoveryLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recovery data logged.</p>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <Moon className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
              <p className="font-heading text-lg">{avgSleep}h</p>
              <p className="text-[9px] text-muted-foreground">Avg Sleep</p>
            </div>
            <div className="text-center">
              <Droplets className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
              <p className="font-heading text-lg">{avgHydration}L</p>
              <p className="text-[9px] text-muted-foreground">Avg Water</p>
            </div>
            <div className="text-center">
              <Flame className="w-4 h-4 text-orange-400 mx-auto mb-1" />
              <p className="font-heading text-lg">{avgSoreness}/5</p>
              <p className="text-[9px] text-muted-foreground">Avg Soreness</p>
            </div>
            <div className="text-center">
              <Activity className="w-4 h-4 text-green-400 mx-auto mb-1" />
              <p className="font-heading text-lg">{recoveryLogs.length}</p>
              <p className="text-[9px] text-muted-foreground">Days Logged</p>
            </div>
          </div>
        )}

        {/* Recent recovery entries */}
        {recoveryLogs.length > 0 && (
          <div className="space-y-1 pt-2">
            {recoveryLogs.slice(0, 5).map((l: any) => (
              <div key={l.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/30 last:border-0">
                <span className="text-muted-foreground">{format(new Date(l.log_date + "T12:00:00"), "EEE, MMM d")}</span>
                <div className="flex items-center gap-3">
                  <span>{l.sleep_hours || "—"}h sleep</span>
                  <span>{l.hydration_liters || "—"}L</span>
                  <span>Soreness: {l.soreness_rating || "—"}/5</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Nutrition Streak */}
      <div className="card-apollo p-5 space-y-3">
        <h3 className="font-heading text-sm uppercase tracking-wider text-primary flex items-center gap-2">
          <Utensils className="w-4 h-4" /> Nutrition Compliance
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
            <p className="font-heading text-xl">{streak}</p>
            <p className="text-[9px] text-muted-foreground">Day Streak</p>
          </div>
          <div className="text-center">
            <p className="font-heading text-xl">{loggedDates.size}</p>
            <p className="text-[9px] text-muted-foreground">Days (30d)</p>
          </div>
          <div className="text-center">
            <p className="font-heading text-xl">{Math.round((loggedDates.size / 30) * 100)}%</p>
            <p className="text-[9px] text-muted-foreground">Compliance</p>
          </div>
        </div>
      </div>

      {/* Transformation Photos */}
      <div className="card-apollo p-5 space-y-3">
        <h3 className="font-heading text-sm uppercase tracking-wider text-primary flex items-center gap-2">
          <Camera className="w-4 h-4" /> Transformation
        </h3>
        {uniquePhotoDates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No progress photos uploaded.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{uniquePhotoDates.length} photo sessions</p>
            {uniquePhotoDates.slice(0, 5).map((date: string) => {
              const datePhotos = photos.filter((p: any) => p.photo_date === date);
              const weight = datePhotos.find((p: any) => p.weight_lbs)?.weight_lbs;
              const bf = datePhotos.find((p: any) => p.body_fat_pct)?.body_fat_pct;
              return (
                <div key={date} className="flex items-center justify-between text-xs py-2 border-b border-border/30 last:border-0">
                  <span>{format(new Date(date + "T12:00:00"), "MMM d, yyyy")}</span>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-[10px]">{datePhotos.length} photos</Badge>
                    {weight && <span>{weight} lbs</span>}
                    {bf && <span>{bf}% BF</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Challenges */}
      {challengeEnrollments.length > 0 && (
        <div className="card-apollo p-5 space-y-3">
          <h3 className="font-heading text-sm uppercase tracking-wider text-primary flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Challenges
          </h3>
          {challengeEnrollments.map((e: any) => (
            <div key={e.id} className="flex items-center justify-between text-sm py-2 border-b border-border/30 last:border-0">
              <span>{e.challenges?.title || "Unknown"}</span>
              <Badge variant={e.status === "active" ? "default" : "secondary"}>{e.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminClientInsights;
