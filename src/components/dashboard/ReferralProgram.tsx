import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Copy, Check, Users, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ReferralProgram = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: referralCode } = useQuery({
    queryKey: ["my-referral-code", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("referral_codes")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ["my-referrals", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("referral_tracking")
        .select("*")
        .eq("referrer_user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const copyCode = () => {
    if (!referralCode) return;
    const shareUrl = `${window.location.origin}/auth?ref=${referralCode.code}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast({ title: "Link copied!", description: "Share it with friends to earn rewards." });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareCode = async () => {
    if (!referralCode) return;
    const shareUrl = `${window.location.origin}/auth?ref=${referralCode.code}`;
    if (navigator.share) {
      await navigator.share({
        title: "Join Apollo Reborn",
        text: `Use my referral code ${referralCode.code} to get ${referralCode.discount_percent}% off!`,
        url: shareUrl,
      });
    } else {
      copyCode();
    }
  };

  const completedReferrals = referrals.filter((r: any) => r.status === "completed").length;
  const pendingReferrals = referrals.filter((r: any) => r.status === "pending").length;

  if (!referralCode) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6 text-center">
          <Gift className="w-10 h-10 text-primary/40 mx-auto mb-3" />
          <p className="font-heading text-sm mb-1">Referral Program</p>
          <p className="text-xs text-muted-foreground">
            Your referral code is being set up. Check back soon!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border overflow-hidden">
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
            <Gift className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-heading text-sm">Refer & Earn</p>
            <p className="text-[10px] text-muted-foreground">
              Share your code — friends get {referralCode.discount_percent}% off
            </p>
          </div>
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Code display */}
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-muted/50 border border-border rounded-lg px-4 py-2.5 text-center">
            <p className="font-heading text-lg tracking-widest text-primary">{referralCode.code}</p>
          </div>
          <Button variant="apollo-outline" size="sm" className="h-10" onClick={copyCode}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
          <Button variant="apollo" size="sm" className="h-10" onClick={shareCode}>
            <Share2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-lg font-heading text-primary">{referralCode.times_used}</p>
            <p className="text-[10px] text-muted-foreground">Total Uses</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-lg font-heading text-green-400">{completedReferrals}</p>
            <p className="text-[10px] text-muted-foreground">Completed</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-lg font-heading text-orange-400">{pendingReferrals}</p>
            <p className="text-[10px] text-muted-foreground">Pending</p>
          </div>
        </div>

        {referrals.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Recent Referrals</p>
            {referrals.slice(0, 5).map((r: any) => (
              <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/20 border border-border/50">
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs">Referral</span>
                </div>
                <span className={`text-[10px] font-medium ${r.status === "completed" ? "text-green-400" : "text-orange-400"}`}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReferralProgram;
