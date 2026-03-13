import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { STRIPE_TIERS } from "@/config/stripe";

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
    featured: false,
    tierKey: "basic" as const,
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
    featured: true,
    tierKey: "pro" as const,
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
    featured: false,
    tierKey: "elite" as const,
  }
];

const PricingSection = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const handleSubscribe = async (tierKey: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    const priceId = STRIPE_TIERS[tierKey as keyof typeof STRIPE_TIERS]?.price_id;
    if (!priceId) return;
    setLoadingTier(tierKey);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Checkout failed", description: err.message || "Please try again.", variant: "destructive" });
    } finally {
      setLoadingTier(null);
    }
  };

  const isCurrentTier = (tierKey: string) => profile?.subscription_tier === tierKey;

  return (
    <section id="pricing" className="py-20 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <span className="landing-text-muted font-medium text-[10px] uppercase tracking-[0.25em] mb-6 block">
            Membership
          </span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl mb-6 tracking-[0.03em] landing-text">
            Choose Your
            <span className="landing-text-muted block mt-2">Path</span>
          </h2>
          <p className="landing-text-muted text-base font-light leading-relaxed">
            Flexible plans designed for every stage of your journey.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative p-6 lg:p-8 border transition-all duration-500 rounded-xl bg-card text-card-foreground ${
                tier.featured
                  ? "border-white/25"
                  : "border-white/15 hover:border-white/25"
              }`}
            >
              {tier.featured && (
                <div className="absolute -top-px left-1/2 -translate-x-1/2 px-5 py-1 bg-card-foreground rounded-b-lg">
                  <span className="text-[9px] font-semibold text-card uppercase tracking-[0.2em]">
                    Most Popular
                  </span>
                </div>
              )}

              {isCurrentTier(tier.tierKey) && (
                <div className="absolute -top-px right-4 px-4 py-1 bg-accent rounded-b-lg">
                  <span className="text-[9px] font-medium text-accent-foreground uppercase tracking-[0.2em]">
                    Your Plan
                  </span>
                </div>
              )}

              <div className="text-center mb-10 pt-4">
                <h3 className="font-heading text-lg tracking-[0.1em] mb-3 text-card-foreground">{tier.name}</h3>
                <p className="text-card-foreground/60 text-xs font-light mb-6">{tier.description}</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-card-foreground/70 text-lg font-light">$</span>
                  <span className="font-heading text-4xl tracking-wide text-card-foreground">
                    {tier.price}
                  </span>
                  <span className="text-card-foreground/60 text-sm font-light">/mo</span>
                </div>
              </div>

              <ul className="space-y-4 mb-10">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check size={14} className="text-card-foreground/70 flex-shrink-0 mt-1" strokeWidth={1.5} />
                    <span className="text-card-foreground/60 text-sm font-light">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={tier.featured ? "apollo" : "apollo-outline"}
                size="lg"
                className="w-full rounded-full"
                disabled={isCurrentTier(tier.tierKey) || loadingTier === tier.tierKey}
                onClick={() => handleSubscribe(tier.tierKey)}
              >
                {loadingTier === tier.tierKey && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {isCurrentTier(tier.tierKey) ? "Current Plan" : "Get Started"}
              </Button>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <p className="landing-text-muted text-xs font-light tracking-wide opacity-60">
            30-day satisfaction guarantee · Cancel anytime · Instant access
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
