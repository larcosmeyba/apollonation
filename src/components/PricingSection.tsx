import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const tiers = [
  {
    name: "Essential",
    price: "29",
    description: "Begin your wellness journey",
    features: [
      "On-demand workout library",
      "Nutrition recipes collection",
      "Progress tracking",
      "Community support",
      "Web platform access"
    ],
    appAccess: false,
    featured: false
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
    appAccess: true,
    featured: true
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
    appAccess: true,
    featured: false
  }
];

const PricingSection = () => {
  return (
    <section id="pricing" className="py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-apollo-charcoal-light/20 to-background" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-20">
          <span className="section-label mb-6 block">
            Membership
          </span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl mb-6 tracking-[0.05em]">
            Choose Your
            <span className="text-gradient-gold block mt-2">Path</span>
          </h2>
          <p className="text-muted-foreground text-base font-light leading-relaxed">
            Flexible plans designed for every stage of your wellness journey.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative p-8 lg:p-10 border transition-all duration-500 ${
                tier.featured
                  ? "border-apollo-gold/40 bg-card/50 scale-[1.02]"
                  : "border-border/50 bg-card/30 hover:border-apollo-gold/20"
              }`}
            >
              {/* Featured indicator */}
              {tier.featured && (
                <div className="absolute -top-px left-1/2 -translate-x-1/2 px-6 py-1 bg-apollo-gold">
                  <span className="text-[10px] font-medium text-primary-foreground uppercase tracking-[0.2em]">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Header */}
              <div className="text-center mb-10 pt-4">
                <h3 className="font-heading text-xl tracking-[0.1em] mb-3">{tier.name}</h3>
                <p className="text-muted-foreground text-xs font-light mb-6">{tier.description}</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-muted-foreground text-lg font-light">$</span>
                  <span className={`font-heading text-4xl tracking-wide ${tier.featured ? 'text-apollo-gold' : ''}`}>
                    {tier.price}
                  </span>
                  <span className="text-muted-foreground text-sm font-light">/mo</span>
                </div>
              </div>

              {/* App Access Badge */}
              {tier.appAccess && (
                <div className="flex items-center justify-center gap-2 py-3 px-4 border border-apollo-gold/20 bg-apollo-gold/5 mb-8">
                  <span className="text-apollo-gold text-xs font-light tracking-wide">
                    ✓ Includes Mobile App
                  </span>
                </div>
              )}

              {/* Features */}
              <ul className="space-y-4 mb-10">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check size={14} className="text-apollo-gold flex-shrink-0 mt-1" strokeWidth={1.5} />
                    <span className="text-muted-foreground text-sm font-light">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                variant={tier.featured ? "apollo" : "apollo-outline"}
                size="lg"
                className="w-full"
              >
                Get Started
              </Button>
            </div>
          ))}
        </div>

        {/* Guarantee */}
        <div className="text-center mt-16">
          <p className="text-muted-foreground text-xs font-light tracking-wide">
            30-day satisfaction guarantee · Cancel anytime · Instant access
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;