import { ArrowRight, Shield, Dumbbell, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const JoinSection = () => {
  const { user } = useAuth();

  return (
    <section className="py-16 relative overflow-hidden">
      {/* Top divider */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[160px]" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left - Content */}
            <div>
              <span className="section-label mb-6 block">Member Access</span>
              <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl mb-6 tracking-[0.05em] text-white">
                {user ? "Welcome Back," : "Ready to"}
                <span className="text-primary block mt-2">
                  {user ? "Warrior" : "Join Us?"}
                </span>
              </h2>
              <p className="text-white/50 text-base font-light leading-relaxed mb-8">
                {user
                  ? "Head to your dashboard to continue your training journey."
                  : "Sign in to access your workouts, nutrition plans, and personalized coaching. New here? Create an account in seconds."}
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                {user ? (
                  <Link to="/dashboard">
                    <Button variant="apollo" size="lg" className="group min-w-[200px] h-14 text-base">
                      Go to Dashboard
                      <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/auth">
                      <Button variant="apollo" size="lg" className="group min-w-[200px] h-14 text-base">
                        Sign In
                        <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
                      </Button>
                    </Link>
                    <Link to="/auth">
                      <Button
                        variant="outline"
                        size="lg"
                        className="min-w-[200px] h-14 text-base border-primary/30 text-primary hover:bg-primary/10"
                      >
                        Create Account
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Right - Feature cards */}
            <div className="space-y-4">
              {[
                {
                  icon: Dumbbell,
                  title: "On-Demand Workouts",
                  desc: "Access a growing library of 15-minute HD workout videos.",
                },
                {
                  icon: Utensils,
                  title: "Nutrition Recipes",
                  desc: "Curated meal plans with full macro breakdowns.",
                },
                {
                  icon: Shield,
                  title: "Personal Coaching",
                  desc: "Direct guidance from Coach Marcos to elevate your results.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-4 p-5 border border-white/10 hover:border-primary/30 bg-white/[0.02] transition-all duration-500"
                >
                  <div className="w-10 h-10 flex items-center justify-center border border-primary/30 shrink-0">
                    <item.icon className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h4 className="font-heading text-sm tracking-[0.08em] text-white mb-1">
                      {item.title}
                    </h4>
                    <p className="text-white/40 text-xs font-light leading-relaxed">
                      {item.desc}
                    </p>
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
