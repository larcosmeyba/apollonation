import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Marcus J.",
    role: "Elite Member",
    content: "Apollo Nation transformed my approach to wellness. The attention to detail and quality of instruction is unmatched.",
    rating: 5
  },
  {
    name: "Sarah K.",
    role: "Premier Member",
    content: "The programs are perfectly structured. As a busy professional, I appreciate the flexibility and the results speak for themselves.",
    rating: 5
  },
  {
    name: "David R.",
    role: "Elite Member",
    content: "The personalized coaching has been transformative. My coach understands exactly what I need to reach my goals.",
    rating: 5
  }
];

const TestimonialsSection = () => {
  return (
    <section id="testimonials" className="py-16 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <span className="text-primary font-medium text-xs uppercase tracking-[0.25em] mb-6 block">
            Testimonials
          </span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl mb-6 tracking-[0.03em] text-foreground break-words">
            Stories of
            <span className="text-primary block mt-2">Transformation</span>
          </h2>
          <p className="text-muted-foreground text-base font-light leading-relaxed">
            Real experiences from members who committed to their wellness journey.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.name}
              className="relative p-8 border border-primary/10 bg-card/30 hover:border-primary/30 transition-all duration-500 rounded-2xl"
            >
              <Quote className="absolute top-6 right-6 w-8 h-8 text-primary/10" strokeWidth={1} />
              
              <div className="flex gap-1 mb-6">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} size={12} className="text-primary fill-primary" />
                ))}
              </div>

              <p className="text-foreground/70 mb-8 leading-relaxed font-light text-sm">
                "{testimonial.content}"
              </p>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 border border-primary/40 flex items-center justify-center bg-primary/5 rounded-full">
                  <span className="font-heading text-primary text-sm tracking-wider">
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
