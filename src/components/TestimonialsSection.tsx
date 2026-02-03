import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Marcus J.",
    role: "Elite Member",
    image: null,
    content: "Apollo Nation transformed my approach to wellness. The attention to detail and quality of instruction is unmatched.",
    rating: 5
  },
  {
    name: "Sarah K.",
    role: "Premier Member",
    image: null,
    content: "The programs are perfectly structured. As a busy professional, I appreciate the flexibility and the results speak for themselves.",
    rating: 5
  },
  {
    name: "David R.",
    role: "Elite Member",
    image: null,
    content: "The personalized coaching has been transformative. My coach understands exactly what I need to reach my goals.",
    rating: 5
  }
];

const TestimonialsSection = () => {
  return (
    <section id="testimonials" className="py-32 relative">
      {/* Top border accent */}
      <div className="absolute top-0 left-0 right-0 divider-gold" />
      
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-20">
          <span className="section-label mb-6 block">
            Testimonials
          </span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl mb-6 tracking-[0.05em]">
            Stories of
            <span className="text-gradient-gold block mt-2">Transformation</span>
          </h2>
          <p className="text-muted-foreground text-base font-light leading-relaxed">
            Real experiences from members who committed to their wellness journey.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.name}
              className="relative p-8 border border-border/50 bg-card/30 hover:border-apollo-gold/20 transition-all duration-500"
            >
              {/* Quote icon */}
              <Quote className="absolute top-6 right-6 w-6 h-6 text-apollo-gold/15" strokeWidth={1} />
              
              {/* Rating */}
              <div className="flex gap-1 mb-6">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} size={12} className="text-apollo-gold fill-apollo-gold" />
                ))}
              </div>

              {/* Content */}
              <p className="text-foreground/80 mb-8 leading-relaxed font-light text-sm">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 border border-apollo-gold/30 flex items-center justify-center">
                  <span className="font-heading text-apollo-gold text-sm tracking-wider">
                    {testimonial.name[0]}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-foreground text-sm">{testimonial.name}</div>
                  <div className="text-xs text-muted-foreground font-light">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;