import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Marcus J.",
    role: "Elite Member",
    image: null,
    content: "Apollo Nation transformed my life. I've lost 45 lbs and gained confidence I never knew I had. The community here is unlike anything else.",
    rating: 5
  },
  {
    name: "Sarah K.",
    role: "Pro Member",
    image: null,
    content: "The workout programs are perfectly structured. As a busy mom, I love that I can train at home with the app and still see amazing results.",
    rating: 5
  },
  {
    name: "David R.",
    role: "Elite Member",
    image: null,
    content: "The 1-on-1 coaching in the Elite tier is worth every penny. My coach keeps me accountable and my progress has been incredible.",
    rating: 5
  }
];

const TestimonialsSection = () => {
  return (
    <section id="testimonials" className="py-24 relative">
      {/* Top border accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-apollo-gold/30 to-transparent" />
      
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-apollo-gold font-medium text-sm uppercase tracking-widest mb-4 block">
            Success Stories
          </span>
          <h2 className="font-heading text-4xl md:text-5xl mb-6">
            HEAR FROM THE
            <span className="text-gradient-gold block">WARRIORS</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Real results from real members who committed to their transformation.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.name}
              className="card-apollo relative"
            >
              {/* Quote icon */}
              <Quote className="absolute top-6 right-6 w-8 h-8 text-apollo-gold/20" />
              
              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} size={16} className="text-apollo-gold fill-apollo-gold" />
                ))}
              </div>

              {/* Content */}
              <p className="text-foreground/90 mb-6 leading-relaxed">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-apollo-gold to-apollo-copper flex items-center justify-center">
                  <span className="font-heading text-primary-foreground text-lg">
                    {testimonial.name[0]}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-foreground">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.role}</div>
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
