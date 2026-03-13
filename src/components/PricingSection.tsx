import { useState, useEffect, useRef } from "react";
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
    description: "Build the foundation",
    features: [
      "On-demand workout library",
      "Curated recipe collection",
      "Daily step tracker",
      "Progress tracking dashboard",
      "Community support",
      "Web & mobile access",
    ],
    tierKey: "basic" as const,
    featured: false,
  },
  {
    name: "Premier",
    price: "59",
    description: "Train with purpose",
    features: [
      "Everything in Essential",
      "Custom training plan by Coach Marcos",
      "Personalized nutrition plan",
      "AI-powered macro tracking",
      "AI food photo scanner",
      "Exercise swap suggestions",
      "Priority support",
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
      "1-on-1 messaging with Coach Marcos",
      "Weekly meal plan refresh",
      "AI grocery list generator",
      "Custom meal planning & swaps",
      "Early access to new content",
      "VIP community access",
    ],
    tierKey: "elite" as const,
    featured: false,
  },
];

const PricingSection = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

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
    <section id="pricing" className="py-28 relative overflow-hidden" ref={ref}>
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-20">
          <span
            className={`section-label mb-6 block transition-all duration-700 ${isVisible ? "opacity-100" : "opacity-0"}`}
          >
            Membership
          </span>
          <h2
            className={`font-heading text-3xl md:text-4xl lg:text-5xl mb-6 tracking-[0.08em] text-foreground transition-all duration-1000 delay-100 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            Choose Your
            <span className="text-foreground/50 block mt-2">Path</span>
          </h2>
          <p
            className={`text-muted-foreground text-base font-light leading-relaxed max-w-md mx-auto transition-all duration-1000 delay-200 ${
              isVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            Flexible plans designed for every stage of your journey. All plans include the onboarding questionnaire so Coach Marcos can personalize your experience.
          </p>
        </div>

        {/* Tier Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {tiers.map((tier, i) => (
            <div
              key={tier.name}
              className={`group relative p-7 lg:p-9 rounded-2xl transition-all duration-700 hover:-translate-y-1 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{
                transitionDelay: `${200 + i * 150}ms`,
                background: tier.featured
                  ? "rgba(30, 34, 28, 0.9)"
                  : "rgba(23, 22, 20, 0.82)",
                backdropFilter: "blur(18px)",
                WebkitBackdropFilter: "blur(18px)",
                border: tier.featured
                  ? "1px solid rgba(95, 111, 82, 0.35)"
                  : "1px solid rgba(255,255,255,0.05)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
              }}
            >
              {/* Featured badge */}
              {tier.featured && (
                <div className="absolute -top-px left-1/2 -translate-x-1/2 px-6 py-1.5 bg-primary rounded-b-lg">
                  <span className="text-[9px] font-semibold text-primary-foreground uppercase tracking-[0.2em]">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Current plan badge */}
              {isCurrentTier(tier.tierKey) && (
                <div className="absolute -top-px right-4 px-4 py-1 bg-accent rounded-b-lg">
                  <span className="text-[9px] font-medium text-accent-foreground uppercase tracking-[0.2em]">
                    Your Plan
                  </span>
                </div>
              )}

              {/* Hover glow */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative z-10">
                {/* Title & Price */}
                <div className="text-center mb-8 pt-4">
                  <h3 className="font-heading text-lg tracking-[0.1em] mb-2 text-foreground">
                    {tier.name}
                  </h3>
                  <p className="text-muted-foreground text-xs font-light mb-5">
                    {tier.description}
                  </p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-muted-foreground text-lg font-light">$</span>
                    <span
                      className={`font-heading text-4xl tracking-wide ${
                        tier.featured ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {tier.price}
                    </span>
                    <span className="text-muted-foreground text-sm font-light">/mo</span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3.5 mb-9">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check
                        size={14}
                        className="text-primary flex-shrink-0 mt-0.5"
                        strokeWidth={1.5}
                      />
                      <span className="text-muted-foreground text-sm font-light">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  variant={tier.featured ? "apollo" : "apollo-outline"}
                  size="lg"
                  className="w-full rounded-full"
                  disabled={isCurrentTier(tier.tierKey) || loadingTier === tier.tierKey}
                  onClick={() => handleSubscribe(tier.tierKey)}
                >
                  {loadingTier === tier.tierKey && (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  )}
                  {isCurrentTier(tier.tierKey) ? "Current Plan" : "Get Started"}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-14">
          <p className="text-muted-foreground/50 text-xs font-light tracking-wide">
            30-day satisfaction guarantee · Cancel anytime · Instant access
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
