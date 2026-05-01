import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { DollarSign, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const FoodBudgetCard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [store, setStore] = useState("");

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  const { data: budget } = useQuery({
    queryKey: ["weekly-budget", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await (supabase as any)
        .from("client_questionnaires")
        .select("weekly_food_budget")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      return data?.weekly_food_budget ?? null;
    },
    enabled: !!user,
  });

  const { data: spendThisWeek = 0 } = useQuery({
    queryKey: ["spend-week", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data } = await (supabase as any)
        .from("food_spend_logs")
        .select("amount_spent")
        .eq("user_id", user.id)
        .gte("spend_date", format(weekStart, "yyyy-MM-dd"))
        .lte("spend_date", format(weekEnd, "yyyy-MM-dd"));
      return (data || []).reduce((sum: number, r: any) => sum + Number(r.amount_spent), 0);
    },
    enabled: !!user,
  });

  const handleLog = async () => {
    if (!user || !amount) return;
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    if (budget && spendThisWeek + value > Number(budget)) {
      const available = Math.max(0, Number(budget) - spendThisWeek);
      toast({ title: "Budget limit reached", description: `You have $${available.toFixed(2)} remaining this week.` });
      return;
    }
    const { error } = await (supabase as any).from("food_spend_logs").insert({
      user_id: user.id,
      amount_spent: value,
      store_name: store || null,
    });
    if (error) {
      toast({ title: "Couldn't log spend", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Spend logged", description: `$${value.toFixed(2)} added to this week.` });
    setAmount("");
    setStore("");
    setOpen(false);
    queryClient.invalidateQueries({ queryKey: ["spend-week", user.id] });
  };

  const visibleSpend = budget ? Math.min(spendThisWeek, Number(budget)) : spendThisWeek;
  const remaining = budget ? Math.max(0, Number(budget) - visibleSpend) : null;
  const pct = budget ? Math.min((visibleSpend / Number(budget)) * 100, 100) : 0;

  return (
    <div className="card-apollo p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Weekly Food Budget</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="apollo-outline" size="sm" className="h-7 gap-1.5 text-xs">
              <Plus className="w-3 h-3" /> Log Spend
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm bg-background border-border">
            <DialogHeader><DialogTitle className="font-heading">Log Grocery Spend</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div>
                <Label>Amount ($)</Label>
                <Input type="number" step="0.01" placeholder="42.50" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-muted border-border" />
              </div>
              <div>
                <Label>Store (optional)</Label>
                <Input placeholder="Trader Joe's" value={store} onChange={(e) => setStore(e.target.value)} className="bg-muted border-border" />
              </div>
              <Button variant="apollo" className="w-full" onClick={handleLog}>Log</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!budget ? (
        <p className="text-sm text-muted-foreground">Set a weekly food budget in your questionnaire to track grocery spending.</p>
      ) : (
        <>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-heading">${visibleSpend.toFixed(0)}</span>
            <span className="text-sm text-muted-foreground">/ ${Number(budget).toFixed(0)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-2">
            <div
              className="h-full transition-all duration-500 bg-primary"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <><TrendingDown className="w-3 h-3 text-green-500" /><span className="text-green-500">${remaining!.toFixed(0)} remaining this week</span></>
          </div>
        </>
      )}
    </div>
  );
};

export default FoodBudgetCard;
