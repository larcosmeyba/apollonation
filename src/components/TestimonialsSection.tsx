import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Marcus J.",
    content: "Apollo Nation makes it easy to stay consistent with my workouts.",
    rating: 5,
  },
  {
    name: "Sarah K.",
    content: "A powerful fitness platform that fits my schedule.",
    rating: 5,
  },
  {
    name: "David R.",
    content: "Simple, focused, and effective. Exactly what I needed.",
    rating: 5,
  },
];

const TestimonialsSection = () => {
  return (
    <section id="testimonials" className="py-12 md:py-16 border-t border-white/5">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-4 block font-light">
            Community
          </span>
          <h2 className="font-heading text-3xl md:text-4xl text-white tracking-wide">
            Real Results
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {testimonials.map((t) => (
            <div key={t.name} className="p-5 border border-white/10 bg-card rounded-2xl">
              <div className="flex gap-0.5 mb-3">
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} size={10} className="text-white/50 fill-white/50" />
                ))}
              </div>
              <p className="text-white/50 text-sm font-light leading-relaxed mb-4">
                "{t.content}"
              </p>
              <span className="text-white/60 text-xs font-light">— {t.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
