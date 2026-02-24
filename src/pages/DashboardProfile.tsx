import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Save, LogOut, X, Plus, Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import ProfileAvatarUpload from "@/components/dashboard/ProfileAvatarUpload";
import ProfileQuestionnaireView from "@/components/dashboard/ProfileQuestionnaireView";

const DashboardProfile = () => {
  const { profile, refreshProfile, user, signOut, subscription } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [dislikedInput, setDislikedInput] = useState("");
  const [dislikedFoods, setDislikedFoods] = useState<string[]>([]);
  const [savingDisliked, setSavingDisliked] = useState(false);
  const [managingPortal, setManagingPortal] = useState(false);

  const [formData, setFormData] = useState({
    display_name: profile?.display_name || "",
    bio: profile?.bio || "",
    fitness_goals: profile?.fitness_goals || "",
  });

  const { data: questionnaire } = useQuery({
    queryKey: ["profile-questionnaire", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await (supabase as any)
        .from("client_questionnaires")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (questionnaire?.disliked_foods) {
      setDislikedFoods(questionnaire.disliked_foods);
    }
  }, [questionnaire]);

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

  const addDislikedFood = () => {
    const trimmed = dislikedInput.trim();
    if (!trimmed || dislikedFoods.includes(trimmed)) {
      setDislikedInput("");
      return;
    }
    setDislikedFoods((prev) => [...prev, trimmed]);
    setDislikedInput("");
  };

  const removeDislikedFood = (food: string) => {
    setDislikedFoods((prev) => prev.filter((f) => f !== food));
  };

  const saveDislikedFoods = async () => {
    if (!user) return;
    setSavingDisliked(true);
    const { error } = await (supabase as any)
      .from("client_questionnaires")
      .update({ disliked_foods: dislikedFoods })
      .eq("user_id", user.id)
      .eq("is_active", true);
    setSavingDisliked(false);
    if (error) {
      toast({ title: "Error saving preferences", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["profile-questionnaire", user.id] });
      toast({ title: "Food preferences saved!", description: "Your meal swaps will now avoid these foods." });
    }
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

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Profile Header */}
        <div className="card-apollo p-5">
          <div className="flex items-center gap-4 mb-4">
            <ProfileAvatarUpload />
            <div>
              <h1 className="font-heading text-xl">{profile?.display_name || "Member"}</h1>
              <p className="text-primary uppercase text-xs tracking-wider">
                {profile?.subscription_tier || "Basic"} Member
              </p>
            </div>
          </div>
        </div>

        {/* Questionnaire Data */}
        {questionnaire && <ProfileQuestionnaireView questionnaire={questionnaire} />}

        {/* Disliked Foods Editor */}
        {questionnaire && (
          <div className="card-apollo p-5">
            <div className="mb-4">
              <h2 className="font-heading text-base">Food Preferences</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Meals you swap will never include these foods or ingredients.
              </p>
            </div>

            {dislikedFoods.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {dislikedFoods.map((food) => (
                  <span
                    key={food}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary"
                  >
                    {food}
                    <button
                      onClick={() => removeDislikedFood(food)}
                      className="hover:text-destructive transition-colors"
                      aria-label={`Remove ${food}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {dislikedFoods.length === 0 && (
              <p className="text-xs text-muted-foreground mb-3 italic">No disliked foods added yet.</p>
            )}

            <div className="flex gap-2 mb-4">
              <Input
                value={dislikedInput}
                onChange={(e) => setDislikedInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addDislikedFood(); }
                }}
                placeholder="e.g. broccoli, shellfish, cilantro…"
                className="bg-muted border-border"
              />
              <Button type="button" variant="apollo-outline" size="sm" onClick={addDislikedFood} className="shrink-0">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <Button
              variant="apollo"
              className="w-full"
              onClick={saveDislikedFoods}
              disabled={savingDisliked}
            >
              {savingDisliked ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> Save Preferences</>
              )}
            </Button>
          </div>
        )}

        {/* Edit Profile Form */}
        <div className="card-apollo p-5">
          <h2 className="font-heading text-base mb-4">Personal Information</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="display_name">Display Name</Label>
              <Input id="display_name" value={formData.display_name} onChange={(e) => setFormData((p) => ({ ...p, display_name: e.target.value }))} placeholder="Your name" className="bg-muted border-border" />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" className="bg-muted border-border" />
              <p className="text-xs text-muted-foreground mt-1">Securely stored • Only you can view</p>
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" value={formData.bio} onChange={(e) => setFormData((p) => ({ ...p, bio: e.target.value }))} placeholder="Tell us about yourself..." rows={3} className="bg-muted border-border resize-none" />
            </div>
            <div>
              <Label htmlFor="fitness_goals">Fitness Goals</Label>
              <Textarea id="fitness_goals" value={formData.fitness_goals} onChange={(e) => setFormData((p) => ({ ...p, fitness_goals: e.target.value }))} placeholder="What are you working towards?" rows={3} className="bg-muted border-border resize-none" />
            </div>
            <Button type="submit" variant="apollo" disabled={isLoading} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </div>

        {/* Subscription Management */}
        <div className="card-apollo p-5">
          <h3 className="font-heading text-base mb-3">Subscription</h3>
          <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div>
              <p className="font-medium text-sm">{profile?.subscription_tier?.toUpperCase() || "BASIC"} Plan</p>
              <p className="text-xs text-muted-foreground">
                {profile?.subscription_tier === "elite" ? "Full access" : profile?.subscription_tier === "pro" ? "Coaching access" : "On-demand workouts"}
              </p>
              {subscription?.subscribed && subscription.subscription_end && (
                <p className="text-xs text-muted-foreground mt-1">
                  Renews {new Date(subscription.subscription_end).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              {subscription?.subscribed && !(profile as any)?.manual_subscription && (
                <Button variant="apollo-outline" size="sm" onClick={handleManageSubscription} disabled={managingPortal}>
                  <CreditCard className="w-3 h-3 mr-1" />
                  {managingPortal ? "Opening..." : "Manage"}
                </Button>
              )}
              {subscription?.subscribed && (profile as any)?.manual_subscription && (
                <span className="text-xs text-muted-foreground italic">Admin-assigned</span>
              )}
              {!subscription?.subscribed && (
                <Link to="/#pricing">
                  <Button variant="apollo" size="sm">Upgrade</Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Sign Out */}
        <Button variant="ghost" className="w-full text-muted-foreground" onClick={signOut}>
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </Button>
      </div>
    </DashboardLayout>
  );
};

export default DashboardProfile;
