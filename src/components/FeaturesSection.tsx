import { Dumbbell, Video, Users, Smartphone, Camera, Utensils } from "lucide-react";

const features = [
  {
    icon: Video,
    title: "Curated Programs",
    description: "Access our library of professionally crafted workout programs with detailed guidance."
  },
  {
    icon: Dumbbell,
    title: "Expert Training",
    description: "Programs designed by Coach Marcos, tailored to elevate your practice and results."
  },
  {
    icon: Users,
    title: "Personal Guidance",
    description: "Direct coaching support to guide you through every step of your transformation."
  },
  {
    icon: Smartphone,
    title: "Seamless Access",
    description: "Train anywhere with our iOS and Android app. Premium tiers unlock all features."
  },
  {
    icon: Camera,
    title: "Intelligent Tracking",
    description: "AI-powered macro tracking from a simple photo. Exclusive to Elite members."
  },
  {
    icon: Utensils,
    title: "Mindful Nutrition",
    description: "Personalized nutrition plans for all dietary preferences. Elite tier exclusive."
  }
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-32 relative">
      {/* Subtle divider */}
      <div className="absolute top-0 left-0 right-0 divider-gold" />
      
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-20">
          <span className="section-label mb-6 block">
            The Experience
          </span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl mb-6 tracking-[0.05em]">
            Everything You Need
            <span className="text-gradient-gold block mt-2">To Transform</span>
          </h2>
          <p className="text-muted-foreground text-base font-light leading-relaxed">
            A complete wellness ecosystem designed to elevate both body and mind.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-8 border border-border/50 hover:border-apollo-gold/30 transition-all duration-700 bg-card/30"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Icon */}
              <div className="w-12 h-12 flex items-center justify-center mb-6 border border-apollo-gold/20 group-hover:border-apollo-gold/40 transition-colors duration-500">
                <feature.icon className="w-5 h-5 text-apollo-gold" strokeWidth={1.5} />
              </div>

              {/* Content */}
              <h3 className="font-heading text-lg mb-4 tracking-[0.08em] group-hover:text-apollo-gold transition-colors duration-500">
                {feature.title}
              </h3>
              <p className="text-muted-foreground font-light leading-relaxed text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;