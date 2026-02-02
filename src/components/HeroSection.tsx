import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import fitnessHero from "@/assets/fitness-1.png";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${fitnessHero})` }}
      />
      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/60" />
      
      {/* Animated background elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-apollo-gold/5 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-apollo-copper/5 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
      
      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--apollo-gold) / 0.3) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--apollo-gold) / 0.3) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-apollo-gold/30 bg-apollo-gold/5 mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-apollo-gold animate-pulse" />
            <span className="text-sm text-apollo-gold font-medium">Transform Your Body, Elevate Your Mind</span>
          </div>

          {/* Main Heading */}
          <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl leading-none mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            UNLEASH YOUR
            <span className="block text-gradient-gold">INNER APOLLO</span>
          </h1>

          {/* Subheading */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Join the nation of warriors. Access world-class training programs, 
            personalized workouts, and a community that pushes you to be legendary.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Button variant="apollo" size="xl" className="group">
              Start Your Journey
              <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="apollo-outline" size="xl" className="group">
              <Play size={18} className="mr-1" />
              Watch Preview
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-16 pt-16 border-t border-border/50 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            {[
              { value: "50K+", label: "Active Members" },
              { value: "500+", label: "Workout Programs" },
              { value: "98%", label: "Success Rate" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-heading text-3xl md:text-4xl text-apollo-gold mb-2">{stat.value}</div>
                <div className="text-sm text-muted-foreground uppercase tracking-wide">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default HeroSection;
