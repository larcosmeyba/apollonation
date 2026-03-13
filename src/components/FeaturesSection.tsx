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
    description: "Train anywhere with full mobile access. Premium tiers unlock all features."
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
    <section id="features" className="py-20 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
      
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <span className="landing-text-muted font-medium text-[10px] uppercase tracking-[0.25em] mb-6 block">
            The Experience
          </span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl mb-6 tracking-[0.03em] landing-text">
            Everything You Need
            <span className="landing-text-muted block mt-2">To Transform</span>
          </h2>
          <p className="landing-text-muted text-base font-light leading-relaxed">
            A complete wellness ecosystem designed to elevate both body and mind.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group p-8 border border-white/15 bg-card text-card-foreground hover:border-white/30 transition-all duration-700 rounded-xl"
            >
              <div className="w-11 h-11 flex items-center justify-center mb-6 border border-white/15 group-hover:border-white/30 transition-all duration-500 rounded-full">
                <feature.icon className="w-5 h-5 text-card-foreground/70 group-hover:text-card-foreground transition-colors" strokeWidth={1.5} />
              </div>
              <h3 className="font-heading text-base mb-3 tracking-[0.08em] text-card-foreground group-hover:text-card-foreground transition-colors duration-500">
                {feature.title}
              </h3>
              <p className="text-card-foreground/60 font-light leading-relaxed text-sm">
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
