import { ArrowRight, Shield, Dumbbell, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const JoinSection = () => {
  const { user } = useAuth();

  return (
    <section className="py-20 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-muted-foreground font-medium text-[10px] uppercase tracking-[0.2em] mb-6 block">Member Access</span>
              <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl mb-6 tracking-[0.05em] text-foreground">
                {user ? "Welcome Back" : "Ready to"}
                <span className="text-foreground/50 block mt-2">
                  {user ? "" : "Join Us?"}
                </span>
              </h2>
              <p className="text-muted-foreground text-base font-light leading-relaxed mb-8">
                {user
                  ? "Head to your dashboard to continue your training journey."
                  : "Sign in to access your workouts, nutrition plans, and personalized coaching."}
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                {user ? (
                  <Link to="/dashboard">
                    <Button variant="apollo" size="lg" className="group min-w-[200px] h-14 text-base rounded-full">
                      Go to Dashboard
                      <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/auth">
                      <Button variant="apollo" size="lg" className="group min-w-[200px] h-14 text-base rounded-full">
                        Sign In
                        <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
                      </Button>
                    </Link>
                    <Link to="/auth">
                      <Button variant="apollo-outline" size="lg" className="min-w-[200px] h-14 text-base rounded-full">
                        Create Account
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {[
                { icon: Dumbbell, title: "On-Demand Workouts", desc: "Access a growing library of HD workout videos." },
                { icon: Utensils, title: "Nutrition Recipes", desc: "Curated meal plans with full macro breakdowns." },
                { icon: Shield, title: "Personal Coaching", desc: "Direct guidance from Coach Marcos." },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-4 p-5 border border-border hover:border-foreground/15 bg-card/30 transition-all duration-500 rounded-xl"
                >
                  <div className="w-10 h-10 flex items-center justify-center border border-border shrink-0 rounded-full">
                    <item.icon className="w-4 h-4 text-foreground/50" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h4 className="font-heading text-sm tracking-[0.08em] text-foreground mb-1">{item.title}</h4>
                    <p className="text-muted-foreground text-xs font-light leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default JoinSection;
