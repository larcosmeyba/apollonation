import { Footprints, Plus, Minus } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const STEP_GOAL = 10000;

const DashboardStepTracker = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [steps, setSteps] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [showInput, setShowInput] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!user) return;
    (supabase as any)
      .from("step_logs")
      .select("steps")
      .eq("user_id", user.id)
      .eq("log_date", todayStr)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) setSteps(data.steps);
      });
  }, [user, todayStr]);

  const saveSteps = async (newSteps: number) => {
    if (!user) return;
    setLoading(true);
    const clamped = Math.max(0, newSteps);
    const { error } = await (supabase as any)
      .from("step_logs")
      .upsert(
        { user_id: user.id, log_date: todayStr, steps: clamped, updated_at: new Date().toISOString() },
        { onConflict: "user_id,log_date" }
      );
    if (error) {
      toast({ title: "Error", description: "Could not save steps.", variant: "destructive" });
    } else {
      setSteps(clamped);
    }
    setLoading(false);
  };

  const handleAdd = () => {
    const val = parseInt(inputValue);
    if (!isNaN(val) && val > 0) {
      saveSteps(steps + val);
      setInputValue("");
      setShowInput(false);
    }
  };

  const pct = Math.min(100, Math.round((steps / STEP_GOAL) * 100));

  return (
    <div className="card-apollo p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-sm">Steps Today</h2>
          <p className="text-xl font-bold text-primary">{steps.toLocaleString()}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Footprints className="w-5 h-5 text-primary" />
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">{pct}% of {STEP_GOAL.toLocaleString()} goal</p>
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-1.5 mt-2">
        <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => saveSteps(steps + 1000)} disabled={loading}>
          +1k
        </Button>
        <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => saveSteps(steps + 2500)} disabled={loading}>
          +2.5k
        </Button>
        <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => setShowInput(!showInput)} disabled={loading}>
          <Plus className="w-3 h-3" />
        </Button>
      </div>

      {showInput && (
        <div className="flex items-center gap-2 mt-2">
          <Input
            type="number"
            placeholder="Steps"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="h-7 text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button size="sm" className="h-7 text-xs" onClick={handleAdd} disabled={loading}>
            Add
          </Button>
        </div>
      )}
    </div>
  );
};

export default DashboardStepTracker;
