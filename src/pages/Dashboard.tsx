import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Dumbbell, Utensils, Camera, CreditCard, Calendar, BookOpen, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MessageInboxPreview from "@/components/dashboard/MessageInboxPreview";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

const Dashboard = () => {
  const { user, profile, subscription } = useAuth();
  const { toast } = useToast();
  const [managingPortal, setManagingPortal] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const isElite = profile?.subscription_tier === "elite";
  const isPro = profile?.subscription_tier === "pro" || isElite;

  // Check if welcome message should be shown (first login only)
  useEffect(() => {
    if (profile && !(profile as any).welcome_seen) {
      setShowWelcome(true);
    }
  }, [profile]);

  const dismissWelcome = async () => {
    setShowWelcome(false);
    if (user) {
      await supabase
        .from("profiles")
        .update({ welcome_seen: true } as any)
        .eq("user_id", user.id);
    }
  };

  // Fetch today's workout from training plan
  const { data: todayWorkout } = useQuery({
    queryKey: ["today-workout", user?.id],
    queryFn: async () => {
      if (!user) return null;
      // Get active training plan
      const { data: plans } = await (supabase as any)
        .from("client_training_plans")
        .select("*, client_questionnaires!client_training_plans_questionnaire_id_fkey(cycle_start_date)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1);

      const plan = plans?.[0];
      if (!plan) return null;

      const cycleStart = plan.client_questionnaires?.cycle_start_date
        ? new Date(plan.client_questionnaires.cycle_start_date)
        : new Date(plan.created_at);

      const today = new Date();
      const diffDays = Math.floor((today.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24));
      const dayNumber = (diffDays % (plan.duration_weeks * 7)) + 1;

      // Get today's training day
      const { data: days } = await (supabase as any)
        .from("training_plan_days")
        .select("*, training_plan_exercises(*)")
        .eq("plan_id", plan.id)
        .eq("day_number", dayNumber)
        .limit(1);

      if (!days?.[0]) return null;
      return {
        ...days[0],
        planTitle: plan.title,
        exercises: days[0].training_plan_exercises?.sort((a: any, b: any) => a.sort_order - b.sort_order) || [],
      };
    },
    enabled: !!user,
  });

  const handleManageSubscription = async () => {
    setManagingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Could not open subscription management.",
        variant: "destructive",
      });
    } finally {
      setManagingPortal(false);
    }
  };

  const quickLinks = [
    { title: "Meal Plan", icon: Utensils, href: "/dashboard/nutrition", description: "Your personalized nutrition" },
    { title: "Workout Library", icon: Dumbbell, href: "/dashboard/workouts", description: "Browse all workouts" },
    { title: "Recipes", icon: BookOpen, href: "/dashboard/recipes", description: "Healthy meal ideas" },
    { title: "Macro Tracker", icon: Camera, href: "/dashboard/macros", description: isElite ? "Track your nutrition" : "Elite only", locked: !isElite },
    { title: "Calendar", icon: Calendar, href: "/dashboard/calendar", description: "Your schedule" },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Welcome header + tier badge */}
        <div>
          <h1 className="font-heading text-2xl md:text-3xl mb-1">
            Welcome back,{" "}
            <span className="text-apollo-gold">
              {profile?.display_name || "Warrior"}
            </span>
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <Badge className="bg-apollo-gold/10 text-apollo-gold border-apollo-gold/20 hover:bg-apollo-gold/20">
              {profile?.subscription_tier || "Basic"} Member
            </Badge>
            {subscription?.subscribed && subscription.subscription_end && (
              <span className="text-xs text-muted-foreground">
                Renews {new Date(subscription.subscription_end).toLocaleDateString()}
              </span>
            )}
            {subscription?.subscribed && !(profile as any)?.manual_subscription && (
              <Button variant="ghost" size="sm" onClick={handleManageSubscription} disabled={managingPortal} className="text-xs h-7">
                <CreditCard className="w-3 h-3 mr-1" />
                {managingPortal ? "Opening..." : "Manage"}
              </Button>
            )}
            {subscription?.subscribed && (profile as any)?.manual_subscription && (
              <span className="text-xs text-muted-foreground italic">Admin-assigned plan</span>
            )}
            {!subscription?.subscribed && (
              <Link to="/#pricing">
                <Button variant="apollo" size="sm" className="h-7 text-xs">Upgrade</Button>
              </Link>
            )}
          </div>
        </div>

        {/* Main layout: Today's Workout (left) + Messages (right) */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Today's Workout - larger left column */}
          <div className="lg:col-span-3">
            <div className="card-apollo p-5 h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-lg">Today's Workout</h2>
                <Link to="/dashboard/training">
                  <Button variant="ghost" size="sm" className="text-apollo-gold text-xs">
                    Full Program <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>

              {todayWorkout ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-apollo-gold/10 flex items-center justify-center">
                      <Dumbbell className="w-5 h-5 text-apollo-gold" />
                    </div>
                    <div>
                      <p className="font-heading text-base">{todayWorkout.day_label || `Day ${todayWorkout.day_number}`}</p>
                      {todayWorkout.focus && (
                        <p className="text-xs text-apollo-gold">{todayWorkout.focus}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {todayWorkout.exercises.slice(0, 6).map((ex: any, i: number) => (
                      <div key={ex.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border border-border/50">
                        <span className="w-6 h-6 rounded-full bg-apollo-gold/20 flex items-center justify-center text-xs font-medium text-apollo-gold flex-shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{ex.exercise_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {ex.sets} sets × {ex.reps} reps
                            {ex.rest_seconds ? ` · ${ex.rest_seconds}s rest` : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                    {todayWorkout.exercises.length > 6 && (
                      <p className="text-xs text-muted-foreground text-center pt-1">
                        +{todayWorkout.exercises.length - 6} more exercises
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Dumbbell className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground text-sm">No workout scheduled for today</p>
                  <Link to="/dashboard/training" className="mt-2">
                    <Button variant="apollo-outline" size="sm">View Training Program</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Messages - right column */}
          <div className="lg:col-span-2">
            <MessageInboxPreview />
          </div>
        </div>

        {/* Quick Access Menu */}
        <div>
          <h2 className="font-heading text-lg mb-3">Quick Access</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                to={link.locked ? "#" : link.href}
                onClick={(e) => link.locked && e.preventDefault()}
                className={`card-apollo p-4 text-center group transition-all ${
                  link.locked ? "opacity-50 cursor-not-allowed" : "hover:border-apollo-gold/50"
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-apollo-gold/10 flex items-center justify-center mx-auto mb-2">
                  <link.icon className="w-5 h-5 text-apollo-gold" />
                </div>
                <p className="font-heading text-sm">{link.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{link.description}</p>
                {link.locked && (
                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded mt-1 inline-block">Elite</span>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Welcome message from Coach Marcos - shown only once */}
        {showWelcome && (
          <div className="card-apollo-featured p-5 relative">
            <button
              onClick={dismissWelcome}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground text-xs"
            >
              ✕
            </button>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-apollo-gold/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">💪</span>
              </div>
              <div>
                <h3 className="font-heading text-base mb-1">Welcome from Coach Marcos</h3>
                <p className="text-muted-foreground text-sm">
                  "Welcome to the APOLLO NATION family! Every workout brings you closer to your best self. I'm here to guide you every step of the way. Let's get to work!"
                </p>
                <p className="text-apollo-gold text-xs mt-2 font-medium">— Marcos Leyba, Founder</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
