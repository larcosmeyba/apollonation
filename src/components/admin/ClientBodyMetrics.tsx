import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { format, parseISO } from "date-fns";

interface BodyMetric {
  id: string;
  user_id: string;
  recorded_at: string;
  body_weight_lbs: number | null;
  body_fat_pct: number | null;
  muscle_mass_lbs: number | null;
  bone_density: number | null;
  notes: string | null;
  created_at: string;
}

const chartConfig: ChartConfig = {
  weight: { label: "Weight (lbs)", color: "hsl(0 0% 100%)" },
  bodyFat: { label: "Body Fat %", color: "hsl(0 0% 60%)" },
  muscle: { label: "Muscle Mass (lbs)", color: "hsl(210 100% 52%)" },
  bone: { label: "Bone Density", color: "hsl(0 0% 40%)" },
};

const ClientBodyMetrics = ({ userId }: { userId: string }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    recorded_at: new Date().toISOString().split("T")[0],
    body_weight_lbs: "",
    body_fat_pct: "",
    muscle_mass_lbs: "",
    bone_density: "",
    notes: "",
  });

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["body-metrics", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("body_metrics" as any)
        .select("*")
        .eq("user_id", userId)
        .order("recorded_at", { ascending: true });
      if (error) throw error;
      return (data as any[]) as BodyMetric[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("body_metrics" as any).insert({
        user_id: userId,
        created_by: user?.id,
        recorded_at: form.recorded_at,
        body_weight_lbs: form.body_weight_lbs ? parseFloat(form.body_weight_lbs) : null,
        body_fat_pct: form.body_fat_pct ? parseFloat(form.body_fat_pct) : null,
        muscle_mass_lbs: form.muscle_mass_lbs ? parseFloat(form.muscle_mass_lbs) : null,
        bone_density: form.bone_density ? parseFloat(form.bone_density) : null,
        notes: form.notes || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["body-metrics", userId] });
      toast({ title: "Measurement saved" });
      setIsOpen(false);
      setForm({ recorded_at: new Date().toISOString().split("T")[0], body_weight_lbs: "", body_fat_pct: "", muscle_mass_lbs: "", bone_density: "", notes: "" });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const chartData = metrics?.map((m) => ({
    date: format(parseISO(m.recorded_at), "MMM d"),
    weight: m.body_weight_lbs,
    bodyFat: m.body_fat_pct,
    muscle: m.muscle_mass_lbs,
    bone: m.bone_density,
  })) || [];

  const latest = metrics?.[metrics.length - 1];
  const previous = metrics && metrics.length > 1 ? metrics[metrics.length - 2] : null;

  const getDelta = (curr: number | null, prev: number | null) => {
    if (curr == null || prev == null) return null;
    return curr - prev;
  };

  const DeltaIcon = ({ delta }: { delta: number | null }) => {
    if (delta == null) return null;
    if (delta > 0) return <TrendingUp className="w-3 h-3 text-green-400" />;
    if (delta < 0) return <TrendingDown className="w-3 h-3 text-red-400" />;
    return <Minus className="w-3 h-3 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-sm uppercase tracking-wider text-apollo-gold">Body Metrics</h3>
        <Button variant="apollo" size="sm" onClick={() => setIsOpen(true)} className="gap-1">
          <Plus className="w-3.5 h-3.5" /> Add Measurement
        </Button>
      </div>

      {/* Current Stats Cards */}
      {latest && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Weight", value: latest.body_weight_lbs, unit: "lbs", delta: getDelta(latest.body_weight_lbs, previous?.body_weight_lbs ?? null) },
            { label: "Body Fat", value: latest.body_fat_pct, unit: "%", delta: getDelta(latest.body_fat_pct, previous?.body_fat_pct ?? null) },
            { label: "Muscle Mass", value: latest.muscle_mass_lbs, unit: "lbs", delta: getDelta(latest.muscle_mass_lbs, previous?.muscle_mass_lbs ?? null) },
            { label: "Bone Density", value: latest.bone_density, unit: "", delta: getDelta(latest.bone_density, previous?.bone_density ?? null) },
          ].map((stat) => (
            <div key={stat.label} className="card-apollo p-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xl font-heading text-foreground">
                  {stat.value != null ? `${stat.value}${stat.unit}` : "—"}
                </p>
                {stat.delta != null && (
                  <span className="flex items-center gap-0.5 text-xs">
                    <DeltaIcon delta={stat.delta} />
                    {Math.abs(stat.delta).toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="rounded-2xl border border-border bg-[hsl(220,15%,4%)] p-4" style={{ boxShadow: '0 0 30px rgba(255,255,255,0.08), 0 0 60px rgba(255,255,255,0.04)' }}>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="weight" stroke="var(--color-weight)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="bodyFat" stroke="var(--color-bodyFat)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="muscle" stroke="var(--color-muscle)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ChartContainer>
          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-primary inline-block rounded" /> Weight</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block rounded" style={{ background: "hsl(38 92% 50%)" }} /> Body Fat</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block rounded" style={{ background: "hsl(142 71% 45%)" }} /> Muscle</span>
          </div>
        </div>
      )}

      {/* Timeline */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
      ) : metrics?.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No measurements yet. Add the first one above.</p>
      ) : (
        <div className="space-y-2">
          {[...(metrics || [])].reverse().map((m) => (
            <div key={m.id} className="card-apollo p-3 flex items-center gap-4">
              <div className="text-xs text-muted-foreground min-w-[70px]">
                {format(parseISO(m.recorded_at), "MMM d, yyyy")}
              </div>
              <div className="flex flex-wrap gap-3 text-sm flex-1">
                {m.body_weight_lbs != null && <span><strong>{m.body_weight_lbs}</strong> lbs</span>}
                {m.body_fat_pct != null && <span><strong>{m.body_fat_pct}</strong>% BF</span>}
                {m.muscle_mass_lbs != null && <span><strong>{m.muscle_mass_lbs}</strong> lbs muscle</span>}
                {m.bone_density != null && <span>Bone: <strong>{m.bone_density}</strong></span>}
              </div>
              {m.notes && <span className="text-xs text-muted-foreground truncate max-w-[120px]">{m.notes}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Body Measurement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.recorded_at} onChange={(e) => setForm({ ...form, recorded_at: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Body Weight (lbs)</Label>
                <Input type="number" step="0.1" value={form.body_weight_lbs} onChange={(e) => setForm({ ...form, body_weight_lbs: e.target.value })} placeholder="175" />
              </div>
              <div>
                <Label>Body Fat %</Label>
                <Input type="number" step="0.1" value={form.body_fat_pct} onChange={(e) => setForm({ ...form, body_fat_pct: e.target.value })} placeholder="18.5" />
              </div>
              <div>
                <Label>Muscle Mass (lbs)</Label>
                <Input type="number" step="0.1" value={form.muscle_mass_lbs} onChange={(e) => setForm({ ...form, muscle_mass_lbs: e.target.value })} placeholder="145" />
              </div>
              <div>
                <Label>Bone Density</Label>
                <Input type="number" step="0.01" value={form.bone_density} onChange={(e) => setForm({ ...form, bone_density: e.target.value })} placeholder="1.2" />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Post-cut check-in..." rows={2} />
            </div>
            <Button variant="apollo" className="w-full" onClick={() => addMutation.mutate()} disabled={addMutation.isPending}>
              {addMutation.isPending ? "Saving..." : "Save Measurement"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientBodyMetrics;
