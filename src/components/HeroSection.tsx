import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroStatue from "@/assets/hero-statue.png";
import { useEffect, useState } from "react";

const HeroSection = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background image - native img for better loading control */}
      <img
        src={heroStatue}
        alt=""
        role="presentation"
        fetchPriority="high"
        decoding="async"
        className={`absolute inset-0 w-full h-full object-cover transition-transform duration-[2000ms] ease-out ${isVisible ? 'scale-100' : 'scale-110'}`}
      />
      {/* Dramatic gradient overlay - centered */}
      <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/60 to-background/90" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50" />
      
      {/* Ambient glow - reduced from two heavy blurs to one lighter one */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-[120px]" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Animated badge */}
          <div 
            className={`inline-flex items-center gap-3 px-6 py-2.5 border border-primary/30 bg-primary/5 backdrop-blur-sm mb-10 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-primary font-medium tracking-[0.25em] uppercase">
              Transform Your Body & Mind
            </span>
          </div>

          {/* Main Heading with staggered animation */}
          <h1 
            className={`font-heading text-5xl md:text-6xl lg:text-8xl leading-[1.05] mb-8 tracking-[0.03em] transition-all duration-1000 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <span className="block text-white">Forge Your</span>
            <span 
              className="block text-primary mt-2"
              style={{ textShadow: '0 0 80px hsl(32 45% 72% / 0.4)' }}
            >
              Legend
            </span>
          </h1>

          {/* Subheading */}
          <p 
            className={`text-lg md:text-xl text-white/60 max-w-xl mx-auto mb-12 font-light leading-relaxed transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            Elite training programs, personalized coaching, and AI-powered nutrition—
            designed for those who refuse to be ordinary.
          </p>

          {/* CTA Buttons */}
          <div 
            className={`flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <Link to="/auth">
              <Button variant="apollo" size="lg" className="group min-w-[220px] h-14 text-base">
                Start Your Journey
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
              </Button>
            </Link>
            <a href="#testimonials">
              <Button variant="apollo-outline" size="lg" className="group min-w-[180px] h-14 text-base">
                <Play size={16} className="mr-2" />
                Watch Story
              </Button>
            </a>
          </div>

          {/* Stats row */}
          <div 
            className={`flex flex-wrap justify-center gap-8 md:gap-16 mt-16 pt-10 border-t border-primary/20 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            {[
              { value: "50K+", label: "Athletes" },
              { value: "500+", label: "Programs" },
              { value: "98%", label: "Success Rate" },
            ].map((stat, index) => (
              <div key={stat.label} className="text-center" style={{ transitionDelay: `${600 + index * 100}ms` }}>
                <div 
                  className="font-heading text-3xl md:text-4xl text-primary mb-1 tracking-wide"
                  style={{ textShadow: '0 0 40px hsl(32 45% 72% / 0.3)' }}
                >
                  {stat.value}
                </div>
                <div className="text-sm text-white/50 uppercase tracking-[0.15em]">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background via-background/80 to-transparent" />
      
      {/* Scroll indicator */}
      <div 
        className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 transition-all duration-1000 delay-700 ${isVisible ? 'opacity-50' : 'opacity-0'}`}
      >
        <span className="text-xs text-white/40 uppercase tracking-widest">Scroll</span>
        <div className="w-px h-8 bg-gradient-to-b from-primary/50 to-transparent animate-pulse" />
      </div>
    </section>
  );
};

export default HeroSection;
