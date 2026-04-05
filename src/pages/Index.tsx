import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TestimonialsSection from "@/components/TestimonialsSection";
import SEOHead from "@/components/SEOHead";
import IPhoneMockup from "@/components/IPhoneMockup";
import { ArrowRight, Play, Clock, Flame, Dumbbell, Calendar, Target, Zap, Heart, BarChart3, UtensilsCrossed, ShoppingCart, RefreshCw } from "lucide-react";
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

const FEATURES = [
  {
    icon: Dumbbell,
    title: "Structured Training",
    desc: "100+ guided workouts designed to help you build strength, endurance, and mobility.",
  },
  {
    icon: Target,
    title: "Elite Programming",
    desc: "Training programs designed by experienced fitness professionals to keep you progressing.",
  },
  {
    icon: Heart,
    title: "Sustainable Nutrition",
    desc: "Simple nutrition guidance that supports real results without extreme dieting.",
  },
];

const WORKOUT_CATEGORIES = [
  { title: "Strength", image: marcosAction1 },
  { title: "Sculpt", image: marcosAction7 },
  { title: "Mobility", image: marcos6 },
  { title: "Core", image: marcos7 },
  { title: "Cardio", image: marcosAction6 },
  { title: "Stretch", image: marcos6 },
];

const PROGRAMS = [
  { title: "Beginner Strength", duration: "4 weeks", schedule: "3x / week", level: "Beginner" },
  { title: "Apollo Sculpt", duration: "6 weeks", schedule: "4x / week", level: "Intermediate" },
  { title: "Full Body Power", duration: "8 weeks", schedule: "4x / week", level: "Intermediate" },
  { title: "Athlete Conditioning", duration: "6 weeks", schedule: "5x / week", level: "Advanced" },
];

const APP_FEATURES = [
  "Workout library",
  "Progress tracking",
  "Structured programs",
  "On-demand classes",
  "Nutrition guidance",
];

