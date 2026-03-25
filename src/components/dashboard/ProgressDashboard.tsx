import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingDown, TrendingUp, Scale, Activity } from "lucide-react";
import { format } from "date-fns";

const ProgressDashboard = () => {
  const { user } = useAuth();

  // Get body metrics
  const { data: bodyMetrics = [] } = useQuery({
    queryKey: ["progress-body-metrics", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("body_metrics")
        .select("body_weight_lbs, body_fat_pct, muscle_mass_lbs, recorded_at")
        .eq("user_id", user.id)
        .order("recorded_at", { ascending: true })
        .limit(50);
      return data || [];
    },
    enabled: !!user,
  });

  // Get progress photos weight data
  const { data: photoWeights = [] } = useQuery({
    queryKey: ["progress-photo-weights", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("progress_photos")
        .select("weight_lbs, photo_date")
        .eq("user_id", user.id)
        .not("weight_lbs", "is", null)
        .order("photo_date", { ascending: true });
      return data || [];
    },
    enabled: !!user,
  });

  // Combine weight data
  const weightData = [
    ...bodyMetrics.filter((m: any) => m.body_weight_lbs).map((m: any) => ({
      date: format(new Date(m.recorded_at), "MMM d"),
      weight: Number(m.body_weight_lbs),
    })),
    ...photoWeights.map((p: any) => ({
      date: format(new Date(p.photo_date + "T00:00:00"), "MMM d"),
      weight: Number(p.weight_lbs),
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  // Remove duplicates by date
  const uniqueWeightData = weightData.reduce((acc: any[], item) => {
    if (!acc.find((a) => a.date === item.date)) acc.push(item);
    return acc;
  }, []);

  const bodyFatData = bodyMetrics
    .filter((m: any) => m.body_fat_pct)
    .map((m: any) => ({
      date: format(new Date(m.recorded_at), "MMM d"),
      bf: Number(m.body_fat_pct),
    }));

  const latestWeight = uniqueWeightData[uniqueWeightData.length - 1]?.weight;
  const prevWeight = uniqueWeightData.length >= 2 ? uniqueWeightData[uniqueWeightData.length - 2]?.weight : null;
  const weightDelta = latestWeight && prevWeight ? latestWeight - prevWeight : null;

  const latestBF = bodyFatData[bodyFatData.length - 1]?.bf;
  const prevBF = bodyFatData.length >= 2 ? bodyFatData[bodyFatData.length - 2]?.bf : null;
  const bfDelta = latestBF && prevBF ? latestBF - prevBF : null;

  if (uniqueWeightData.length === 0 && bodyFatData.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-primary" />
        <p className="text-[10px] text-primary uppercase tracking-[0.2em] font-medium">Progress Overview</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {latestWeight && (
          <div className="rounded-xl bg-muted/20 p-3 text-center">
            <Scale className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="font-heading text-lg">{latestWeight} lbs</p>
            {weightDelta !== null && (
              <div className={`flex items-center justify-center gap-1 text-[10px] ${weightDelta < 0 ? "text-green-400" : weightDelta > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                {weightDelta < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                {Math.abs(weightDelta).toFixed(1)} lbs
              </div>
            )}
            <p className="text-[9px] text-muted-foreground">Weight</p>
          </div>
        )}
        {latestBF && (
          <div className="rounded-xl bg-muted/20 p-3 text-center">
            <Activity className="w-4 h-4 text-blue-400 mx-auto mb-1" />
            <p className="font-heading text-lg">{latestBF}%</p>
            {bfDelta !== null && (
              <div className={`flex items-center justify-center gap-1 text-[10px] ${bfDelta < 0 ? "text-green-400" : bfDelta > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                {bfDelta < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                {Math.abs(bfDelta).toFixed(1)}%
              </div>
            )}
            <p className="text-[9px] text-muted-foreground">Body Fat</p>
          </div>
        )}
      </div>

      {/* Weight chart */}
      {uniqueWeightData.length >= 2 && (
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={uniqueWeightData}>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis domain={["auto", "auto"]} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={35} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: "hsl(var(--muted-foreground))" }}
              />
              <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default ProgressDashboard;
