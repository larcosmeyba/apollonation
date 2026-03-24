import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Moon, Droplets, Activity, Flame, Save, Loader2 } from "lucide-react";
import { format, subDays } from "date-fns";

const MUSCLE_GROUPS = ["Chest", "Back", "Shoulders", "Legs", "Arms", "Core", "Full Body"];

const DashboardRecovery = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [saving, setSaving] = useState(false);

  const { data: log, isLoading } = useQuery({
    queryKey: ["recovery-log", user?.id, selectedDate],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await (supabase as any)
        .from("recovery_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("log_date", selectedDate)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const [sleep, setSleep] = useState<number | null>(null);
  const [hydration, setHydration] = useState<number | null>(null);
  const [mobility, setMobility] = useState<number | null>(null);
  const [soreness, setSoreness] = useState<number>(3);
  const [sorenessAreas, setSorenessAreas] = useState<string[]>([]);

  // Sync form with loaded data
  const isLoaded = !isLoading;
  const effectiveSleep = sleep ?? log?.sleep_hours ?? null;
  const effectiveHydration = hydration ?? log?.hydration_liters ?? null;
  const effectiveMobility = mobility ?? log?.mobility_minutes ?? null;
  const effectiveSoreness = log ? (soreness !== 3 ? soreness : log.soreness_rating || 3) : soreness;
  const effectiveAreas = sorenessAreas.length > 0 ? sorenessAreas : (log?.soreness_areas as string[] || []);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        log_date: selectedDate,
        sleep_hours: effectiveSleep,
        hydration_liters: effectiveHydration,
        mobility_minutes: effectiveMobility,
        soreness_rating: effectiveSoreness,
        soreness_areas: effectiveAreas,
        updated_at: new Date().toISOString(),
      };

      if (log) {
        const { error } = await (supabase as any).from("recovery_logs").update(payload).eq("id", log.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("recovery_logs").insert(payload);
        if (error) throw error;
      }

      toast({ title: "Recovery logged" });
      queryClient.invalidateQueries({ queryKey: ["recovery-log"] });
      queryClient.invalidateQueries({ queryKey: ["recovery-week"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Weekly overview
  const { data: weekLogs = [] } = useQuery({
    queryKey: ["recovery-week", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const sevenDaysAgo = format(subDays(new Date(), 6), "yyyy-MM-dd");
      const { data } = await (supabase as any)
        .from("recovery_logs")
        .select("log_date, sleep_hours, soreness_rating")
        .eq("user_id", user.id)
        .gte("log_date", sevenDaysAgo)
        .order("log_date");
      return data || [];
    },
    enabled: !!user,
  });

  const avgSleep = weekLogs.length ? (weekLogs.reduce((s: number, l: any) => s + (l.sleep_hours || 0), 0) / weekLogs.length).toFixed(1) : "—";
  const avgSoreness = weekLogs.length ? (weekLogs.reduce((s: number, l: any) => s + (l.soreness_rating || 0), 0) / weekLogs.length).toFixed(1) : "—";

  const toggleArea = (area: string) => {
    setSorenessAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const sorenessLabels = ["None", "Mild", "Moderate", "High", "Severe"];

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="font-heading text-2xl tracking-wide">Recovery</h1>
          <p className="text-xs text-muted-foreground">Track sleep, hydration, mobility & soreness</p>
        </div>

        {/* Date selector */}
        <div className="flex items-center gap-2">
          <Label className="text-xs">Date:</Label>
          <Input type="date" value={selectedDate} onChange={(e) => {
            setSelectedDate(e.target.value);
            setSleep(null); setHydration(null); setMobility(null); setSoreness(3); setSorenessAreas([]);
          }} className="w-auto" />
        </div>

        {/* Weekly overview */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[10px] text-primary uppercase tracking-widest mb-3">7-Day Overview</p>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <Moon className="w-5 h-5 text-indigo-400 mx-auto mb-1" />
              <p className="font-heading text-lg">{avgSleep}</p>
              <p className="text-[9px] text-muted-foreground">Avg Sleep (hrs)</p>
            </div>
            <div className="text-center">
              <Flame className="w-5 h-5 text-orange-400 mx-auto mb-1" />
              <p className="font-heading text-lg">{avgSoreness}</p>
              <p className="text-[9px] text-muted-foreground">Avg Soreness</p>
            </div>
            <div className="text-center">
              <Activity className="w-5 h-5 text-green-400 mx-auto mb-1" />
              <p className="font-heading text-lg">{weekLogs.length}</p>
              <p className="text-[9px] text-muted-foreground">Days Logged</p>
            </div>
          </div>
        </div>

        {/* Log form */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-6">
          <p className="text-[10px] text-primary uppercase tracking-widest">
            {format(new Date(selectedDate + "T12:00:00"), "EEEE, MMMM d")}
          </p>

          {/* Sleep */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-indigo-400" />
              <Label className="text-sm">Sleep Hours</Label>
            </div>
            <Input
              type="number"
              step="0.5"
              min="0"
              max="24"
              placeholder="7.5"
              value={effectiveSleep ?? ""}
              onChange={(e) => setSleep(e.target.value ? parseFloat(e.target.value) : null)}
            />
          </div>

          {/* Hydration */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-cyan-400" />
              <Label className="text-sm">Water Intake (liters)</Label>
            </div>
            <Input
              type="number"
              step="0.25"
              min="0"
              max="10"
              placeholder="3.0"
              value={effectiveHydration ?? ""}
              onChange={(e) => setHydration(e.target.value ? parseFloat(e.target.value) : null)}
            />
          </div>

          {/* Mobility */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-400" />
              <Label className="text-sm">Mobility Work (minutes)</Label>
            </div>
            <Input
              type="number"
              min="0"
              max="120"
              placeholder="15"
              value={effectiveMobility ?? ""}
              onChange={(e) => setMobility(e.target.value ? parseInt(e.target.value) : null)}
            />
          </div>

          {/* Soreness */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <Label className="text-sm">Muscle Soreness</Label>
            </div>
            <Slider
              value={[effectiveSoreness]}
              onValueChange={([v]) => setSoreness(v)}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-[9px] text-muted-foreground">
              {sorenessLabels.map((l) => (
                <span key={l}>{l}</span>
              ))}
            </div>
          </div>

          {/* Sore areas */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Sore Areas</Label>
            <div className="flex flex-wrap gap-2">
              {MUSCLE_GROUPS.map((area) => (
                <button
                  key={area}
                  type="button"
                  onClick={() => toggleArea(area)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                    effectiveAreas.includes(area)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-border/80"
                  }`}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>

          <Button variant="apollo" className="w-full" disabled={saving} onClick={handleSave}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {log ? "Update Recovery Log" : "Save Recovery Log"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardRecovery;
