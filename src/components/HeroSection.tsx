import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroStatue from "@/assets/hero-statue.png";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background image - Greek statue */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroStatue})` }}
      />
      {/* Elegant dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/70" />
      
      {/* Subtle ambient glow */}
      <div className="absolute top-1/4 left-1/4 w-[700px] h-[700px] bg-primary/10 rounded-full blur-[150px] animate-pulse-glow" />
      
      {/* Minimal grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--apollo-gold) / 0.2) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--apollo-gold) / 0.2) 1px, transparent 1px)`,
          backgroundSize: '80px 80px'
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Refined badge with Aegean Fog accent */}
          <div className="inline-flex items-center gap-3 px-6 py-2 border border-accent/40 bg-accent/10 mb-10 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span className="text-xs text-accent font-medium tracking-[0.2em] uppercase">
              Elevate Your Practice
            </span>
          </div>

          {/* Main Heading - Cinzel font, elegant spacing */}
          <h1 className="font-heading text-4xl md:text-6xl lg:text-7xl leading-[1.1] mb-8 animate-fade-in tracking-[0.05em]" style={{ animationDelay: '0.1s' }}>
            Discover Your
            <span className="block mt-2 bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">Inner Strength</span>
          </h1>

          {/* Subheading - Warm Greige for coziness */}
          <p className="text-base md:text-lg text-apollo-taupe max-w-xl mx-auto mb-12 animate-fade-in font-light leading-relaxed" style={{ animationDelay: '0.2s' }}>
            Experience the art of transformation through curated training programs, 
            mindful movement, and a community dedicated to excellence.
          </p>

          {/* CTA Buttons - Minimal, elegant */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Button variant="apollo" size="lg" className="group min-w-[200px]">
              Begin Your Journey
              <ArrowRight className="group-hover:translate-x-1 transition-transform" size={16} />
            </Button>
            <Button variant="apollo-outline" size="lg" className="group min-w-[200px]">
              <Play size={14} />
              Watch Film
            </Button>
          </div>

          {/* Stats - Refined, understated */}
          <div className="grid grid-cols-3 gap-12 mt-20 pt-12 border-t border-accent/30 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            {[
              { value: "50K+", label: "Members" },
              { value: "500+", label: "Programs" },
              { value: "98%", label: "Success" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-heading text-2xl md:text-3xl text-primary mb-2 tracking-wide" style={{ textShadow: '0 0 30px hsl(220 15% 75% / 0.4)' }}>{stat.value}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-[0.2em] font-light">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default HeroSection;