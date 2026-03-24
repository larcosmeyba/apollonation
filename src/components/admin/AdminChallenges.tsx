import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trophy, Users, Flame, Trash2, Eye } from "lucide-react";

const AdminChallenges = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", duration_days: "30", category: "general" });

  const { data: challenges = [] } = useQuery({
    queryKey: ["admin-challenges"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("challenges").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: enrollmentCounts = {} } = useQuery({
    queryKey: ["admin-challenge-enrollment-counts"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("challenge_enrollments").select("challenge_id");
      const counts: Record<string, number> = {};
      (data || []).forEach((e: any) => { counts[e.challenge_id] = (counts[e.challenge_id] || 0) + 1; });
      return counts;
    },
  });

  // Enrollments for selected challenge
  const { data: selectedEnrollments = [] } = useQuery({
    queryKey: ["admin-challenge-enrollments", selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      const { data } = await (supabase as any)
        .from("challenge_enrollments")
        .select("*, profiles!challenge_enrollments_user_id_fkey(display_name)")
        .eq("challenge_id", selectedId);
      return data || [];
    },
    enabled: !!selectedId,
  });

  const { data: selectedCheckins = [] } = useQuery({
    queryKey: ["admin-challenge-checkins", selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      const { data } = await (supabase as any)
        .from("challenge_checkins")
        .select("*")
        .eq("challenge_id", selectedId)
        .order("checkin_date", { ascending: false })
        .limit(100);
      return data || [];
    },
    enabled: !!selectedId,
  });

  const createChallenge = async () => {
    if (!form.title) { toast({ title: "Title required", variant: "destructive" }); return; }
    const { error } = await (supabase as any).from("challenges").insert({
      title: form.title,
      description: form.description || null,
      duration_days: parseInt(form.duration_days) || 30,
      category: form.category,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Challenge created!" });
    setDialogOpen(false);
    setForm({ title: "", description: "", duration_days: "30", category: "general" });
    queryClient.invalidateQueries({ queryKey: ["admin-challenges"] });
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    await (supabase as any).from("challenges").update({ is_active: !currentActive }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-challenges"] });
  };

  const deleteChallenge = async (id: string) => {
    await (supabase as any).from("challenges").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-challenges"] });
    toast({ title: "Challenge deleted" });
  };

  if (selectedId) {
    const challenge = challenges.find((c: any) => c.id === selectedId);
    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedId(null)} className="text-sm text-muted-foreground hover:text-foreground">← Back to Challenges</button>
        <h2 className="font-heading text-xl">{challenge?.title}</h2>

        <div className="grid grid-cols-3 gap-4">
          <div className="card-apollo p-4 text-center">
            <Users className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="font-heading text-2xl">{selectedEnrollments.length}</p>
            <p className="text-xs text-muted-foreground">Enrolled</p>
          </div>
          <div className="card-apollo p-4 text-center">
            <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
            <p className="font-heading text-2xl">{selectedCheckins.length}</p>
            <p className="text-xs text-muted-foreground">Total Check-ins</p>
          </div>
          <div className="card-apollo p-4 text-center">
            <Trophy className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
            <p className="font-heading text-2xl">{selectedEnrollments.filter((e: any) => e.status === "completed").length}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
        </div>

        <div className="card-apollo p-5">
          <h3 className="font-heading text-sm uppercase tracking-wider mb-3">Enrolled Members</h3>
          {selectedEnrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No enrollments yet.</p>
          ) : (
            <div className="space-y-2">
              {selectedEnrollments.map((e: any) => {
                const userCheckins = selectedCheckins.filter((c: any) => c.user_id === e.user_id);
                return (
                  <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50">
                    <div>
                      <p className="font-medium text-sm">{e.profiles?.display_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">Enrolled {new Date(e.enrolled_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{userCheckins.length} check-ins</Badge>
                      <Badge variant={e.status === "active" ? "default" : "secondary"}>{e.status}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl">Challenges</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="apollo" size="sm"><Plus className="w-4 h-4 mr-1" /> New Challenge</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Challenge</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Apollo 30 Day Shred" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Transform your body in 30 days..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Duration (days)</Label><Input type="number" value={form.duration_days} onChange={(e) => setForm(p => ({ ...p, duration_days: e.target.value }))} /></div>
                <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))} placeholder="shred, physique, cut" /></div>
              </div>
              <Button variant="apollo" className="w-full" onClick={createChallenge}>Create Challenge</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {challenges.length === 0 ? (
        <div className="text-center py-12">
          <Trophy className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-muted-foreground">No challenges yet. Create your first one!</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {challenges.map((c: any) => (
            <div key={c.id} className="card-apollo flex items-center justify-between p-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-sm">{c.title}</h3>
                  {!c.is_active && <Badge variant="secondary">Inactive</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{c.duration_days} days · {c.category} · {enrollmentCounts[c.id] || 0} enrolled</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c.id, c.is_active)} />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedId(c.id)}>
                  <Eye className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteChallenge(c.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminChallenges;
