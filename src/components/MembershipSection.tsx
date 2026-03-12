import { useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { STRIPE_TIERS } from "@/config/stripe";

const programs = [
  {
    name: "APOLLO STRENGTH",
    description: "Advanced resistance training.",
    tierKey: "basic" as const,
  },
  {
    name: "APOLLO SCULPT",
    description: "Aesthetic performance training.",
    tierKey: "pro" as const,
  },
  {
    name: "APOLLO ENDURANCE",
    description: "Elite conditioning.",
    tierKey: "elite" as const,
  },
];

const MembershipSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

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
    <section id="membership" className="py-32 relative overflow-hidden" ref={ref}>
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <span className={`section-label mb-6 block transition-all duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            Membership
          </span>
          <h2 className={`font-heading text-3xl md:text-5xl lg:text-6xl tracking-[0.1em] text-foreground transition-all duration-1000 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            CHOOSE YOUR
            <span className="block text-foreground/50 mt-2">PATH</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {programs.map((program, i) => (
            <div
              key={program.name}
              className={`group relative p-8 lg:p-10 rounded-2xl border border-border bg-card/60 backdrop-blur-sm transition-all duration-700 hover:border-primary/30 hover:-translate-y-1 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ 
                transitionDelay: `${200 + i * 150}ms`,
                boxShadow: 'var(--shadow-card)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-glow)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)';
              }}
            >
              {/* Subtle glow edge on hover */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10">
                <h3 className="font-heading text-xl md:text-2xl tracking-[0.12em] text-foreground mb-4">
                  {program.name}
                </h3>
                <p className="text-muted-foreground text-sm font-light mb-8">
                  {program.description}
                </p>

                <Button
                  variant="apollo-outline"
                  className="w-full rounded-full group/btn"
                  disabled={isCurrentTier(program.tierKey) || loadingTier === program.tierKey}
                  onClick={() => handleSubscribe(program.tierKey)}
                >
                  {loadingTier === program.tierKey && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {isCurrentTier(program.tierKey) ? "Current Plan" : "Learn More"}
                  {!isCurrentTier(program.tierKey) && <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MembershipSection;