import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ChevronLeft, Snowflake, Archive, XCircle, RotateCcw, Pencil,
  User, Target, FileText, StickyNote, Utensils, Dumbbell, Activity, BarChart3, Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ClientNotesPanel from "./ClientNotesPanel";
import ClientNutritionPlans from "./ClientNutritionPlans";
import ClientActivityLogs from "./ClientActivityLogs";
import ClientBodyMetrics from "./ClientBodyMetrics";
import ClientQuickActions from "./ClientQuickActions";

interface Props {
  userId: string;
  onBack: () => void;
}

const AdminClientProfile = ({ userId, onBack }: Props) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState("overview");

  // Fetch profile
  const { data: profile } = useQuery({
    queryKey: ["admin-client-profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch questionnaire
  const { data: questionnaire } = useQuery({
    queryKey: ["admin-client-questionnaire", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_questionnaires")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch training plans
  const { data: trainingPlans } = useQuery({
    queryKey: ["admin-client-training-plans", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_training_plans")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch nutrition plans
  const { data: nutritionPlans } = useQuery({
    queryKey: ["admin-client-nutrition-plans", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nutrition_plans")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Status mutation
  const statusMutation = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      const { data, error } = await supabase.functions.invoke("manage-client-status", {
        body: { client_user_id: userId, new_status: status },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-client-profile", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
      toast({ title: "Status updated" });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Tier mutation
  const tierMutation = useMutation({
    mutationFn: async (tier: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ subscription_tier: tier as any })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-client-profile", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
      toast({ title: "Tier updated" });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const formatHeight = (inches: number) => `${Math.floor(inches / 12)}'${inches % 12}"`;

  const getTierBadge = (tier: string) => {
    const colors: Record<string, string> = {
      elite: "bg-apollo-gold/20 text-apollo-gold",
      pro: "bg-purple-500/20 text-purple-400",
      basic: "bg-muted text-muted-foreground",
    };
    return colors[tier] || colors.basic;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 h-8">
          <ChevronLeft className="w-4 h-4" /> Clients
        </Button>
      </div>

      {/* Client header card */}
      <div className="card-apollo p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-apollo-gold/15 text-apollo-gold font-bold text-xl">
              {(profile?.display_name || "?")[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="font-heading text-xl">{profile?.display_name || "Unnamed"}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className={`px-2.5 py-1 rounded text-xs uppercase font-medium ${getTierBadge(profile?.subscription_tier || "basic")}`}>
                {profile?.subscription_tier}
              </span>
              <Badge variant={profile?.account_status === "active" ? "default" : "secondary"} className="capitalize">
                {profile?.account_status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Joined {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Tier selector */}
            <Select
              value={profile?.subscription_tier}
              onValueChange={(v) => tierMutation.mutate(v)}
            >
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Essential</SelectItem>
                <SelectItem value="pro">Premier</SelectItem>
                <SelectItem value="elite">Elite</SelectItem>
              </SelectContent>
            </Select>

            {/* Status actions */}
            {profile?.account_status === "active" && (
              <>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => statusMutation.mutate({ status: "frozen" })} disabled={statusMutation.isPending}>
                  <Snowflake className="w-3 h-3" /> Freeze
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1 text-destructive" onClick={() => statusMutation.mutate({ status: "cancelled" })} disabled={statusMutation.isPending}>
                  <XCircle className="w-3 h-3" /> Cancel
                </Button>
              </>
            )}
            {profile?.account_status !== "active" && (
              <Button size="sm" variant="apollo" className="h-8 text-xs gap-1" onClick={() => statusMutation.mutate({ status: "active" })} disabled={statusMutation.isPending}>
                <RotateCcw className="w-3 h-3" /> Reactivate
              </Button>
            )}
            {profile?.account_status !== "archived" && (
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => statusMutation.mutate({ status: "archived" })} disabled={statusMutation.isPending}>
                <Archive className="w-3 h-3" /> Archive
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <ClientQuickActions
        userId={userId}
        clientName={profile?.display_name || "Client"}
        onRefresh={() => {
          queryClient.invalidateQueries({ queryKey: ["admin-client-profile", userId] });
          queryClient.invalidateQueries({ queryKey: ["admin-client-nutrition-plans", userId] });
          queryClient.invalidateQueries({ queryKey: ["admin-client-training-plans", userId] });
        }}
      />

      {/* Tabbed sections */}
      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="gap-1.5 text-xs"><User className="w-3.5 h-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="training" className="gap-1.5 text-xs"><Dumbbell className="w-3.5 h-3.5" /> Training</TabsTrigger>
          <TabsTrigger value="nutrition" className="gap-1.5 text-xs"><Utensils className="w-3.5 h-3.5" /> Nutrition</TabsTrigger>
          <TabsTrigger value="metrics" className="gap-1.5 text-xs"><BarChart3 className="w-3.5 h-3.5" /> Body Metrics</TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5 text-xs"><Activity className="w-3.5 h-3.5" /> Activity</TabsTrigger>
          <TabsTrigger value="notes" className="gap-1.5 text-xs"><StickyNote className="w-3.5 h-3.5" /> Notes</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW ── */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* Basic Info from Questionnaire */}
          <div className="card-apollo p-5 space-y-4">
            <h3 className="font-heading text-sm uppercase tracking-wider text-apollo-gold flex items-center gap-2">
              <User className="w-4 h-4" /> Basic Information
            </h3>
            {questionnaire ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Age</p>
                  <p className="font-medium">{questionnaire.age}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sex</p>
                  <p className="font-medium capitalize">{questionnaire.sex}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Weight</p>
                  <p className="font-medium">{questionnaire.weight_lbs} lbs</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Height</p>
                  <p className="font-medium">{formatHeight(questionnaire.height_inches)}</p>
                </div>
                {questionnaire.goal_weight && (
                  <div>
                    <p className="text-xs text-muted-foreground">Goal Weight</p>
                    <p className="font-medium">{questionnaire.goal_weight} lbs</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Activity Level</p>
                  <p className="font-medium capitalize">{questionnaire.activity_level}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Workout Days/Week</p>
                  <p className="font-medium">{questionnaire.workout_days_per_week}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="font-medium">{questionnaire.workout_duration_minutes || 60} min</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No questionnaire submitted yet.</p>
            )}
          </div>

          {/* Goals */}
          {questionnaire && (
            <div className="card-apollo p-5 space-y-4">
              <h3 className="font-heading text-sm uppercase tracking-wider text-apollo-gold flex items-center gap-2">
                <Target className="w-4 h-4" /> Goals & Preferences
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {questionnaire.goal_next_4_weeks && (
                  <div className="col-span-full">
                    <p className="text-xs text-muted-foreground">Goal (Next 4 Weeks)</p>
                    <p className="text-sm mt-1">{questionnaire.goal_next_4_weeks}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Training Methods</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {questionnaire.training_methods?.length > 0
                      ? questionnaire.training_methods.map((m: string) => (
                          <Badge key={m} variant="secondary" className="text-xs capitalize">{m}</Badge>
                        ))
                      : <span className="text-sm text-muted-foreground">None specified</span>}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Preferred Training Days</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {questionnaire.preferred_training_days?.length > 0
                      ? questionnaire.preferred_training_days.map((d: string) => (
                          <Badge key={d} variant="outline" className="text-xs capitalize">{d}</Badge>
                        ))
                      : <span className="text-sm text-muted-foreground">None specified</span>}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Dietary Restrictions</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {questionnaire.dietary_restrictions?.length > 0
                      ? questionnaire.dietary_restrictions.map((r: string) => (
                          <Badge key={r} variant="destructive" className="text-xs">{r}</Badge>
                        ))
                      : <span className="text-sm text-muted-foreground">None</span>}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Disliked Foods</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {questionnaire.disliked_foods?.length > 0
                      ? questionnaire.disliked_foods.map((f: string) => (
                          <Badge key={f} variant="outline" className="text-xs">{f}</Badge>
                        ))
                      : <span className="text-sm text-muted-foreground">None</span>}
                  </div>
                </div>
                {questionnaire.grocery_store && (
                  <div>
                    <p className="text-xs text-muted-foreground">Preferred Grocery Store</p>
                    <p className="text-sm mt-1">{questionnaire.grocery_store}</p>
                  </div>
                )}
                {questionnaire.weekly_food_budget && (
                  <div>
                    <p className="text-xs text-muted-foreground">Weekly Food Budget</p>
                    <p className="text-sm mt-1">${questionnaire.weekly_food_budget}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Agreements */}
          {questionnaire && (
            <div className="card-apollo p-5 space-y-3">
              <h3 className="font-heading text-sm uppercase tracking-wider text-apollo-gold flex items-center gap-2">
                <FileText className="w-4 h-4" /> Agreements & Waivers
              </h3>
              <div className="flex items-center gap-3">
                <Badge variant={questionnaire.waiver_accepted ? "default" : "destructive"}>
                  {questionnaire.waiver_accepted ? "Waiver Signed" : "Waiver Not Signed"}
                </Badge>
                {questionnaire.waiver_accepted_at && (
                  <span className="text-xs text-muted-foreground">
                    Signed on {new Date(questionnaire.waiver_accepted_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Cycle {questionnaire.cycle_number} — Started {new Date(questionnaire.cycle_start_date).toLocaleDateString()}
              </div>
            </div>
          )}

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card-apollo p-4 text-center">
              <p className="text-2xl font-heading text-apollo-gold">{trainingPlans?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Training Plans</p>
            </div>
            <div className="card-apollo p-4 text-center">
              <p className="text-2xl font-heading text-apollo-gold">{nutritionPlans?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Nutrition Plans</p>
            </div>
          </div>
        </TabsContent>

        {/* ── TRAINING ── */}
        <TabsContent value="training" className="mt-4">
          <TrainingSection userId={userId} plans={trainingPlans || []} />
        </TabsContent>

        {/* ── NUTRITION ── */}
        <TabsContent value="nutrition" className="mt-4">
          <ClientNutritionPlans userId={userId} />
        </TabsContent>

        {/* ── BODY METRICS ── */}
        <TabsContent value="metrics" className="mt-4">
          <ClientBodyMetrics userId={userId} />
        </TabsContent>

        {/* ── ACTIVITY ── */}
        <TabsContent value="activity" className="mt-4">
          <ClientActivityLogs userId={userId} />
        </TabsContent>

        {/* ── NOTES ── */}
        <TabsContent value="notes" className="mt-4">
          <ClientNotesPanel userId={userId} clientName={profile?.display_name || "Unknown"} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Training sub-component for drill-down
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronRight } from "lucide-react";

const TrainingSection = ({ userId, plans }: { userId: string; plans: any[] }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  const { data: days } = useQuery({
    queryKey: ["admin-plan-days", selectedPlanId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_plan_days")
        .select("*")
        .eq("plan_id", selectedPlanId!)
        .order("day_number");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPlanId,
  });

  const { data: exercises } = useQuery({
    queryKey: ["admin-day-exercises", selectedDayId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_plan_exercises")
        .select("*")
        .eq("day_id", selectedDayId!)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedDayId,
  });

  if (selectedDayId && exercises) {
    const day = days?.find(d => d.id === selectedDayId);
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedDayId(null)} className="gap-1 h-7">
          <ChevronLeft className="w-3 h-3" /> Back to Days
        </Button>
        <h3 className="font-heading text-lg">{day?.day_label || `Day ${day?.day_number}`} — {day?.focus || "Exercises"}</h3>
        <div className="card-apollo overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Exercise</TableHead>
                <TableHead>Sets × Reps</TableHead>
                <TableHead>Rest</TableHead>
                <TableHead>Muscle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exercises.map((e, i) => (
                <TableRow key={e.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-medium">{e.exercise_name}</TableCell>
                  <TableCell>{e.sets} × {e.reps}</TableCell>
                  <TableCell>{e.rest_seconds}s</TableCell>
                  <TableCell className="text-muted-foreground capitalize">{e.muscle_group || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (selectedPlanId && days) {
    const plan = plans.find(p => p.id === selectedPlanId);
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedPlanId(null)} className="gap-1 h-7">
          <ChevronLeft className="w-3 h-3" /> Back to Plans
        </Button>
        <h3 className="font-heading text-lg">{plan?.title} — Days</h3>
        <div className="grid gap-2">
          {days.map(d => (
            <button
              key={d.id}
              onClick={() => setSelectedDayId(d.id)}
              className="card-apollo flex items-center justify-between p-4 text-left hover:border-apollo-gold/30 transition-all"
            >
              <div>
                <p className="font-medium">{d.day_label || `Day ${d.day_number}`}</p>
                <p className="text-xs text-muted-foreground">{d.focus || "No focus set"}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-heading text-lg">Training Plans</h3>
      {plans.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">No training plans found.</p>
      ) : (
        <div className="grid gap-2">
          {plans.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPlanId(p.id)}
              className="card-apollo flex items-center justify-between p-4 text-left hover:border-apollo-gold/30 transition-all"
            >
              <div>
                <p className="font-medium">{p.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge>
                  <span className="text-xs text-muted-foreground">
                    Cycle {p.cycle_number} · {p.workout_days_per_week} days/week · {p.duration_weeks} weeks
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminClientProfile;
