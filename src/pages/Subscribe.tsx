import { useState } from "react";
import { Check, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { STRIPE_TIERS } from "@/config/stripe";
import apolloLogo from "@/assets/apollo-logo.png";

const tiers = [
  {
    name: "Essential",
    price: "20",
    description: "Begin your wellness journey",
    features: [
      "On-demand workout library",
      "Nutrition recipes collection",
      "Progress tracking",
      "Community support",
      "Web & mobile app access"
    ],
    tierKey: "basic" as const,
    featured: false,
  },
  {
    name: "Premier",
    price: "59",
    description: "For dedicated practitioners",
    features: [
      "Everything in Essential",
      "Advanced training programs",
      "Personalized workout plans",
      "Nutrition guidance",
      "Live sessions access",
      "Priority support"
    ],
    tierKey: "pro" as const,
    featured: true,
  },
  {
    name: "Elite",
    price: "99",
    description: "The complete experience",
    features: [
      "Everything in Premier",
      "AI-powered macro tracking",
      "Personalized nutrition plans",
      "One-on-one coaching",
      "Custom meal planning",
      "Early access to content",
      "VIP community"
    ],
    tierKey: "elite" as const,
    featured: false,
  }
];

const Subscribe = () => {
  const { user, profile, loading, subscription, subscriptionLoading, signOut } = useAuth();
  const { toast } = useToast();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const isInactiveAccount = profile?.account_status === "archived" || profile?.account_status === "cancelled";

  // Only show loading for auth init; skip subscription loading for inactive accounts or when profile hasn't loaded yet
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  // For active accounts, wait for subscription check to complete
  if (!isInactiveAccount && subscriptionLoading && profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If already subscribed, go to dashboard
  if (subscription?.subscribed) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubscribe = async (tierKey: string) => {
    const priceId = STRIPE_TIERS[tierKey as keyof typeof STRIPE_TIERS]?.price_id;
    if (!priceId) return;

    setLoadingTier(tierKey);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      toast({
        title: "Checkout failed",
        description: err.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={apolloLogo} alt="Apollo Nation" className="w-10 h-10 invert" />
            <span className="font-heading text-lg tracking-wider">
              APOLLO <span className="text-primary">NATION</span>
            </span>
          </Link>
          <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 max-w-5xl">
        {/* Welcome Back Banner */}
        {isInactiveAccount && (
          <div className="mb-10 border border-primary/30 bg-primary/[0.05] p-6 text-center">
            <h2 className="font-heading text-lg tracking-[0.1em] text-primary mb-2">Welcome Back</h2>
            <p className="text-muted-foreground text-sm font-light max-w-md mx-auto">
              We've missed you! Pick up where you left off by selecting a plan below to reactivate your account.
            </p>
          </div>
        )}

        {/* Heading */}
        <div className="text-center mb-16">
          <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl mb-4 tracking-[0.05em]">
            {isInactiveAccount ? "Reactivate Your" : "Choose Your"}
            <span className="text-primary block mt-2">Membership</span>
          </h1>
          <p className="text-muted-foreground text-base font-light max-w-md mx-auto">
            {isInactiveAccount
              ? "Choose a plan to regain access to your training dashboard and continue your journey."
              : "Select a plan to unlock your training dashboard and start your transformation."}
          </p>
        </div>

        {/* Tier Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative p-8 lg:p-10 border transition-all duration-500 ${
                tier.featured
                  ? "border-primary/50 bg-primary/[0.03] scale-[1.02]"
                  : "border-border/30 bg-card/50 hover:border-primary/30"
              }`}
            >
              {tier.featured && (
                <div className="absolute -top-px left-1/2 -translate-x-1/2 px-6 py-1.5 bg-primary">
                  <span className="text-[10px] font-medium text-primary-foreground uppercase tracking-[0.2em]">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-10 pt-4">
                <h3 className="font-heading text-xl tracking-[0.1em] mb-3">{tier.name}</h3>
                <p className="text-muted-foreground text-xs font-light mb-6">{tier.description}</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-muted-foreground text-lg font-light">$</span>
                  <span className={`font-heading text-4xl tracking-wide ${tier.featured ? 'text-primary' : 'text-foreground'}`}>
                    {tier.price}
                  </span>
                  <span className="text-muted-foreground text-sm font-light">/mo</span>
                </div>
              </div>

              <ul className="space-y-4 mb-10">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check size={14} className="text-primary flex-shrink-0 mt-1" strokeWidth={1.5} />
                    <span className="text-muted-foreground text-sm font-light">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={tier.featured ? "apollo" : "apollo-outline"}
                size="lg"
                className="w-full"
                disabled={loadingTier === tier.tierKey}
                onClick={() => handleSubscribe(tier.tierKey)}
              >
                {loadingTier === tier.tierKey ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Get Started
              </Button>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground/60 text-xs font-light tracking-wide">
            30-day satisfaction guarantee · Cancel anytime · Instant access
          </p>
        </div>
      </div>
    </div>
  );
};

export default Subscribe;
