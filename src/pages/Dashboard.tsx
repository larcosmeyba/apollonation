import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Dumbbell, Utensils, Camera, TrendingUp, Play, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MessageInboxPreview from "@/components/dashboard/MessageInboxPreview";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const { profile, subscription } = useAuth();
  const { toast } = useToast();
  const [managingPortal, setManagingPortal] = useState(false);
  const isElite = profile?.subscription_tier === "elite";
  const isPro = profile?.subscription_tier === "pro" || isElite;

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
    {
      title: "Workout Library",
      description: "Access growing library of HD workouts",
      icon: Dumbbell,
      href: "/dashboard/workouts",
      color: "from-emerald-500/20 to-emerald-600/20",
    },
    {
      title: "Nutrition Recipes",
      description: "Healthy meals for your goals",
      icon: Utensils,
      href: "/dashboard/recipes",
      color: "from-blue-500/20 to-blue-600/20",
    },
    {
      title: "Macro Tracker",
      description: isElite ? "Track your daily nutrition" : "Elite tier feature",
      icon: Camera,
      href: "/dashboard/macros",
      color: "from-purple-500/20 to-purple-600/20",
      locked: !isElite,
    },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Welcome header */}
        <div className="mb-8">
          <h1 className="font-heading text-3xl md:text-4xl mb-2">
            Welcome back,{" "}
            <span className="text-apollo-gold">
              {profile?.display_name || "Warrior"}
            </span>
          </h1>
          <p className="text-muted-foreground">
            Ready to conquer your fitness goals? Let's get started.
          </p>
        </div>

        {/* Tier badge + manage subscription */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-apollo-gold/10 border border-apollo-gold/20">
            <span className="text-apollo-gold font-medium text-sm uppercase tracking-wide">
              {profile?.subscription_tier || "Basic"} Member
            </span>
          </div>
          {subscription?.subscribed && (
            <>
              <span className="text-xs text-muted-foreground">
                Renews {subscription.subscription_end
                  ? new Date(subscription.subscription_end).toLocaleDateString()
                  : "—"}
              </span>
              <Button
                variant="apollo-outline"
                size="sm"
                onClick={handleManageSubscription}
                disabled={managingPortal}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                {managingPortal ? "Opening..." : "Manage Subscription"}
              </Button>
            </>
          )}
          {!subscription?.subscribed && (
            <Link to="/#pricing">
              <Button variant="apollo" size="sm">
                Upgrade Plan
              </Button>
            </Link>
          )}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card-apollo p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-apollo-gold/10 flex items-center justify-center">
                <Play className="w-5 h-5 text-apollo-gold" />
              </div>
              <div>
                <p className="text-2xl font-heading">0</p>
                <p className="text-xs text-muted-foreground">Workouts Completed</p>
              </div>
            </div>
          </div>
          <div className="card-apollo p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-apollo-gold/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-apollo-gold" />
              </div>
              <div>
                <p className="text-2xl font-heading">0</p>
                <p className="text-xs text-muted-foreground">Week Streak</p>
              </div>
            </div>
          </div>
          <div className="card-apollo p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-apollo-gold/10 flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-apollo-gold" />
              </div>
              <div>
                <p className="text-2xl font-heading">100+</p>
                <p className="text-xs text-muted-foreground">Available Workouts</p>
              </div>
            </div>
          </div>
          <div className="card-apollo p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-apollo-gold/10 flex items-center justify-center">
                <Utensils className="w-5 h-5 text-apollo-gold" />
              </div>
              <div>
                <p className="text-2xl font-heading">50+</p>
                <p className="text-xs text-muted-foreground">Healthy Recipes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick links */}
        <h2 className="font-heading text-xl mb-4">Quick Access</h2>
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              to={link.locked ? "#" : link.href}
              onClick={(e) => link.locked && e.preventDefault()}
              className={`card-apollo p-6 group transition-all ${
                link.locked ? "opacity-60 cursor-not-allowed" : "hover:border-apollo-gold/50"
              }`}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${link.color} flex items-center justify-center mb-4`}>
                <link.icon className="w-6 h-6 text-apollo-gold" />
              </div>
              <h3 className="font-heading text-lg mb-1">{link.title}</h3>
              <p className="text-sm text-muted-foreground">{link.description}</p>
              {link.locked && (
                <div className="mt-3">
                  <span className="text-xs bg-muted px-2 py-1 rounded">Upgrade to Elite</span>
                </div>
              )}
            </Link>
          ))}
        </div>

        {/* Message inbox preview */}
        <div className="mb-8">
          <MessageInboxPreview />
        </div>

        {/* Coach Marcos message */}
        <div className="card-apollo-featured p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-apollo-gold/20 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">💪</span>
            </div>
            <div className="flex-1">
              <h3 className="font-heading text-lg mb-1">Message from Coach Marcos</h3>
              <p className="text-muted-foreground text-sm">
                "Welcome to the APOLLO NATION family! Remember, every workout brings you one step closer to becoming the best version of yourself. I'm here to guide you every step of the way. Let's get to work!"
              </p>
              <p className="text-apollo-gold text-sm mt-2 font-medium">— Marcos Leyba, Founder</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
