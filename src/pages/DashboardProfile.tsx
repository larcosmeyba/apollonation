import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Save, LogOut, ChevronRight, Plus, Loader2, CreditCard, Settings, HelpCircle, FileText, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import ProfileAvatarUpload from "@/components/dashboard/ProfileAvatarUpload";

const DashboardProfile = () => {
  const { profile, refreshProfile, user, signOut, subscription } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [managingPortal, setManagingPortal] = useState(false);

  const [formData, setFormData] = useState({
    display_name: profile?.display_name || "",
    bio: profile?.bio || "",
    fitness_goals: profile?.fitness_goals || "",
  });

  useEffect(() => {
    const loadPhone = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("secure_contact_info")
        .select("phone_encrypted")
        .eq("user_id", user.id)
        .single();
      if (data?.phone_encrypted) setPhone(data.phone_encrypted);
    };
    loadPhone();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user) return;
    setIsLoading(true);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        display_name: formData.display_name,
        bio: formData.bio,
        fitness_goals: formData.fitness_goals,
      })
      .eq("id", profile.id);

    const { error: phoneError } = await supabase
      .from("secure_contact_info")
      .upsert({ user_id: user.id, phone_encrypted: phone || null }, { onConflict: "user_id" });

    if (profileError || phoneError) {
      toast({ title: "Error", description: profileError?.message || phoneError?.message, variant: "destructive" });
    } else {
      await refreshProfile();
      toast({ title: "Profile updated" });
    }
    setIsLoading(false);
  };

  const handleManageSubscription = async () => {
    setManagingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Could not open subscription management.", variant: "destructive" });
    } finally {
      setManagingPortal(false);
    }
  };

  const MenuLink = ({ icon: Icon, label, to, external }: { icon: any; label: string; to: string; external?: boolean }) => (
    external ? (
      <a href={to} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between py-3 border-b border-border/10 group">
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 text-foreground/25" />
          <span className="text-sm text-foreground/60 group-hover:text-foreground/80 transition-colors">{label}</span>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-foreground/15" />
      </a>
    ) : (
      <Link to={to} className="flex items-center justify-between py-3 border-b border-border/10 group">
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 text-foreground/25" />
          <span className="text-sm text-foreground/60 group-hover:text-foreground/80 transition-colors">{label}</span>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-foreground/15" />
      </Link>
    )
  );

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto space-y-4">
        {/* Profile Header */}
        <div className="rounded-xl border border-border/20 p-5">
          <div className="flex items-center gap-4">
            <ProfileAvatarUpload />
            <div>
              <h1 className="font-heading text-lg text-foreground/90">{profile?.display_name || "Member"}</h1>
              <p className="text-[10px] text-foreground/30 uppercase tracking-[0.15em]">
                {profile?.subscription_tier || "Basic"} Member
              </p>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="rounded-xl border border-border/20 p-4">
          <p className="text-[9px] text-foreground/20 uppercase tracking-[0.25em] mb-2">Account</p>
          <MenuLink icon={CreditCard} label="Membership & Billing" to="#" />
          <MenuLink icon={Settings} label="Notifications" to="/dashboard/calendar" />
          <MenuLink icon={HelpCircle} label="Help & Support" to="#" />
          <MenuLink icon={FileText} label="Terms of Service" to="/terms" />
          <MenuLink icon={Shield} label="Privacy Policy" to="/privacy" />
        </div>

        {/* Subscription */}
        <div className="rounded-xl border border-border/20 p-4">
          <p className="text-[9px] text-foreground/20 uppercase tracking-[0.25em] mb-3">Subscription</p>
          <div className="flex items-center justify-between p-3 rounded-lg bg-foreground/[0.03] border border-border/10">
            <div>
              <p className="text-sm font-heading text-foreground/70">{profile?.subscription_tier?.toUpperCase() || "BASIC"}</p>
              <p className="text-[10px] text-foreground/30">
                {profile?.subscription_tier === "elite" ? "Full access" : "On-demand workouts"}
              </p>
              {subscription?.subscribed && subscription.subscription_end && (
                <p className="text-[10px] text-foreground/25 mt-0.5">
                  Renews {new Date(subscription.subscription_end).toLocaleDateString()}
                </p>
              )}
            </div>
            <div>
              {subscription?.subscribed && !(profile as any)?.manual_subscription && (
                <Button variant="outline" size="sm" onClick={handleManageSubscription} disabled={managingPortal} className="text-xs border-border/20 text-foreground/40">
                  {managingPortal ? "Opening..." : "Manage"}
                </Button>
              )}
              {!subscription?.subscribed && (
                <Link to="/#pricing">
                  <Button variant="apollo" size="sm" className="text-xs">Upgrade</Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Edit Profile */}
        <div className="rounded-xl border border-border/20 p-4">
          <p className="text-[9px] text-foreground/20 uppercase tracking-[0.25em] mb-3">Personal Information</p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label htmlFor="display_name" className="text-xs text-foreground/40">Display Name</Label>
              <Input id="display_name" value={formData.display_name} onChange={(e) => setFormData((p) => ({ ...p, display_name: e.target.value }))} placeholder="Your name" className="bg-foreground/[0.03] border-border/15 text-sm" />
            </div>
            <div>
              <Label htmlFor="phone" className="text-xs text-foreground/40">Phone Number</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" className="bg-foreground/[0.03] border-border/15 text-sm" />
            </div>
            <div>
              <Label htmlFor="bio" className="text-xs text-foreground/40">Bio</Label>
              <Textarea id="bio" value={formData.bio} onChange={(e) => setFormData((p) => ({ ...p, bio: e.target.value }))} placeholder="Tell us about yourself..." rows={2} className="bg-foreground/[0.03] border-border/15 resize-none text-sm" />
            </div>
            <div>
              <Label htmlFor="fitness_goals" className="text-xs text-foreground/40">Fitness Goals</Label>
              <Textarea id="fitness_goals" value={formData.fitness_goals} onChange={(e) => setFormData((p) => ({ ...p, fitness_goals: e.target.value }))} placeholder="What are you working towards?" rows={2} className="bg-foreground/[0.03] border-border/15 resize-none text-sm" />
            </div>
            <Button type="submit" variant="apollo" disabled={isLoading} className="w-full text-xs">
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </div>

        {/* Sign Out */}
        <Button variant="ghost" className="w-full text-foreground/30 text-sm hover:text-foreground/50" onClick={signOut}>
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </Button>
      </div>
    </DashboardLayout>
  );
};

export default DashboardProfile;
