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
    <section id="features" className="py-16 relative">
      {/* Subtle divider */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-20">
          <span className="text-primary font-medium text-xs uppercase tracking-[0.25em] mb-6 block">
            The Experience
          </span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl mb-6 tracking-[0.03em] text-foreground break-words">
            Everything You Need
            <span className="text-primary block mt-2">To Transform</span>
          </h2>
          <p className="text-muted-foreground text-base font-light leading-relaxed">
            A complete wellness ecosystem designed to elevate both body and mind.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-8 border border-primary/10 hover:border-primary/40 transition-all duration-700 bg-card/30 hover:bg-card/60 rounded-2xl"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Icon */}
              <div className="w-12 h-12 flex items-center justify-center mb-6 border border-primary/30 group-hover:border-primary/60 group-hover:bg-primary/5 transition-all duration-500 rounded-full">
                <feature.icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
              </div>

              {/* Content */}
              <h3 className="font-heading text-lg mb-4 tracking-[0.08em] text-foreground group-hover:text-primary transition-colors duration-500">
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
