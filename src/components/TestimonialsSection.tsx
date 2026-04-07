import { Star, User } from "lucide-react";

const testimonials = [
  {
    name: "Marcus J.",
    content: "Apollo Reborn makes it easy to stay consistent with my workouts. The structured programs keep me on track.",
    rating: 5,
    initials: "MJ",
  },
  {
    name: "Sarah K.",
    content: "A powerful fitness platform that fits my schedule. I love the on-demand workouts.",
    rating: 5,
    initials: "SK",
  },
  {
    name: "David R.",
    content: "Simple, focused, and effective. Exactly what I needed to build real strength.",
    rating: 5,
    initials: "DR",
  },
];

const TestimonialsSection = () => {
  return (
    <section id="testimonials" className="py-20 md:py-28 border-t border-border/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <span className="section-label mb-3 block">Community</span>
          <h2 className="font-heading text-3xl md:text-[40px] text-foreground leading-tight">
            Real Results From Real Members
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {testimonials.map((t) => (
            <div key={t.name} className="card-apollo">
              {/* Profile */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-accent">{t.initials}</span>
                </div>
                <div>
                  <span className="text-foreground text-sm font-semibold block">{t.name}</span>
                  <div className="flex gap-0.5">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} size={12} className="text-accent fill-accent" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                "{t.content}"
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
