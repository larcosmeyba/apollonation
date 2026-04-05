import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift, Plus, Trash2, Users, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const AdminReferrals = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: codes = [] } = useQuery({
    queryKey: ["admin-referral-codes"],
    queryFn: async () => {
      const { data } = await supabase.from("referral_codes").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: tracking = [] } = useQuery({
    queryKey: ["admin-referral-tracking"],
    queryFn: async () => {
      const { data } = await supabase.from("referral_tracking").select("*").order("created_at", { ascending: false }).limit(100);
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-profiles-ref"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, display_name");
      return data || [];
    },
  });

  const profileMap = Object.fromEntries(profiles.map((p: any) => [p.user_id, p.display_name || "Unknown"]));

  const { data: clients = [] } = useQuery({
    queryKey: ["admin-clients-ref"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, display_name").order("display_name");
      return data || [];
    },
  });

  const [newCode, setNewCode] = useState("");
  const [newDiscount, setNewDiscount] = useState("10");
  const [newUserId, setNewUserId] = useState("");

  const createCode = useMutation({
    mutationFn: async () => {
      if (!newCode || !newUserId) throw new Error("Code and user required");
      const { error } = await supabase.from("referral_codes").insert({
        code: newCode.toUpperCase(),
        user_id: newUserId,
        discount_percent: parseInt(newDiscount) || 10,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Referral code created!" });
      setNewCode("");
      setNewDiscount("10");
      setNewUserId("");
      queryClient.invalidateQueries({ queryKey: ["admin-referral-codes"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteCode = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("referral_codes").delete().eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-referral-codes"] }),
  });

  const copyLink = (code: string, id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/auth?ref=${code}`);
    setCopiedId(id);
    toast({ title: "Link copied!" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const totalReferrals = tracking.length;
  const completedReferrals = tracking.filter((t: any) => t.status === "completed").length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl mb-1">Referral Program</h2>
        <p className="text-sm text-muted-foreground">Manage referral codes and track sign-ups</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-heading text-primary">{codes.length}</p>
            <p className="text-xs text-muted-foreground">Active Codes</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-heading text-green-400">{completedReferrals}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-heading text-orange-400">{totalReferrals}</p>
            <p className="text-xs text-muted-foreground">Total Referrals</p>
          </CardContent>
        </Card>
      </div>

      {/* Create Code */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm font-heading flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" /> Create Referral Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Code</label>
              <Input placeholder="APOLLO10" value={newCode} onChange={(e) => setNewCode(e.target.value)} className="bg-muted border-border uppercase" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Discount %</label>
              <Input type="number" value={newDiscount} onChange={(e) => setNewDiscount(e.target.value)} className="bg-muted border-border" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Assign To</label>
              <select
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-muted px-3 text-sm"
              >
                <option value="">Select client</option>
                {clients.map((c: any) => (
                  <option key={c.user_id} value={c.user_id}>{c.display_name || "Unknown"}</option>
                ))}
              </select>
            </div>
          </div>
          <Button variant="apollo" size="sm" onClick={() => createCode.mutate()} disabled={createCode.isPending || !newCode || !newUserId}>
            <Gift className="w-4 h-4 mr-2" /> Create Code
          </Button>
        </CardContent>
      </Card>

      {/* Existing Codes */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm font-heading">Referral Codes ({codes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {codes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No referral codes yet</p>
          ) : (
            <div className="space-y-2">
              {codes.map((code: any) => (
                <div key={code.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/50">
                  <Gift className="w-4 h-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-heading text-sm tracking-wider text-primary">{code.code}</span>
                      <span className="text-[10px] text-muted-foreground">({code.discount_percent}% off)</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {profileMap[code.user_id] || "Unknown"} · {code.times_used} uses · {format(new Date(code.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <button onClick={() => copyLink(code.code, code.id)} className="p-1.5 rounded hover:bg-muted">
                    {copiedId === code.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                  <button onClick={() => deleteCode.mutate(code.id)} className="p-1.5 rounded hover:bg-muted">
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Referral Tracking */}
      {tracking.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-heading">Referral Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {tracking.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50">
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs">
                      {profileMap[t.referrer_user_id] || "Unknown"} → {profileMap[t.referred_user_id] || "New user"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      t.status === "completed" ? "bg-green-500/15 text-green-400" : "bg-orange-500/15 text-orange-400"
                    }`}>
                      {t.status}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(t.created_at), "MMM d")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminReferrals;
