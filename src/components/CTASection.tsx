import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import heroImage from "@/assets/marcos-9.jpg";

const CTASection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative py-40 overflow-hidden" ref={ref}>
      {/* Cinematic background */}
      <img
        src={heroImage}
        alt=""
        role="presentation"
        className="absolute inset-0 w-full h-full object-cover object-center opacity-30"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-background/70" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(222_100%_68%/0.06)_0%,_transparent_70%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className={`font-heading text-3xl md:text-5xl lg:text-7xl tracking-[0.1em] mb-12 text-foreground transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            ELEVATE YOUR
            <span className="block text-foreground/50 mt-2">POTENTIAL</span>
          </h2>
          
          <div className={`transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <Link to="/auth">
              <Button className="btn-cosmic min-w-[220px] h-14 text-sm group">
                Join Apollo
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;