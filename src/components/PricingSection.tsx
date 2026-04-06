import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const FEATURES = [
  "Unlimited on-demand workouts",
  "Personalized training programs",
  "Macro tracking & nutrition plans",
  "Recipe library & grocery lists",
  "Progress & transformation tracking",
  "Recovery & wellness tools",
  "Community challenges",
  "Direct coach messaging",
];

const PricingSection = () => {
  const navigate = useNavigate();

  return (
    <section id="pricing" className="py-20 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <span className="text-white/70 font-medium text-[10px] uppercase tracking-[0.25em] mb-6 block">
            Membership
          </span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl mb-6 tracking-[0.03em] text-white">
            One Membership.<span className="text-white/70 block mt-2">Unlimited Access.</span>
          </h2>
          <p className="text-white/70 text-base font-light leading-relaxed">
            Download the app and subscribe through the Apple App Store or Google Play Store.
          </p>
        </div>

        <div className="max-w-lg mx-auto">
          <div className="relative p-8 lg:p-10 border border-white/20 bg-card/80 rounded-xl">
            <div className="absolute -top-px left-1/2 -translate-x-1/2 px-5 py-1 bg-white rounded-b-lg">
              <span className="text-[9px] font-semibold text-background uppercase tracking-[0.2em]">
                Full Access
              </span>
            </div>

            <div className="text-center mb-10 pt-4">
              <h3 className="font-heading text-xl tracking-[0.1em] mb-3 text-foreground">Apollo Nation</h3>
              <p className="text-foreground/60 text-xs font-light mb-6">
                Everything you need to train, fuel, and transform.
              </p>
              <p className="text-foreground/60 text-sm font-light">
                Available on the App Store & Google Play
              </p>
            </div>

            <ul className="space-y-4 mb-10">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check size={14} className="text-foreground/70 flex-shrink-0 mt-1" strokeWidth={1.5} />
                  <span className="text-foreground/60 text-sm font-light">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              variant="apollo"
              size="lg"
              className="w-full rounded-full"
              onClick={() => navigate("/auth")}
            >
              Get Started
            </Button>
          </div>
        </div>

        <div className="text-center mt-16">
          <p className="text-white/40 text-xs font-light tracking-wide">
            Cancel anytime · Manage subscription through your app store
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
