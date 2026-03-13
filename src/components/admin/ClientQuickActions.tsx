import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Send, Loader2, Plus, Flame, Dumbbell, StickyNote } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Props {
  userId: string;
  clientName: string;
  onRefresh: () => void;
}

const ClientQuickActions = ({ userId, clientName, onRefresh }: Props) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [aiCommand, setAiCommand] = useState("");
  const [quickAction, setQuickAction] = useState<"calories" | "note" | null>(null);
  const [caloriesValue, setCaloriesValue] = useState("");
  const [noteValue, setNoteValue] = useState("");

  // AI Command
  const aiMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("coach-ai-command", {
        body: { command: aiCommand, clientUserId: userId, clientName },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "✅ Command applied", description: data.summary });
      setAiCommand("");
      onRefresh();
      queryClient.invalidateQueries({ queryKey: ["admin-client-nutrition-plans", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin-client-training-plans", userId] });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Quick calorie update
  const caloriesMutation = useMutation({
    mutationFn: async () => {
      const { data: plan } = await supabase
        .from("nutrition_plans")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();
      if (!plan) throw new Error("No active nutrition plan found");
      const { error } = await supabase
        .from("nutrition_plans")
        .update({ daily_calories: parseInt(caloriesValue) })
        .eq("id", plan.id);
      if (error) throw error;
      // Notify client
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("messages").insert({
          sender_id: user.id,
          recipient_id: userId,
          content: `📊 Your daily calorie target has been updated to ${caloriesValue} kcal. Check your nutrition plan for details!`,
        });
      }
    },
    onSuccess: () => {
      toast({ title: "Calories updated & client notified" });
      setQuickAction(null);
      setCaloriesValue("");
      onRefresh();
      queryClient.invalidateQueries({ queryKey: ["admin-client-nutrition-plans", userId] });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Quick note
  const noteMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("client_notes").insert({
        client_user_id: userId,
        admin_user_id: user.id,
        content: noteValue,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Note added" });
      setQuickAction(null);
      setNoteValue("");
      queryClient.invalidateQueries({ queryKey: ["client-notes", userId] });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-3">
      {/* AI Command Bar */}
      <div className="card-apollo p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-apollo-gold font-heading">
          <Sparkles className="w-4 h-4" />
          AI Coach Command
        </div>
        <div className="flex gap-2">
          <Input
            value={aiCommand}
            onChange={(e) => setAiCommand(e.target.value)}
            placeholder={`e.g. "Increase ${clientName}'s calories to 2,200 and add a glute workout"`}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && aiCommand.trim() && !aiMutation.isPending) aiMutation.mutate();
            }}
          />
          <Button
            variant="apollo"
            size="sm"
            onClick={() => aiMutation.mutate()}
            disabled={!aiCommand.trim() || aiMutation.isPending}
            className="gap-1 shrink-0"
          >
            {aiMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Apply
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Type natural language instructions. The AI will parse, apply changes, and notify the client automatically.
        </p>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setQuickAction("calories")}>
          <Flame className="w-3.5 h-3.5 text-orange-400" /> Adjust Calories
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setQuickAction("note")}>
          <StickyNote className="w-3.5 h-3.5 text-yellow-400" /> Add Note
        </Button>
      </div>

      {/* Quick Calories Dialog */}
      <Dialog open={quickAction === "calories"} onOpenChange={(open) => !open && setQuickAction(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adjust Daily Calories</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>New Daily Calories (kcal)</Label>
              <Input
                type="number"
                value={caloriesValue}
                onChange={(e) => setCaloriesValue(e.target.value)}
                placeholder="2200"
              />
            </div>
            <Button variant="apollo" className="w-full" onClick={() => caloriesMutation.mutate()} disabled={!caloriesValue || caloriesMutation.isPending}>
              {caloriesMutation.isPending ? "Updating..." : "Update & Notify Client"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Note Dialog */}
      <Dialog open={quickAction === "note"} onOpenChange={(open) => !open && setQuickAction(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Coach Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              placeholder="Write a note about this client..."
              rows={4}
            />
            <Button variant="apollo" className="w-full" onClick={() => noteMutation.mutate()} disabled={!noteValue.trim() || noteMutation.isPending}>
              {noteMutation.isPending ? "Saving..." : "Save Note"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientQuickActions;
