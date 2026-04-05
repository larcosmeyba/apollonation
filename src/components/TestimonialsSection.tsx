import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Marcus J.",
    content: "Apollo Nation makes it easy to stay consistent with my workouts. The structured programs keep me on track.",
    rating: 5,
  },
  {
    name: "Sarah K.",
    content: "A powerful fitness platform that fits my schedule. I love the on-demand workouts.",
    rating: 5,
  },
  {
    name: "David R.",
    content: "Simple, focused, and effective. Exactly what I needed to build real strength.",
    rating: 5,
  },
];

const TestimonialsSection = () => {
  return (
    <section id="testimonials" className="py-20 md:py-28 border-t border-border/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <span className="section-label text-accent mb-3 block">Community</span>
          <h2 className="font-heading text-3xl md:text-[40px] text-foreground leading-tight">
            Real Results From Real Members
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {testimonials.map((t) => (
            <div key={t.name} className="card-apollo">
              <div className="flex gap-1 mb-4">
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} size={14} className="text-accent fill-accent" />
                ))}
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed mb-5">
                "{t.content}"
              </p>
              <span className="text-foreground text-sm font-medium">— {t.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
