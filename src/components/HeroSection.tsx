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
      {/* Hero photo */}
      <img
        src={heroImage}
        alt=""
        role="presentation"
        fetchPriority="high"
        decoding="async"
        className={`absolute inset-0 w-full h-full object-cover object-[50%_20%] transition-transform duration-[2000ms] ease-out ${isVisible ? 'scale-100' : 'scale-110'}`}
      />
      {/* Layer 2 — Dark stone overlay */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(15,15,14,0.80) 0%, rgba(15,15,14,0.88) 45%, rgba(15,15,14,0.95) 100%)' }} />
      {/* Layer 3 — Marble texture overlay */}
      <div className="absolute inset-0" style={{ backgroundImage: "url('/images/marble-texture.jpeg')", backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.05, mixBlendMode: 'soft-light' as const }} />
      {/* Warm sunlight glow */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 0%, rgba(200,180,140,0.08), transparent 60%)' }} />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h1 
            className={`font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.05] mb-10 tracking-[0.14em] transition-all duration-1000 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <span className="block text-foreground">APOLLO</span>
            <span className="block text-muted-foreground mt-2">NATION</span>
          </h1>

          <div 
            className={`space-y-2 mb-14 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <p className="text-lg md:text-xl text-foreground/70 font-light tracking-[0.15em] uppercase">
              Strength
            </p>
            <p className="text-lg md:text-xl text-foreground/70 font-light tracking-[0.15em] uppercase">
              Discipline
            </p>
            <p className="text-lg md:text-xl text-primary font-light tracking-[0.15em] uppercase">
              Longevity
            </p>
          </div>

          <div 
            className={`flex flex-col sm:flex-row items-center justify-center gap-5 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <Link to="/auth">
              <Button className="btn-cosmic min-w-[220px] h-14 text-sm group">
                Join Apollo
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
              </Button>
            </Link>
            <a href="#philosophy">
              <Button variant="apollo-outline" size="lg" className="min-w-[200px] h-14 text-sm rounded-xl">
                Explore Training
              </Button>
            </a>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background via-background/80 to-transparent" />
      
      <div 
        className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 transition-all duration-1000 delay-700 ${isVisible ? 'opacity-40' : 'opacity-0'}`}
      >
        <span className="text-[10px] text-foreground/40 uppercase tracking-widest font-body">Scroll</span>
        <div className="w-px h-8 bg-gradient-to-b from-secondary/40 to-transparent animate-pulse" />
      </div>
    </header>
  );
};

export default HeroSection;