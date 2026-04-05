import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { STRIPE_TIERS } from "@/config/stripe";
import { TIER_FEATURES } from "@/config/tierFeatures";

const tierKeys = ["basic", "pro", "elite"] as const;

const PricingSection = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const handleSubscribe = async (tierKey: string) => {
    if (!user) { navigate("/auth"); return; }
    const priceId = STRIPE_TIERS[tierKey as keyof typeof STRIPE_TIERS]?.price_id;
    if (!priceId) return;
    setLoadingTier(tierKey);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", { body: { priceId } });
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
          <span className="text-white/70 font-medium text-[10px] uppercase tracking-[0.25em] mb-6 block">
            Membership
          </span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl mb-6 tracking-[0.03em] text-white">
            Choose Your<span className="text-white/70 block mt-2">Path</span>
          </h2>
          <p className="text-white/70 text-base font-light leading-relaxed">
            Flexible plans designed for every stage of your journey.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {tierKeys.map((key) => {
            const tier = STRIPE_TIERS[key];
            const feat = TIER_FEATURES[key];
            const featured = "featured" in feat && feat.featured;

            return (
              <div
                key={key}
                className={`relative p-6 lg:p-8 border transition-all duration-500 rounded-xl ${
                  featured
                    ? "border-white/20 bg-card/80"
                    : "border-border bg-card/60 hover:border-white/10"
                }`}
              >
                {featured && (
                  <div className="absolute -top-px left-1/2 -translate-x-1/2 px-5 py-1 bg-white rounded-b-lg">
                    <span className="text-[9px] font-semibold text-background uppercase tracking-[0.2em]">
                      Most Popular
                    </span>
                  </div>
                )}

                {isCurrentTier(key) && (
                  <div className="absolute -top-px right-4 px-4 py-1 bg-accent rounded-b-lg">
                    <span className="text-[9px] font-medium text-accent-foreground uppercase tracking-[0.2em]">
                      Your Plan
                    </span>
                  </div>
                )}

                <div className="text-center mb-10 pt-4">
                  <h3 className="font-heading text-lg tracking-[0.1em] mb-3 text-foreground">{tier.name}</h3>
                  <p className="text-foreground/60 text-xs font-light mb-6">{feat.description}</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-foreground/70 text-lg font-light">$</span>
                    <span className="font-heading text-4xl tracking-wide text-foreground">{tier.price}</span>
                    <span className="text-foreground/60 text-sm font-light">/mo</span>
                  </div>
                </div>

                <ul className="space-y-4 mb-10">
                  {feat.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check size={14} className="text-foreground/70 flex-shrink-0 mt-1" strokeWidth={1.5} />
                      <span className="text-foreground/60 text-sm font-light">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={featured ? "apollo" : "apollo-outline"}
                  size="lg"
                  className="w-full rounded-full"
                  disabled={isCurrentTier(key) || loadingTier === key}
                  onClick={() => handleSubscribe(key)}
                >
                  {loadingTier === key && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {isCurrentTier(key) ? "Current Plan" : feat.buttonLabel}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-16">
          <p className="text-white/40 text-xs font-light tracking-wide">
            30-day satisfaction guarantee · Cancel anytime · Instant access
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
