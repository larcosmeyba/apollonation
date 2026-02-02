import { Dumbbell, Video, Users, Smartphone, Calendar, Trophy } from "lucide-react";

const features = [
  {
    icon: Video,
    title: "HD Workout Library",
    description: "Access 500+ professionally filmed exercise videos with detailed form guides and modifications."
  },
  {
    icon: Dumbbell,
    title: "Custom Programs",
    description: "AI-powered training programs tailored to your goals, equipment, and fitness level."
  },
  {
    icon: Users,
    title: "Community Support",
    description: "Connect with fellow warriors, share progress, and stay motivated with group challenges."
  },
  {
    icon: Smartphone,
    title: "Mobile App Access",
    description: "Train anywhere with our powerful iOS and Android app. Premium tiers unlock all app features."
  },
  {
    icon: Calendar,
    title: "Progress Tracking",
    description: "Log workouts, track PRs, and visualize your transformation with detailed analytics."
  },
  {
    icon: Trophy,
    title: "Achievement System",
    description: "Earn badges, climb leaderboards, and unlock rewards as you crush your fitness goals."
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
