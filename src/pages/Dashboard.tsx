import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Dumbbell, Utensils, CreditCard, Calendar, BookOpen, ChevronRight, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardNutritionCard from "@/components/dashboard/DashboardNutritionCard";
import DashboardStepTracker from "@/components/dashboard/DashboardStepTracker";
import CoachIntroVideo from "@/components/dashboard/CoachIntroVideo";
import DashboardTodayNutrition from "@/components/dashboard/DashboardTodayNutrition";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const Dashboard = () => {
  const { user, profile, subscription } = useAuth();
  const { toast } = useToast();
  const [managingPortal, setManagingPortal] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const isElite = profile?.subscription_tier === "elite";

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

  // Fetch today's workout
  const { data: todayWorkout } = useQuery({
    queryKey: ["today-workout", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data: plans } = await (supabase as any)
        .from("client_training_plans")
        .select("*, client_questionnaires!client_training_plans_questionnaire_id_fkey(cycle_start_date)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1);

      const plan = plans?.[0];
      if (!plan) return null;

      // Parse dates as LOCAL midnight to respect the client's timezone.
      // Appending 'T00:00:00' (no Z) forces local-time parsing instead of UTC.
      const cycleStartStr = plan.client_questionnaires?.cycle_start_date
        || plan.created_at.slice(0, 10);
      const cycleStart = new Date(cycleStartStr + "T00:00:00");

      const today = new Date();
      // Compare only the date portion in local time
      const todayLocal = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const diffDays = Math.floor((todayLocal.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24));
      const dayNumber = (diffDays % (plan.duration_weeks * 7)) + 1;

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
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Could not open subscription management.", variant: "destructive" });
    } finally {
      setManagingPortal(false);
    }
  };

  const todayDate = format(new Date(), "EEEE, MMM d");
  const isRestDay = !todayWorkout;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Date + Greeting */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
            TODAY, {todayDate.toUpperCase()}
          </p>
          <h1 className="font-heading text-2xl md:text-3xl">
            Hello, {profile?.display_name || "Warrior"}! 👋
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
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

        {/* Coach Intro Video */}
        <CoachIntroVideo />

        {/* Quick Nav Tabs — 2×2 grid below coach message */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/dashboard/training"
            className="card-apollo p-4 flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-all text-center"
          >
            <Dumbbell className="w-5 h-5 text-primary" />
            <p className="text-xs font-medium leading-tight">Today's Workout</p>
          </Link>
          <Link
            to="/dashboard/nutrition"
            className="card-apollo p-4 flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-all text-center"
          >
            <Utensils className="w-5 h-5 text-primary" />
            <p className="text-xs font-medium leading-tight">Today's Meal Plan</p>
          </Link>
          <Link
            to="/dashboard/macros"
            className="card-apollo p-4 flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-all text-center"
          >
            <Camera className="w-5 h-5 text-primary" />
            <p className="text-xs font-medium leading-tight">Macro Tracker</p>
          </Link>
          <Link
            to="/dashboard/recipes"
            className="card-apollo p-4 flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-all text-center"
          >
            <BookOpen className="w-5 h-5 text-primary" />
            <p className="text-xs font-medium leading-tight">Recipes</p>
          </Link>
        </div>

        {/* Main grid: stacked on mobile, 2-col on desktop */}
        <div className="grid lg:grid-cols-5 gap-5">
          {/* Left column - primary content */}
          <div className="lg:col-span-3 space-y-5">
            {/* Today's Workout Card */}
            <div className="card-apollo p-5">
              {isRestDay ? (
                <div className="py-6 text-center">
                  <p className="text-xs text-primary uppercase tracking-wider mb-2">REST DAY</p>
                  <p className="font-heading text-xl">Hoo-ray it's your rest-day 🌴</p>
                  <p className="text-sm text-muted-foreground mt-2">Recovery is part of the process</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Dumbbell className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-heading text-base">{todayWorkout?.day_label || `Day ${todayWorkout?.day_number}`}</p>
                        {todayWorkout?.focus && (
                          <p className="text-xs text-primary">{todayWorkout.focus}</p>
                        )}
                      </div>
                    </div>
                    <Link to="/dashboard/training">
                      <Button variant="ghost" size="sm" className="text-primary text-xs">
                        View <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {todayWorkout?.exercises.slice(0, 6).map((ex: any, i: number) => (
                      <div key={ex.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 border border-border/50">
                        <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary flex-shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{ex.exercise_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {ex.sets} × {ex.reps}
                            {ex.rest_seconds ? ` · ${ex.rest_seconds}s rest` : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                    {(todayWorkout?.exercises.length || 0) > 6 && (
                      <p className="text-xs text-muted-foreground text-center pt-1">
                        +{todayWorkout!.exercises.length - 6} more
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Today's Meal Plan + Grocery List */}
            <DashboardTodayNutrition />

            {/* Quick Access - only visible on desktop in left column */}
            <div className="hidden lg:block">
              <h2 className="font-heading text-base mb-3">Quick Access</h2>
              <div className="grid grid-cols-3 gap-3">
                <Link to="/dashboard/nutrition" className="card-apollo p-4 text-center hover:border-primary/50 transition-all">
                  <Utensils className="w-5 h-5 text-primary mx-auto mb-1.5" />
                  <p className="text-xs font-medium">Meal Plan</p>
                </Link>
                <Link to="/dashboard/recipes" className="card-apollo p-4 text-center hover:border-primary/50 transition-all">
                  <BookOpen className="w-5 h-5 text-primary mx-auto mb-1.5" />
                  <p className="text-xs font-medium">Recipes</p>
                </Link>
                <Link to="/dashboard/calendar" className="card-apollo p-4 text-center hover:border-primary/50 transition-all">
                  <Calendar className="w-5 h-5 text-primary mx-auto mb-1.5" />
                  <p className="text-xs font-medium">Calendar</p>
                </Link>
              </div>
            </div>
          </div>

          {/* Right column - secondary content */}
          <div className="lg:col-span-2 space-y-5">
            {/* Step Tracker */}
            <DashboardStepTracker />

            {/* Nutrition Tracker Card */}
            <DashboardNutritionCard />
          </div>
        </div>

        {/* Quick Access - mobile only (below cards) */}
        <div className="lg:hidden">
          <h2 className="font-heading text-base mb-3">Quick Access</h2>
          <div className="grid grid-cols-3 gap-3">
            <Link to="/dashboard/nutrition" className="card-apollo p-3 text-center hover:border-primary/50 transition-all">
              <Utensils className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-xs font-medium">Meal Plan</p>
            </Link>
            <Link to="/dashboard/recipes" className="card-apollo p-3 text-center hover:border-primary/50 transition-all">
              <BookOpen className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-xs font-medium">Recipes</p>
            </Link>
            <Link to="/dashboard/calendar" className="card-apollo p-3 text-center hover:border-primary/50 transition-all">
              <Calendar className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-xs font-medium">Calendar</p>
            </Link>
          </div>
        </div>

        {/* Welcome message - shown once */}
        {showWelcome && (
          <div className="card-apollo-featured p-5 relative">
            <button onClick={dismissWelcome} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground text-xs">✕</button>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">💪</span>
              </div>
              <div>
                <h3 className="font-heading text-base mb-1">Welcome from Coach Marcos</h3>
                <p className="text-muted-foreground text-sm">
                  "Welcome to the APOLLO NATION family! Every workout brings you closer to your best self."
                </p>
                <p className="text-primary text-xs mt-2 font-medium">— Marcos Leyba, Founder</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
