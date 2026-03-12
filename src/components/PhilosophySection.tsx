import { useEffect, useRef, useState } from "react";
import marcosImage from "@/assets/marcos-raw-97.jpg";

const pillars = [
  { word: "Strength", description: "Build unshakable power from the inside out." },
  { word: "Discipline", description: "Consistency over motivation. Every single day." },
  { word: "Longevity", description: "Train for the decades ahead, not just tomorrow." },
];

const PhilosophySection = () => {
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
    <section id="philosophy" className="relative py-32 overflow-hidden" ref={ref}>
      {/* Background image */}
      <img
        src={marcosImage}
        alt=""
        role="presentation"
        className="absolute inset-0 w-full h-full object-cover object-center opacity-20"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-background/85" />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <span className={`section-label mb-6 block transition-all duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            Philosophy
          </span>
          <h2 className={`font-heading text-3xl md:text-5xl lg:text-6xl tracking-[0.1em] mb-20 text-foreground transition-all duration-1000 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            THE APOLLO
            <span className="block text-foreground/50 mt-2">STANDARD</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-8">
            {pillars.map((pillar, i) => (
              <div
                key={pillar.word}
                className={`text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${200 + i * 150}ms` }}
              >
                <h3 className="font-heading text-2xl md:text-3xl tracking-[0.15em] text-foreground mb-4">
                  {pillar.word}
                </h3>
                <div className="w-8 h-px bg-primary/40 mx-auto mb-4" />
                <p className="text-muted-foreground text-sm font-light leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PhilosophySection;