const Index = () => {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => setIsVisible(true), []);

  return (
    <main className="min-h-screen overflow-x-hidden w-full bg-background">
      <SEOHead
        path="/"
        description="Apollo Nation — premium fitness platform with 100+ structured workouts, training programs, and nutrition guidance. Download the app today."
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
      <header className="relative h-screen flex items-center justify-center overflow-hidden" role="banner">
        {/* Video background with slow zoom */}
        <video
          autoPlay
          muted
          loop
          playsInline
          poster={heroImage}
          className={`absolute inset-0 w-full h-full object-cover object-[50%_30%] transition-transform duration-[2500ms] ease-out ${isVisible ? "scale-100 animate-hero-zoom" : "scale-110"}`}
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>
        {/* Image fallback (shows via poster or if video fails) */}
        <img
          src={heroImage}
          alt="Apollo Nation athlete training"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover object-[50%_30%] -z-[1]"
        />

        {/* Cinematic dark overlay — lighter to show athlete */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/30 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/30 via-transparent to-background/30" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1
              className={`font-heading text-5xl sm:text-6xl md:text-7xl lg:text-[80px] leading-[1.1] mb-6 transition-all duration-1000 delay-100 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            >
              <span className="block text-foreground uppercase tracking-wider">Train With Structure</span>
            </h1>

            <p
              className={`text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-10 font-light leading-relaxed transition-all duration-1000 delay-200 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            >
              Apollo Nation is a modern training platform designed to help you build strength, discipline, and longevity.
            </p>

            <div
              className={`flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-1000 delay-300 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            >
              <Button variant="apollo" size="lg" className="group h-14 px-10 text-base rounded-full" onClick={scrollToDownload}>
                Start Training
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
              </Button>
              <Button
                variant="apollo-outline"
                size="lg"
                className="h-14 px-10 text-base rounded-full"
                onClick={() => document.getElementById("workouts")?.scrollIntoView({ behavior: "smooth" })}
              >
                Explore Workouts
              </Button>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 transition-all duration-1000 delay-500 ${isVisible ? "opacity-100" : "opacity-0"}`}>
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">Scroll</span>
          <div className="w-5 h-8 rounded-full border border-muted-foreground/30 flex justify-center pt-1.5">
            <div className="w-1 h-2 bg-accent rounded-full animate-scroll-dot" />
          </div>
        </div>
      </header>

      {/* ═══ 2. PLATFORM FEATURES ═══ */}
      <section id="pillars" className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <span className="section-label text-accent mb-3 block">The Platform</span>
            <h2 className="font-heading text-3xl md:text-[40px] text-foreground leading-tight">
              Everything You Need to Train
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="card-apollo text-center group cursor-default"
              >
                <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-6 group-hover:bg-accent/20 transition-colors">
                  <f.icon className="w-6 h-6 text-accent" strokeWidth={1.5} />
                </div>
                <h3 className="font-heading text-xl text-foreground mb-3">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 3. WORKOUT LIBRARY ═══ */}
      <section id="workouts" className="py-20 md:py-28 border-t border-border/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <span className="section-label text-accent mb-3 block">Workouts</span>
            <h2 className="font-heading text-3xl md:text-[40px] text-foreground leading-tight mb-4">
              On-Demand Workout Library
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-base">
              Train anytime with guided workouts designed to challenge you and keep your training fresh.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {WORKOUT_CATEGORIES.map((cat) => (
              <div
                key={cat.title}
                className="group relative rounded-2xl overflow-hidden aspect-[4/3] cursor-pointer"
              >
                <img
                  src={cat.image}
                  alt={cat.title}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-12 h-12 rounded-full border border-foreground/30 flex items-center justify-center bg-background/40 backdrop-blur-sm">
                    <Play className="w-5 h-5 text-foreground ml-0.5" fill="currentColor" />
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="font-heading text-lg text-foreground">{cat.title}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 4. APP EXPERIENCE ═══ */}
      <section className="py-24 md:py-36 border-t border-border/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center max-w-6xl mx-auto">
            {/* Left — Text */}
            <div>
              <span className="section-label text-accent mb-3 block">The App</span>
              <h2 className="font-heading text-3xl md:text-[40px] text-foreground leading-tight mb-6">
                Your Training System<br />In One App
              </h2>
              <ul className="space-y-4 mb-8">
                {APP_FEATURES.map((feat) => (
                  <li key={feat} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                    <span className="text-muted-foreground text-base">{feat}</span>
                  </li>
                ))}
              </ul>
              <Button variant="apollo" size="lg" className="rounded-full h-14 px-10" onClick={scrollToDownload}>
                Download the App
                <ArrowRight className="ml-2" size={18} />
              </Button>
            </div>

            {/* Right — Premium iPhone Mockup */}
            <IPhoneMockup />
          </div>
        </div>
      </section>

      {/* ═══ 5. STRUCTURED PROGRAMS ═══ */}
      <section id="programs" className="py-20 md:py-28 border-t border-border/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <span className="section-label text-accent mb-3 block">Programs</span>
            <h2 className="font-heading text-3xl md:text-[40px] text-foreground leading-tight mb-4">
              Structured Training Programs
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-base">
              Follow proven training programs designed to help you build strength, improve endurance, and stay consistent.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {PROGRAMS.map((p) => (
              <div
                key={p.title}
                className="card-apollo group cursor-default"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors">
                    <Dumbbell className="w-5 h-5 text-accent" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-heading text-lg text-foreground">{p.title}</h3>
                </div>
                <div className="flex items-center gap-4 text-muted-foreground text-sm">
                  <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{p.duration}</span>
                  <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{p.schedule}</span>
                </div>
                <div className="mt-4">
                  <span className="text-xs text-accent border border-accent/20 rounded-full px-3 py-1">
                    {p.level}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 6. NUTRITION ═══ */}
      <section id="nutrition" className="py-20 md:py-28 border-t border-border/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <span className="section-label text-accent mb-3 block">Nutrition</span>
            <h2 className="font-heading text-3xl md:text-[40px] text-foreground leading-tight mb-4">
              Fuel Your Training
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-base">
              Simple nutrition tools to help you make better food choices, track macros, and stay consistent with your goals.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { icon: BarChart3, title: "Macro Tracking", desc: "Log meals and track your daily macros effortlessly." },
              { icon: UtensilsCrossed, title: "Meal Plans", desc: "Weekly meal plans tailored to your calorie goals." },
              { icon: RefreshCw, title: "Meal Swaps", desc: "Don't like a meal? Swap it for an alternative instantly." },
              { icon: ShoppingCart, title: "Grocery Lists", desc: "Auto-generated grocery lists from your meal plan." },
            ].map((f) => (
              <div key={f.title} className="card-apollo text-center group cursor-default">
                <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-5 group-hover:bg-accent/20 transition-colors">
                  <f.icon className="w-5 h-5 text-accent" strokeWidth={1.5} />
                </div>
                <h3 className="font-heading text-base text-foreground mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 7. TESTIMONIALS ═══ */}
      <TestimonialsSection />

      {/* ═══ 8. FOUNDER ═══ */}
      <section className="py-20 md:py-28 border-t border-border/30">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <span className="section-label text-accent mb-3 block">The Founder</span>
            <h2 className="font-heading text-3xl md:text-[40px] text-foreground leading-tight mb-6">
              Built By a Coach Who Understands Training
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed mb-8">
              Apollo Nation was created to bring structured, high-quality training to people who want real results without the chaos of traditional gyms. Every workout, program, and meal plan is built with purpose.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ 9. MEMBERSHIP CTA ═══ */}
      <section id="download" className="py-20 md:py-28 border-t border-border/30">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="card-apollo text-center py-14 px-8">
              <h2 className="font-heading text-3xl md:text-[40px] text-foreground mb-4 leading-tight">
                Join Apollo Nation
              </h2>
              <p className="text-muted-foreground text-base leading-relaxed mb-6 max-w-md mx-auto">
                Unlimited access to structured workouts, training programs, and the Apollo training platform.
              </p>

              <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-8 text-left">
                {["100+ workouts", "Guided programs", "Nutrition guidance", "Progress tracking"].map((feat) => (
                  <div key={feat} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                    <span className="text-muted-foreground text-sm">{feat}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-center gap-3 mb-6">
                <a href="#" className="flex items-center gap-2.5 bg-foreground text-background px-5 py-3 rounded-xl hover:bg-foreground/90 transition-all hover:-translate-y-0.5">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  <div className="text-left">
                    <div className="text-[9px] font-light opacity-60">Download on the</div>
                    <div className="text-sm font-semibold -mt-0.5">App Store</div>
                  </div>
                </a>
                <a href="#" className="flex items-center gap-2.5 bg-foreground text-background px-5 py-3 rounded-xl hover:bg-foreground/90 transition-all hover:-translate-y-0.5">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                    <path d="M3 20.5v-17c0-.59.34-1.11.84-1.35L13.69 12l-9.85 9.85c-.5-.24-.84-.76-.84-1.35zm13.81-5.38L6.05 21.34l8.49-8.49 2.27 2.27zm.91-.91L19.59 12l-1.87-2.21-2.27 2.27 2.27 2.15zM6.05 2.66l10.76 6.22-2.27 2.27-8.49-8.49z" />
                  </svg>
                  <div className="text-left">
                    <div className="text-[9px] font-light opacity-60">Get it on</div>
                    <div className="text-sm font-semibold -mt-0.5">Google Play</div>
                  </div>
                </a>
              </div>

              <p className="text-muted-foreground text-xs">Coming soon to iOS and Android</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default Index;
