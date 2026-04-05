import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TestimonialsSection from "@/components/TestimonialsSection";
import SEOHead from "@/components/SEOHead";
import { ArrowRight, Play, Calendar, Apple, Smartphone, Clock, Flame, Dumbbell, BarChart3, UtensilsCrossed, ShoppingCart, RefreshCw, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import heroImage from "@/assets/marcos-hero.jpg";
import marcosAction1 from "@/assets/marcos-action-1.jpg";
import marcosAction6 from "@/assets/marcos-action-6.jpg";
import marcosAction7 from "@/assets/marcos-action-7.jpg";
import marcos6 from "@/assets/marcos-6.jpg";
import marcos7 from "@/assets/marcos-7.jpg";

const scrollToDownload = () =>
  document.getElementById("download")?.scrollIntoView({ behavior: "smooth" });

const WORKOUTS = [
  { title: "Full Body Power", duration: "45 min", calories: "400–550 cal", image: marcosAction1, link: "#" },
  { title: "HIIT Inferno", duration: "30 min", calories: "350–500 cal", image: marcosAction6, link: "#" },
  { title: "Upper Body Sculpt", duration: "40 min", calories: "300–450 cal", image: marcos6, link: "#" },
  { title: "Core Burn", duration: "25 min", calories: "200–300 cal", image: marcos7, link: "#" },
];

const PROGRAMS = [
  { title: "Beginner Strength", duration: "4 weeks", schedule: "3x / week", level: "Beginner" },
  { title: "30 Day Core", duration: "4 weeks", schedule: "5x / week", level: "All Levels" },
  { title: "Sculpt Series", duration: "6 weeks", schedule: "4x / week", level: "Intermediate" },
  { title: "Full Body Strength", duration: "8 weeks", schedule: "4x / week", level: "Intermediate" },
  { title: "Athlete Conditioning", duration: "6 weeks", schedule: "5x / week", level: "Advanced" },
];

const NUTRITION_FEATURES = [
  { icon: BarChart3, title: "Macro Tracking", desc: "Log meals and track your daily macros effortlessly." },
  { icon: UtensilsCrossed, title: "Meal Plans", desc: "Weekly meal plans tailored to your calorie goals." },
  { icon: RefreshCw, title: "Meal Swaps", desc: "Don't like a meal? Swap it for an alternative instantly." },
  { icon: ShoppingCart, title: "Grocery Lists", desc: "Auto-generated grocery lists from your meal plan." },
];

const Index = () => {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => setIsVisible(true), []);

  return (
    <main className="min-h-screen overflow-x-hidden w-full bg-background">
      <SEOHead
        path="/"
        description="Apollo Nation — premium on-demand workouts, structured training programs, and practical nutrition guidance. Download the app today."
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Apollo Nation",
            url: "https://www.www-apollo.com",
            logo: "https://www.www-apollo.com/favicon.png",
            description: "Premium on-demand fitness platform.",
          },
        ]}
      />
      <Navbar />

      {/* ═══ 1. HERO ═══ */}
      <header className="relative min-h-[75vh] md:min-h-[90vh] flex items-center justify-center overflow-hidden pt-16" role="banner">
        <img
          src={heroImage}
          alt="Apollo Nation athlete training"
          fetchPriority="high"
          decoding="async"
          className={`absolute inset-0 w-full h-full object-cover object-[50%_30%] transition-transform duration-[2500ms] ease-out ${isVisible ? "scale-100" : "scale-110"}`}
        />
        <div className="absolute inset-0 bg-background/70" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-xl mx-auto text-center">
            <span className={`inline-block text-[9px] uppercase tracking-[0.35em] text-foreground/30 mb-4 font-light transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              On-Demand Fitness Platform
            </span>
            <h1 className={`font-heading text-3xl sm:text-4xl md:text-6xl lg:text-7xl leading-[1.05] mb-4 tracking-[0.02em] transition-all duration-1000 delay-100 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
              <span className="block text-foreground">Train Like</span>
              <span className="block text-foreground/40">a Legend</span>
            </h1>
            <p className={`text-sm md:text-base text-foreground/40 max-w-sm mx-auto mb-6 font-light leading-relaxed transition-all duration-1000 delay-200 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
              On-demand workouts, structured training programs, and practical nutrition guidance designed to fit real life.
            </p>
            <div className={`flex flex-col sm:flex-row items-center justify-center gap-3 transition-all duration-1000 delay-300 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
              <Button variant="apollo" size="lg" className="group h-12 px-7 text-sm rounded-full" onClick={scrollToDownload}>
                Download the App
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={16} />
              </Button>
              <Button variant="apollo-outline" size="lg" className="h-12 px-7 text-sm rounded-full" onClick={() => document.getElementById("workouts")?.scrollIntoView({ behavior: "smooth" })}>
                Start Training
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ═══ 2. WHAT APOLLO IS ═══ */}
      <section className="py-10 md:py-14 border-t border-border/10">
        <div className="container mx-auto px-4">
          <div className="max-w-lg mx-auto text-center">
            <span className="text-[9px] uppercase tracking-[0.35em] text-foreground/20 mb-2 block font-light">The Platform</span>
            <h2 className="font-heading text-2xl md:text-3xl text-foreground tracking-wide mb-3">
              Your Fitness System
            </h2>
            <p className="text-foreground/35 font-light leading-relaxed text-sm max-w-md mx-auto">
              Apollo Nation combines on-demand workouts, structured training programs, and practical nutrition tools to help you stay consistent wherever you train.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ 3. ON-DEMAND WORKOUTS ═══ */}
      <section id="workouts" className="py-12 md:py-16 border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-4 block font-light">Workouts</span>
            <h2 className="font-heading text-3xl md:text-4xl text-white tracking-wide mb-4">
              On-Demand Workout Library
            </h2>
            <p className="text-white/50 font-light leading-relaxed max-w-md mx-auto">
              Train anytime with guided workouts designed to challenge you and keep your training fresh.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {WORKOUTS.map((w) => (
              <a
                key={w.title}
                href={w.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative rounded-2xl overflow-hidden border border-white/10 bg-card hover:border-white/20 transition-all duration-500"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img src={w.image} alt={w.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
                  {/* Play button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-12 h-12 rounded-full border border-white/40 flex items-center justify-center bg-background/40 backdrop-blur-sm">
                      <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
                    </div>
                  </div>
                </div>
                <div className="relative p-5 -mt-10 z-10">
                  <h3 className="font-heading text-base text-white mb-2 tracking-wide">{w.title}</h3>
                  <div className="flex items-center gap-3 text-white/40 text-xs font-light">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{w.duration}</span>
                    <span className="flex items-center gap-1"><Flame className="w-3 h-3" />{w.calories}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 4. STRUCTURED PROGRAMS ═══ */}
      <section className="py-12 md:py-16 border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-3 block font-light">Programs</span>
            <h2 className="font-heading text-3xl md:text-4xl text-white tracking-wide mb-4">
              Structured Training Programs
            </h2>
            <p className="text-white/50 font-light leading-relaxed max-w-md mx-auto">
              Follow proven training programs designed to help you build strength, improve endurance, and stay consistent.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {PROGRAMS.map((p) => (
              <div
                key={p.title}
                className="p-5 border border-white/10 rounded-2xl bg-card hover:border-white/20 transition-all duration-500"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center flex-shrink-0">
                    <Dumbbell className="w-4 h-4 text-white/60" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-heading text-sm text-white tracking-wide">{p.title}</h3>
                </div>
                <div className="flex items-center gap-4 text-white/40 text-xs font-light">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{p.duration}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{p.schedule}</span>
                </div>
                <div className="mt-3">
                  <span className="text-[10px] uppercase tracking-wider text-white/30 font-light border border-white/10 rounded-full px-2.5 py-0.5">
                    {p.level}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 5. NUTRITION SYSTEM ═══ */}
      <section className="py-12 md:py-16 border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-3 block font-light">Nutrition</span>
            <h2 className="font-heading text-3xl md:text-4xl text-white tracking-wide mb-4">
              Fuel Your Training
            </h2>
            <p className="text-white/50 font-light leading-relaxed max-w-md mx-auto">
              Simple nutrition tools to help you make better food choices, track macros, and stay consistent with your goals.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto mb-8">
            {NUTRITION_FEATURES.map((f) => (
              <div key={f.title} className="p-5 border border-white/10 rounded-2xl bg-card text-center">
                <div className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center mx-auto mb-4">
                  <f.icon className="w-4 h-4 text-white/60" strokeWidth={1.5} />
                </div>
                <h3 className="font-heading text-sm text-white mb-2 tracking-wide">{f.title}</h3>
                <p className="text-white/40 text-xs font-light leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Restaurant Assistant */}
          <div className="max-w-2xl mx-auto border border-white/10 rounded-2xl bg-card p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
            <div className="w-14 h-14 rounded-full border border-white/15 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-6 h-6 text-white/60" strokeWidth={1.5} />
            </div>
            <div className="text-center md:text-left">
              <h3 className="font-heading text-base text-white mb-1 tracking-wide">Restaurant Assistant</h3>
              <p className="text-white/50 text-sm font-light leading-relaxed">
                Eating out? Get smarter meal suggestions when ordering from restaurants.
              </p>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-white/30 font-light border border-white/10 rounded-full px-3 py-1 flex-shrink-0">
              Coming Soon
            </span>
          </div>
        </div>
      </section>

      {/* ═══ 6. APP EXPERIENCE ═══ */}
      <section className="py-12 md:py-16 border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center mb-8">
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-3 block font-light">The App</span>
            <h2 className="font-heading text-3xl md:text-4xl text-white tracking-wide mb-3">
              Train Anywhere
            </h2>
            <p className="text-white/50 font-light leading-relaxed">
              Access Apollo Nation on your phone and train wherever life takes you.
            </p>
          </div>

          {/* Phone mockup */}
          <div className="max-w-xs mx-auto">
            <div className="border border-white/15 rounded-[2rem] bg-card overflow-hidden shadow-2xl shadow-black/50">
              {/* Status bar */}
              <div className="flex items-center justify-between px-5 pt-3 pb-2">
                <span className="text-[9px] text-white/40 font-light">9:41</span>
                <span className="text-[9px] text-white/40 font-light">Apollo Nation</span>
                <div className="flex gap-1">
                  <div className="w-3 h-1.5 rounded-sm bg-white/30" />
                  <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                </div>
              </div>

              {/* Screen content */}
              <div className="px-4 pb-2 space-y-3">
                {/* Today's workout card */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <span className="text-[9px] uppercase tracking-wider text-white/30 font-light">Today's Workout</span>
                  <h4 className="text-sm text-white font-medium mt-1">Full Body Power</h4>
                  <div className="flex items-center gap-2 mt-1.5 text-white/40 text-[10px]">
                    <span>45 min</span><span>·</span><span>Intermediate</span>
                  </div>
                  <div className="mt-2 bg-white/10 rounded-full h-5 flex items-center justify-center">
                    <span className="text-[10px] text-white/70 font-medium">Start Workout →</span>
                  </div>
                </div>

                {/* Continue program */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <span className="text-[9px] uppercase tracking-wider text-white/30 font-light">Continue Program</span>
                  <h4 className="text-xs text-white/80 font-medium mt-1">Beginner Strength — Week 2</h4>
                  <div className="mt-2 w-full bg-white/10 rounded-full h-1.5">
                    <div className="bg-white/50 h-1.5 rounded-full" style={{ width: "35%" }} />
                  </div>
                  <span className="text-[9px] text-white/30 mt-1 block">35% complete</span>
                </div>

                {/* Recommended */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <span className="text-[9px] uppercase tracking-wider text-white/30 font-light">Recommended</span>
                  <div className="flex gap-2 mt-2">
                    <div className="flex-1 bg-white/5 rounded-lg p-2 text-center">
                      <span className="text-[10px] text-white/60">HIIT Inferno</span>
                    </div>
                    <div className="flex-1 bg-white/5 rounded-lg p-2 text-center">
                      <span className="text-[10px] text-white/60">Core Burn</span>
                    </div>
                  </div>
                </div>

                {/* Weekly progress */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <span className="text-[9px] uppercase tracking-wider text-white/30 font-light">Weekly Progress</span>
                  <div className="flex items-end gap-1.5 mt-2 h-8">
                    {[60, 100, 80, 0, 40, 0, 0].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col justify-end">
                        <div className={`rounded-sm ${h > 0 ? 'bg-white/30' : 'bg-white/10'}`} style={{ height: `${Math.max(h * 0.3, 3)}px` }} />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-1">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                      <span key={i} className="text-[8px] text-white/20 flex-1 text-center">{d}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom navigation */}
              <div className="border-t border-white/10 bg-card px-2 pb-4 pt-2">
                <div className="flex justify-around">
                  {[
                    { label: "Home", active: true },
                    { label: "Workouts", active: false },
                    { label: "Programs", active: false },
                    { label: "Nutrition", active: false },
                    { label: "Profile", active: false },
                  ].map((tab) => (
                    <div key={tab.label} className="flex flex-col items-center gap-0.5">
                      <div className={`w-1 h-1 rounded-full ${tab.active ? 'bg-white' : 'bg-transparent'}`} />
                      <span className={`text-[9px] ${tab.active ? 'text-white font-medium' : 'text-white/30 font-light'}`}>{tab.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 7. TESTIMONIALS ═══ */}
      <TestimonialsSection />

      {/* ═══ 8. DOWNLOAD CTA ═══ */}
      <section id="download" className="py-12 md:py-16 border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="max-w-xl mx-auto text-center">
            <h2 className="font-heading text-3xl md:text-5xl text-white mb-5 tracking-wide">
              Start Training Today
            </h2>
            <p className="text-white/50 font-light leading-relaxed mb-6">
              Download Apollo Nation and start your next workout.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <Button variant="apollo" size="lg" className="group h-14 px-8 text-base rounded-full" onClick={scrollToDownload}>
                Download the App
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
              </Button>
            </div>

            <div className="flex items-center justify-center gap-4 mb-8">
              <a href="#" className="flex items-center gap-3 bg-white text-background px-5 py-3 rounded-xl hover:bg-white/90 transition-colors">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <div className="text-left">
                  <div className="text-[9px] font-light opacity-70">Download on the</div>
                  <div className="text-xs font-semibold -mt-0.5">App Store</div>
                </div>
              </a>
              <a href="#" className="flex items-center gap-3 bg-white text-background px-5 py-3 rounded-xl hover:bg-white/90 transition-colors">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M3 20.5v-17c0-.59.34-1.11.84-1.35L13.69 12l-9.85 9.85c-.5-.24-.84-.76-.84-1.35zm13.81-5.38L6.05 21.34l8.49-8.49 2.27 2.27zm.91-.91L19.59 12l-1.87-2.21-2.27 2.27 2.27 2.15zM6.05 2.66l10.76 6.22-2.27 2.27-8.49-8.49z" />
                </svg>
                <div className="text-left">
                  <div className="text-[9px] font-light opacity-70">Get it on</div>
                  <div className="text-xs font-semibold -mt-0.5">Google Play</div>
                </div>
              </a>
            </div>

            <p className="text-white/20 text-xs font-light">Coming soon to iOS and Android</p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default Index;
