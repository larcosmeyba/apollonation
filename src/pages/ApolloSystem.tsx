import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Dumbbell, Flame, Target, Trophy, Zap, Shield, TrendingUp, Calendar } from "lucide-react";

const ApolloSystem = () => {
  return (
    <main className="min-h-screen overflow-x-hidden w-full">
      <SEOHead
        path="/system"
        title="The Apollo System | Apollo Reborn"
        description="Discover the Apollo Method — a structured training system built around progressive overload, hypertrophy science, and disciplined recovery cycles."
      />
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs text-primary uppercase tracking-[0.3em] mb-4 font-medium">The Philosophy</p>
          <h1 className="font-heading text-4xl md:text-6xl tracking-wide mb-6">
            THE APOLLO <span className="text-primary">SYSTEM</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Apollo Reborn isn't just a fitness app. It's a complete training system designed to transform your body through science-backed programming, structured nutrition, and relentless accountability.
          </p>
        </div>
      </section>

      {/* The Apollo Method */}
      <section className="py-20 px-4 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Dumbbell className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-xs text-primary uppercase tracking-[0.2em]">Method</p>
              <h2 className="font-heading text-2xl md:text-3xl">The Apollo Method</h2>
            </div>
          </div>
          <p className="text-muted-foreground leading-relaxed mb-8 max-w-3xl">
            A structured training system built around progressive overload, hypertrophy science, and disciplined recovery cycles. Every workout is designed with intent — no filler exercises, no wasted sets.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: TrendingUp, title: "Progressive Overload", desc: "Systematic weight and volume increases to ensure continuous adaptation and growth." },
              { icon: Zap, title: "Hypertrophy Science", desc: "Rep ranges, tempo, and rest periods optimized for maximum muscle development." },
              { icon: Calendar, title: "Recovery Cycles", desc: "Strategically placed deload periods to prevent burnout and sustain long-term progress." },
            ].map((item) => (
              <div key={item.title} className="card-apollo p-6">
                <item.icon className="w-5 h-5 text-primary mb-3" />
                <h3 className="font-heading text-sm mb-2">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Training Phases */}
      <section className="py-20 px-4 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-xs text-primary uppercase tracking-[0.2em]">Phases</p>
              <h2 className="font-heading text-2xl md:text-3xl">The Apollo Training Phases</h2>
            </div>
          </div>
          <p className="text-muted-foreground leading-relaxed mb-8 max-w-3xl">
            Apollo Reborn programs operate in structured 6-week phases designed to optimize muscle growth, strength progression, and recovery. Each phase builds on the last.
          </p>
          <div className="space-y-4">
            {[
              { phase: "Phase 1", title: "Foundation", weeks: "Weeks 1-2", desc: "Establish movement patterns, build work capacity, and set baseline strength metrics." },
              { phase: "Phase 2", title: "Progression", weeks: "Weeks 3-4", desc: "Increase training volume and intensity. Progressive overload drives adaptation." },
              { phase: "Phase 3", title: "Peak & Deload", weeks: "Weeks 5-6", desc: "Push to peak performance, then strategically deload to allow supercompensation." },
            ].map((item) => (
              <div key={item.phase} className="card-apollo p-6 flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-[10px] text-primary uppercase tracking-wider">{item.phase}</span>
                </div>
                <div>
                  <h3 className="font-heading text-base mb-1">{item.title}</h3>
                  <p className="text-[10px] text-primary mb-2">{item.weeks}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fuel Protocol */}
      <section className="py-20 px-4 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Flame className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-xs text-primary uppercase tracking-[0.2em]">Nutrition</p>
              <h2 className="font-heading text-2xl md:text-3xl">The Apollo Fuel Protocol</h2>
            </div>
          </div>
          <p className="text-muted-foreground leading-relaxed mb-8 max-w-3xl">
            A nutrition system designed to optimize body composition using structured macro targets, meal planning, and accountability tracking. Every calorie has a purpose.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { title: "Macro Tracking", desc: "Protein, carbs, and fat targets calculated for your goals. Check off meals and watch your daily totals update in real-time." },
              { title: "28-Day Meal Plans", desc: "AI-generated, personalized meal plans with 4 unique weeks. Automatically refreshed every Monday." },
              { title: "Meal Swaps", desc: "Don't like a meal? Get three macro-matched alternatives that respect your dietary preferences." },
              { title: "Grocery Lists", desc: "Store-specific, budget-optimized shopping lists generated from your meal plan." },
            ].map((item) => (
              <div key={item.title} className="card-apollo p-6">
                <h3 className="font-heading text-sm mb-2">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Apollo Standard */}
      <section className="py-20 px-4 border-t border-border">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center gap-3 justify-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-xs text-primary uppercase tracking-[0.2em]">Values</p>
              <h2 className="font-heading text-2xl md:text-3xl">The Apollo Standard</h2>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {[
              { icon: Shield, title: "Discipline", desc: "Show up every day. Follow the program. Trust the process." },
              { icon: Target, title: "Consistency", desc: "Small daily actions compound into extraordinary results." },
              { icon: Trophy, title: "Progress", desc: "Track everything. Measure improvements. Never settle." },
            ].map((item) => (
              <div key={item.title} className="card-apollo p-8 text-center">
                <item.icon className="w-8 h-8 text-primary mx-auto mb-4" />
                <h3 className="font-heading text-lg mb-3">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default ApolloSystem;
