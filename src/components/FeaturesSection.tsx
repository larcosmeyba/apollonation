import { Dumbbell, Video, Users, Smartphone, Camera, Utensils } from "lucide-react";

const features = [
  {
    icon: Video,
    title: "HD Workout Library",
    description: "Access 100 professionally filmed exercise videos with detailed form guides and modifications."
  },
  {
    icon: Dumbbell,
    title: "Coach Marcos Training",
    description: "Training programs designed by founder Marcos Leyba, tailored to your goals and fitness level."
  },
  {
    icon: Users,
    title: "Direct Coaching Support",
    description: "Get personal guidance and support directly from Coach Marcos throughout your fitness journey."
  },
  {
    icon: Smartphone,
    title: "Mobile App Access",
    description: "Train anywhere with our powerful iOS and Android app. Premium tiers unlock all app features."
  },
  {
    icon: Camera,
    title: "AI Macro Tracking",
    description: "Snap a photo of your meal and let AI estimate your macros instantly. Elite members only."
  },
  {
    icon: Utensils,
    title: "AI Nutrition Guidance",
    description: "Personalized nutrition plans supporting all diets—vegan, keto, and more. Elite tier exclusive."
  }
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 relative">
      {/* Background accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-apollo-gold/30 to-transparent" />
      
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-apollo-gold font-medium text-sm uppercase tracking-widest mb-4 block">
            What You Get
          </span>
          <h2 className="font-heading text-4xl md:text-5xl mb-6">
            EVERYTHING YOU NEED TO
            <span className="text-gradient-gold block">DOMINATE</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            A complete fitness ecosystem designed to transform you into the best version of yourself.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group card-apollo hover:border-apollo-gold/50 transition-all duration-500"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Icon */}
              <div className="w-14 h-14 rounded-xl bg-apollo-gold/10 flex items-center justify-center mb-5 group-hover:bg-apollo-gold/20 transition-colors">
                <feature.icon className="w-7 h-7 text-apollo-gold" />
              </div>

              {/* Content */}
              <h3 className="font-heading text-xl mb-3 group-hover:text-apollo-gold transition-colors">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
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
