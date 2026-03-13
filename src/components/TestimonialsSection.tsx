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
    <section id="testimonials" className="py-20 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
      
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <span className="landing-text-muted font-medium text-[10px] uppercase tracking-[0.25em] mb-6 block">
            Testimonials
          </span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl mb-6 tracking-[0.03em] landing-text">
            Stories of
            <span className="landing-text-muted block mt-2">Transformation</span>
          </h2>
          <p className="landing-text-muted text-base font-light leading-relaxed">
            Real experiences from members who committed to their journey.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.name}
              className="relative p-8 border border-white/15 bg-card text-card-foreground hover:border-white/25 transition-all duration-500 rounded-xl"
            >
              <Quote className="absolute top-6 right-6 w-8 h-8 text-card-foreground/10" strokeWidth={1} />
              
              <div className="flex gap-0.5 mb-6">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} size={12} className="text-card-foreground/50 fill-card-foreground/50" />
                ))}
              </div>

              <p className="text-card-foreground/70 mb-8 leading-relaxed font-light text-sm">
                "{testimonial.content}"
              </p>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 border border-white/15 flex items-center justify-center bg-muted rounded-full">
                  <span className="font-heading text-card-foreground/70 text-sm tracking-wider">
                    {testimonial.name[0]}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-card-foreground text-sm">{testimonial.name}</div>
                  <div className="text-[10px] text-card-foreground/60 font-light">{testimonial.role}</div>
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
