import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const CTASection = () => {
  return (
    <section className="py-32 relative overflow-hidden">
      {/* Background with subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-background to-white/[0.02]" />
      
      {/* Decorative elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[180px]" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          {/* Main content */}
          <h2 className="font-heading text-3xl md:text-5xl lg:text-6xl mb-8 tracking-[0.05em] text-white">
            Begin Your
            <span className="text-primary block mt-2">Transformation</span>
          </h2>
          
          <p className="text-base md:text-lg text-white/50 mb-12 max-w-lg mx-auto font-light leading-relaxed">
            Your journey to excellence starts today. Join a community dedicated to meaningful change.
          </p>

          {/* CTA */}
          <div className="flex flex-col items-center gap-6">
            <Link to="/auth">
              <Button variant="apollo" size="lg" className="group min-w-[220px] h-14 text-base">
                Start Free Trial
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
              </Button>
            </Link>
            <p className="text-white/40 text-xs font-light tracking-wide">
              No credit card required · 7-day free trial
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;