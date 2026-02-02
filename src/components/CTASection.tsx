import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const CTASection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background with gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-apollo-charcoal-light via-background to-apollo-charcoal-light" />
      
      {/* Decorative elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-apollo-gold/5 rounded-full blur-3xl" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-apollo-gold/30 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-apollo-gold/30 to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Main content */}
          <h2 className="font-heading text-4xl md:text-6xl mb-6">
            READY TO JOIN
            <span className="text-gradient-gold block">THE NATION?</span>
          </h2>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl mx-auto">
            Your transformation starts today. Join thousands of warriors who chose to be legendary.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="apollo" size="xl" className="group">
              Start Free Trial
              <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Button>
            <p className="text-muted-foreground text-sm">
              No credit card required • 7-day free trial
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
