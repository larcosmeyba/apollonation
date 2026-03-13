import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroImage from "@/assets/marcos-4.jpg";
import { useEffect, useState } from "react";

const HeroSection = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <header className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 w-full" role="banner">
      <img
        src={heroImage}
        alt=""
        role="presentation"
        fetchPriority="high"
        decoding="async"
        className={`absolute inset-0 w-full h-full object-cover object-[50%_20%] transition-transform duration-[2000ms] ease-out ${isVisible ? 'scale-100' : 'scale-110'}`}
      />
      <div className="absolute inset-0 bg-background/70" />
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-background to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <div 
            className={`inline-flex items-center gap-2 px-5 py-2 border border-foreground/20 bg-foreground/10 backdrop-blur-sm mb-8 rounded-full transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse flex-shrink-0" />
            <span className="text-[10px] text-foreground font-medium tracking-[0.2em] uppercase">
              Elite Fitness Coaching
            </span>
          </div>

          <h1 
            className={`font-heading text-4xl sm:text-5xl md:text-6xl lg:text-8xl leading-[1.05] mb-8 tracking-[0.02em] transition-all duration-1000 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <span className="block text-foreground">Forge Your</span>
            <span className="block text-foreground/80 mt-2">Legend</span>
          </h1>

          <p 
            className={`text-lg md:text-xl text-white/80 max-w-xl mx-auto mb-12 font-light leading-relaxed transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            Elite training programs, personalized coaching, and custom nutrition plans—
            designed for those who refuse to be ordinary.
          </p>

          <div 
            className={`flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <Link to="/auth">
              <Button variant="apollo" size="lg" className="group min-w-[220px] h-14 text-base rounded-full">
                Start Your Journey
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
              </Button>
            </Link>
            <a href="#features">
              <Button variant="apollo-outline" size="lg" className="min-w-[200px] h-14 text-base rounded-full">
                Explore Coaching
              </Button>
            </a>
          </div>

          <div 
            className={`grid grid-cols-3 gap-6 mt-16 pt-8 border-t border-foreground/20 max-w-lg mx-auto transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            {[
              { value: "Training", label: "Structured programs tailored to your goals" },
              { value: "Nutrition", label: "Weekly meal plans that adapt to you" },
              { value: "Support", label: "Premium accountability & tracking" },
            ].map((stat) => (
              <div key={stat.value}>
                <div className="font-heading text-lg md:text-xl text-foreground mb-1 tracking-wide">
                  {stat.value}
                </div>
                <div className="text-[10px] text-foreground/70 leading-relaxed">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background via-background/80 to-transparent" />
      
      <div 
        className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 transition-all duration-1000 delay-700 ${isVisible ? 'opacity-40' : 'opacity-0'}`}
      >
        <span className="text-[10px] text-foreground/40 uppercase tracking-widest">Scroll</span>
        <div className="w-px h-8 bg-gradient-to-b from-foreground/30 to-transparent animate-pulse" />
      </div>
    </header>
  );
};

export default HeroSection;
