import { Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const tiers = [
  {
    name: "BASIC",
    price: "29",
    description: "Perfect for getting started with Coach Marcos",
    features: [
      "100 HD On-Demand Workouts",
      "Nutrition Recipes Library",
      "Progress tracking",
      "Coach Marcos support",
      "Website access"
    ],
    appAccess: false,
    featured: false
  },
  {
    name: "PRO",
    price: "59",
    description: "For serious athletes ready to level up",
    features: [
      "Everything in Basic",
      "Advanced training programs",
      "Personalized workout plans from Marcos",
      "Nutrition guides",
      "Live Q&A with Coach Marcos",
      "Priority support"
    ],
    appAccess: true,
    featured: true
  },
  {
    name: "ELITE",
    price: "99",
    description: "The ultimate transformation experience",
    features: [
      "Everything in Pro",
      "AI-Powered Macro Tracking (photo upload)",
      "AI Nutrition Guidance (all diets supported)",
      "1-on-1 coaching with Marcos",
      "Custom meal plans",
      "Early access to new content",
      "VIP community access"
    ],
    appAccess: true,
    featured: false
  }
];

const PricingSection = () => {
  return (
    <section id="pricing" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-apollo-charcoal-light/30 to-background" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-apollo-gold font-medium text-sm uppercase tracking-widest mb-4 block">
            Membership Plans
          </span>
          <h2 className="font-heading text-4xl md:text-5xl mb-6">
            CHOOSE YOUR
            <span className="text-gradient-gold block">PATH TO GLORY</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Flexible plans designed for every stage of your fitness journey. All plans include access to our web platform.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {tiers.map((tier, index) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl p-8 ${
                tier.featured
                  ? "card-apollo-featured scale-105 md:scale-110"
                  : "card-apollo"
              }`}
            >
              {/* Featured badge */}
              {tier.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-apollo-gold to-apollo-copper rounded-full">
                  <div className="flex items-center gap-1.5">
                    <Zap size={14} className="text-primary-foreground" />
                    <span className="text-xs font-bold text-primary-foreground uppercase tracking-wide">
                      Most Popular
                    </span>
                  </div>
                </div>
              )}

              {/* Header */}
              <div className="text-center mb-8">
                <h3 className="font-heading text-2xl mb-2">{tier.name}</h3>
                <p className="text-muted-foreground text-sm mb-4">{tier.description}</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-muted-foreground text-xl">$</span>
                  <span className={`font-heading text-5xl ${tier.featured ? 'text-apollo-gold' : ''}`}>
                    {tier.price}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </div>

              {/* App Access Badge */}
              {tier.appAccess && (
                <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-apollo-gold/10 border border-apollo-gold/20 mb-6">
                  <span className="text-apollo-gold text-sm font-medium">
                    ✓ Includes APOLLO NATION App
                  </span>
                </div>
              )}

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check size={18} className="text-apollo-gold flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground text-sm">{feature}</span>
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
        <div className="text-center mt-12">
          <p className="text-muted-foreground text-sm">
            30-day money-back guarantee • Cancel anytime • Instant access
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
