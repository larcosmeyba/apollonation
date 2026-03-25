import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Lightbulb, Megaphone, Target, BookOpen } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const CATEGORIES = [
  { value: "tip", label: "Training Tip", icon: Lightbulb },
  { value: "announcement", label: "Announcement", icon: Megaphone },
  { value: "reminder", label: "Phase Reminder", icon: Target },
  { value: "guidance", label: "Weekly Guidance", icon: BookOpen },
];

const AdminCoachInsights = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", category: "tip" });

  const { data: insights = [] } = useQuery({
    queryKey: ["admin-coach-insights"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coach_insights")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("coach_insights").insert({
        title: form.title,
        content: form.content,
        category: form.category,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Insight published!" });
      setForm({ title: "", content: "", category: "tip" });
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["admin-coach-insights"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("coach_insights").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-coach-insights"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coach_insights").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Insight deleted" });
      queryClient.invalidateQueries({ queryKey: ["admin-coach-insights"] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Coach Insights</h2>
          <p className="text-sm text-muted-foreground">Post tips, guidance, and updates for your clients</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" /> New Insight
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Create Insight</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input placeholder="e.g., Tip of the Week" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <Label>Content</Label>
              <Textarea placeholder="Your insight..." value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} rows={3} />
            </div>
            <Button onClick={() => createMutation.mutate()} disabled={!form.title || !form.content || createMutation.isPending}>
              Publish
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {insights.map((insight: any) => {
          const cat = CATEGORIES.find((c) => c.value === insight.category);
          const Icon = cat?.icon || Lightbulb;
          return (
            <Card key={insight.id} className={!insight.is_active ? "opacity-50" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <Icon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-primary">{cat?.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(insight.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="font-medium text-sm">{insight.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{insight.content}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Switch checked={insight.is_active} onCheckedChange={(checked) => toggleMutation.mutate({ id: insight.id, is_active: checked })} />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(insight.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {insights.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No insights yet. Create your first one above.</p>
        )}
      </div>
    </div>
  );
};

export default AdminCoachInsights;
