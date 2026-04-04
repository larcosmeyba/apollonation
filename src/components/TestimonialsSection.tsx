import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Marcus J.",
    content: "The workouts are legit. I follow the programs, track my meals, and the results came faster than I expected.",
    rating: 5,
  },
  {
    name: "Sarah K.",
    content: "Finally an app that keeps it simple. Programs are structured, nutrition is easy to follow, and I can train on my own time.",
    rating: 5,
  },
  {
    name: "David R.",
    content: "I've tried every fitness app out there. Apollo Nation is the one I actually stuck with. Clean, focused, no BS.",
    rating: 5,
  },
];

const TestimonialsSection = () => {
  return (
    <section id="testimonials" className="py-20 md:py-28 border-t border-white/5">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-4 block font-light">
            Community
          </span>
          <h2 className="font-heading text-3xl md:text-4xl text-white tracking-wide">
            Real Results
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="relative p-6 border border-white/10 bg-card rounded-2xl"
            >
              <Quote className="absolute top-5 right-5 w-6 h-6 text-white/5" strokeWidth={1} />

              <div className="flex gap-0.5 mb-4">
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} size={10} className="text-white/60 fill-white/60" />
                ))}
              </div>

              <p className="text-white/50 mb-6 leading-relaxed font-light text-sm">
                "{t.content}"
              </p>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 border border-white/10 flex items-center justify-center bg-muted rounded-full">
                  <span className="font-heading text-white/50 text-xs">{t.name[0]}</span>
                </div>
                <span className="text-white/70 text-sm font-light">{t.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
