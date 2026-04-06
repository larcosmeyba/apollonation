import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, ChevronRight, Sparkles, User, Trash2 } from "lucide-react";
import AdminNutritionPlanViewer from "./AdminNutritionPlanViewer";

interface ClientProfile {
  id: string;
  user_id: string;
  age: number | null;
  weight_lbs: number | null;
  height_inches: number | null;
  activity_level: string | null;
  goals: string | null;
  dietary_preferences: string[];
  food_restrictions: string[];
  notes: string | null;
}

const AdminNutrition = () => {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [viewingPlanId, setViewingPlanId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    age: "",
    weight_lbs: "",
    height_inches: "",
    activity_level: "moderate",
    goals: "maintain",
    dietary_preferences: "",
    food_restrictions: "",
    notes: "",
    plan_title: "",
  });

  // Fetch all users with profiles
  const { data: users } = useQuery({
    queryKey: ["admin-users-nutrition"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name, subscription_tier")
        .order("display_name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch selected client's nutrition profile
  const { data: clientProfile, refetch: refetchProfile } = useQuery({
    queryKey: ["client-nutrition-profile", selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return null;
      const { data, error } = await supabase
        .from("client_nutrition_profiles")
        .select("*")
        .eq("user_id", selectedUserId)
        .maybeSingle();
      if (error) throw error;
      return data as ClientProfile | null;
    },
    enabled: !!selectedUserId,
  });

  // Fetch selected client's nutrition plans
  const { data: clientPlans, refetch: refetchPlans } = useQuery({
    queryKey: ["client-nutrition-plans", selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return [];
      const { data, error } = await supabase
        .from("nutrition_plans")
        .select("*")
        .eq("user_id", selectedUserId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedUserId,
  });

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    setViewingPlanId(null);
    setShowProfileForm(false);
  };

  const handleEditProfile = () => {
    if (clientProfile) {
      setFormData({
        age: clientProfile.age?.toString() || "",
        weight_lbs: clientProfile.weight_lbs?.toString() || "",
        height_inches: clientProfile.height_inches?.toString() || "",
        activity_level: clientProfile.activity_level || "moderate",
        goals: clientProfile.goals || "maintain",
        dietary_preferences: clientProfile.dietary_preferences?.join(", ") || "",
        food_restrictions: clientProfile.food_restrictions?.join(", ") || "",
        notes: clientProfile.notes || "",
        plan_title: "",
      });
    } else {
      setFormData({
        age: "",
        weight_lbs: "",
        height_inches: "",
        activity_level: "moderate",
        goals: "maintain",
        dietary_preferences: "",
        food_restrictions: "",
        notes: "",
        plan_title: "",
      });
    }
    setShowProfileForm(true);
  };

  const handleSaveProfile = async () => {
    if (!selectedUserId) return;

    const profileData = {
      user_id: selectedUserId,
      age: formData.age ? parseInt(formData.age) : null,
      weight_lbs: formData.weight_lbs ? parseFloat(formData.weight_lbs) : null,
      height_inches: formData.height_inches ? parseInt(formData.height_inches) : null,
      activity_level: formData.activity_level,
      goals: formData.goals,
      dietary_preferences: formData.dietary_preferences
        ? formData.dietary_preferences.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      food_restrictions: formData.food_restrictions
        ? formData.food_restrictions.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      notes: formData.notes || null,
    };

    let error;
    if (clientProfile) {
      const res = await supabase
        .from("client_nutrition_profiles")
        .update(profileData)
        .eq("id", clientProfile.id);
      error = res.error;
    } else {
      const res = await supabase
        .from("client_nutrition_profiles")
        .insert(profileData);
      error = res.error;
    }

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Profile saved" });
    refetchProfile();
    setShowProfileForm(false);
  };

  const handleGeneratePlan = async () => {
    if (!selectedUserId || !clientProfile) {
      toast({ title: "Save the client profile first", variant: "destructive" });
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-meal-plan", {
        body: {
          profile: clientProfile,
          clientUserId: selectedUserId,
          planTitle: formData.plan_title || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Meal plan generated!",
        description: `Created ${data.mealsCount} meals across 4 weeks (${data.macros.dailyCalories} kcal/day)`,
      });
      refetchPlans();
    } catch (err: any) {
      toast({
        title: "Generation failed",
        description: err.message || "Failed to generate meal plan",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    const { error } = await supabase
      .from("nutrition_plans")
      .delete()
      .eq("id", planId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Plan deleted" });
    if (viewingPlanId === planId) setViewingPlanId(null);
    refetchPlans();
  };

  // If viewing a specific plan
  if (viewingPlanId) {
    return (
      <AdminNutritionPlanViewer
        planId={viewingPlanId}
        onBack={() => setViewingPlanId(null)}
        isAdmin
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Client selector */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Select Client
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {users?.map((u) => (
              <button
                key={u.user_id}
                onClick={() => handleSelectUser(u.user_id)}
                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                  selectedUserId === u.user_id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                  {(u.display_name || "?")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{u.display_name || "Unnamed"}</p>
                  <p className="text-xs text-muted-foreground capitalize">{u.subscription_tier}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Client profile & actions */}
      {selectedUserId && (
        <>
          {/* Nutrition Profile */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Client Nutrition Profile</CardTitle>
              <Button variant="apollo-outline" size="sm" onClick={handleEditProfile}>
                {clientProfile ? "Edit Profile" : "Create Profile"}
              </Button>
            </CardHeader>
            <CardContent>
              {clientProfile && !showProfileForm ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Age</p>
                    <p className="font-medium">{clientProfile.age || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Weight</p>
                    <p className="font-medium">{clientProfile.weight_lbs ? `${clientProfile.weight_lbs} lbs` : "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Height</p>
                    <p className="font-medium">
                      {clientProfile.height_inches
                        ? `${Math.floor(clientProfile.height_inches / 12)}'${clientProfile.height_inches % 12}"`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Activity Level</p>
                    <p className="font-medium capitalize">{clientProfile.activity_level?.replace("_", " ") || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Goal</p>
                    <p className="font-medium capitalize">{clientProfile.goals?.replace("_", " ") || "—"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Dietary Preferences</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {clientProfile.dietary_preferences?.length > 0
                        ? clientProfile.dietary_preferences.map((p) => (
                            <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                          ))
                        : <span className="text-sm text-muted-foreground">None</span>}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Food Restrictions</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {clientProfile.food_restrictions?.length > 0
                        ? clientProfile.food_restrictions.map((r) => (
                            <Badge key={r} variant="destructive" className="text-xs">{r}</Badge>
                          ))
                        : <span className="text-sm text-muted-foreground">None</span>}
                    </div>
                  </div>
                  {clientProfile.notes && (
                    <div className="col-span-full">
                      <p className="text-xs text-muted-foreground">Notes</p>
                      <p className="text-sm">{clientProfile.notes}</p>
                    </div>
                  )}
                </div>
              ) : showProfileForm ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="age">Age</Label>
                      <Input
                        id="age"
                        type="number"
                        value={formData.age}
                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                        placeholder="25"
                      />
                    </div>
                    <div>
                      <Label htmlFor="weight">Weight (lbs)</Label>
                      <Input
                        id="weight"
                        type="number"
                        value={formData.weight_lbs}
                        onChange={(e) => setFormData({ ...formData, weight_lbs: e.target.value })}
                        placeholder="175"
                      />
                    </div>
                    <div>
                      <Label htmlFor="height">Height (inches)</Label>
                      <Input
                        id="height"
                        type="number"
                        value={formData.height_inches}
                        onChange={(e) => setFormData({ ...formData, height_inches: e.target.value })}
                        placeholder="70"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Activity Level</Label>
                      <Select
                        value={formData.activity_level}
                        onValueChange={(v) => setFormData({ ...formData, activity_level: v })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sedentary">Sedentary</SelectItem>
                          <SelectItem value="light">Lightly Active</SelectItem>
                          <SelectItem value="moderate">Moderately Active</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="very_active">Very Active</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Goal</Label>
                      <Select
                        value={formData.goals}
                        onValueChange={(v) => setFormData({ ...formData, goals: v })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lose_weight">Lose Weight</SelectItem>
                          <SelectItem value="maintain">Maintain</SelectItem>
                          <SelectItem value="gain_muscle">Gain Muscle</SelectItem>
                          <SelectItem value="body_recomp">Body Recomposition</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="prefs">Dietary Preferences (comma-separated)</Label>
                    <Input
                      id="prefs"
                      value={formData.dietary_preferences}
                      onChange={(e) => setFormData({ ...formData, dietary_preferences: e.target.value })}
                      placeholder="e.g. vegan, high-protein, keto"
                    />
                  </div>

                  <div>
                    <Label htmlFor="restrictions">Food Restrictions / Dislikes (comma-separated)</Label>
                    <Input
                      id="restrictions"
                      value={formData.food_restrictions}
                      onChange={(e) => setFormData({ ...formData, food_restrictions: e.target.value })}
                      placeholder="e.g. shellfish, gluten, mushrooms"
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Any specific instructions for this client..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button variant="apollo" onClick={handleSaveProfile}>Save Profile</Button>
                    <Button variant="ghost" onClick={() => setShowProfileForm(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No nutrition profile yet. Click "Create Profile" to set up this client's data.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Generate Plan */}
          {clientProfile && (
            <Card className="bg-card border-border border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Generate AI Meal Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="plan-title">Plan Title (optional)</Label>
                  <Input
                    id="plan-title"
                    value={formData.plan_title}
                    onChange={(e) => setFormData({ ...formData, plan_title: e.target.value })}
                    placeholder="e.g. Weight Loss Phase 1"
                  />
                </div>
                <Button
                  variant="apollo"
                  onClick={handleGeneratePlan}
                  disabled={generating}
                  className="w-full"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating 4-week meal plan...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate 4-Week Meal Plan
                    </>
                  )}
                </Button>
                {generating && (
                  <p className="text-xs text-muted-foreground text-center">
                    This may take 30-60 seconds. The AI is creating 28 days of personalized meals.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Existing Plans */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">Meal Plans</CardTitle>
            </CardHeader>
            <CardContent>
              {clientPlans && clientPlans.length > 0 ? (
                <div className="space-y-3">
                  {clientPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/30 transition-all"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{plan.title}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{plan.daily_calories} kcal/day</span>
                          <span>P: {plan.protein_grams}g</span>
                          <span>C: {plan.carbs_grams}g</span>
                          <span>F: {plan.fat_grams}g</span>
                          <Badge variant={plan.status === "active" ? "default" : "secondary"} className="text-xs">
                            {plan.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Created {new Date(plan.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="apollo-outline"
                          size="sm"
                          onClick={() => setViewingPlanId(plan.id)}
                        >
                          View Plan
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePlan(plan.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No meal plans yet. Create a profile and generate one above.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default AdminNutrition;
