import { useEffect, useRef, useState } from "react";
import marcosImage from "@/assets/marcos-2.jpg";

const FounderSection = () => {
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
    <section className="py-32 relative overflow-hidden" ref={ref}>
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          {/* Photo */}
          <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden">
              <img
                src={marcosImage}
                alt="Marcos Leyba, Founder of Apollo Nation"
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
            </div>
          </div>

          {/* Text */}
          <div className={`transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
            <span className="section-label mb-6 block">Founder</span>
            <h2 className="font-heading text-3xl md:text-5xl tracking-[0.1em] text-foreground mb-8">
              MARCOS
              <span className="block text-foreground/50 mt-2">LEYBA</span>
            </h2>
            <div className="w-12 h-px bg-primary/40 mb-8" />
            <p className="text-muted-foreground text-base font-light leading-relaxed mb-4">
              Founder of Apollo Nation.
            </p>
            <p className="text-muted-foreground text-base font-light leading-relaxed">
              Fitness coach and performance specialist dedicated to elevating the standard of personal training through precision programming and unwavering discipline.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FounderSection;