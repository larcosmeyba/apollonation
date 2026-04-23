import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import IPhoneMockup from "@/components/IPhoneMockup";
import { ArrowRight, Play, Clock, Dumbbell, Calendar, Target, Heart, BarChart3, UtensilsCrossed, ShoppingCart, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import heroImage from "@/assets/marcos-hero.jpg";
import marcosAction1 from "@/assets/marcos-action-1.jpg";
import marcosAction6 from "@/assets/marcos-action-6.jpg";
import marcosAction7 from "@/assets/marcos-action-7.jpg";
import marcos7 from "@/assets/marcos-9.webp";

const scrollToDownload = () =>
  document.getElementById("download")?.scrollIntoView({ behavior: "smooth" });

const FEATURES = [
  {
    icon: Dumbbell,
    title: "Structured Training",
    desc: "A focused library of guided workouts — every one filmed, programmed, and coached by Marcos. Built with intent, not filler.",
  },
  {
    icon: Target,
    title: "Progressive Programming",
    desc: "Multi-week programs that progress with you — built to prevent plateaus and match your schedule.",
  },
  {
    icon: Heart,
    title: "Sustainable Nutrition",
    desc: "Macro-tracked meal plans that match your grocery store and weekly budget. No extreme diets.",
  },
];

const WORKOUT_CATEGORIES = [
  { title: "Strength", image: marcosAction1 },
  { title: "Sculpt", image: marcosAction7 },
  { title: "Cardio", image: marcosAction6 },
  { title: "Core", image: marcos7 },
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
        description="Guided workouts, progressive programs, and budget-friendly meal plans — all in one premium training app. Built by coach Marcos Leyba. Download for iOS & Android."
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Apollo Reborn",
            url: "https://www.apolloreborn.com",
            logo: "https://www.apolloreborn.com/favicon.png",
            description: "Premium on-demand fitness platform.",
          },
        ]}
      />
      <Navbar />

      {/* ═══ 1. HERO ═══ */}
      <header className="relative h-screen flex items-center justify-center overflow-hidden" role="banner">
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
        <img
          src={heroImage}
          alt="Apollo Reborn athlete training"
          fetchPriority="high"
          decoding="async"
          loading="eager"
          className="absolute inset-0 w-full h-full object-cover object-[50%_30%] -z-[1]"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/20 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/20 via-transparent to-background/20" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1
              className={`font-heading text-5xl sm:text-6xl md:text-7xl lg:text-[80px] leading-[1.1] mb-6 transition-all duration-1000 delay-100 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            >
              <span className="block text-white uppercase tracking-wider font-bold">Train With Structure</span>
            </h1>

            <p
              className={`text-lg md:text-xl text-white max-w-xl mx-auto mb-10 font-light leading-relaxed transition-all duration-1000 delay-200 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            >
              Guided workouts, structured programs, and personalized nutrition — all in one app. Built by Marcos Leyba, designed to fit your life.
            </p>

            <div
              className={`flex items-center justify-center transition-all duration-1000 delay-300 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            >
              <Button
                size="lg"
                className="group h-14 px-10 text-base rounded-full bg-white text-black hover:bg-white/90 border border-white font-semibold"
                onClick={scrollToDownload}
              >
                Download the App
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ═══ 2. PLATFORM FEATURES ═══ */}
      <section id="pillars" className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-white font-bold text-xs uppercase tracking-[0.25em] mb-3 block">The Platform</span>
            <h2 className="font-heading text-3xl md:text-[40px] text-foreground leading-tight">
              Everything You Need to Train
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="card-apollo text-center group cursor-default"
              >
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6 group-hover:bg-white/10 transition-all duration-300">
                  <f.icon className="w-7 h-7 text-white" strokeWidth={1.5} />
                </div>
                <h3 className="font-heading text-xl text-foreground mb-3">{f.title}</h3>
                <p className="text-white/70 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 3. WORKOUT LIBRARY ═══ */}
      <section id="workouts" className="py-16 md:py-24 border-t border-border/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-white font-bold text-xs uppercase tracking-[0.25em] mb-3 block">Workouts</span>
            <h2 className="font-heading text-3xl md:text-[40px] text-foreground leading-tight mb-4">
              On-Demand Workout Library
            </h2>
            <p className="text-white max-w-lg mx-auto text-base">
              A focused library of guided workouts — every one filmed, programmed, and coached by Marcos. Built with intent, not filler.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-3xl mx-auto">
            {WORKOUT_CATEGORIES.map((cat) => (
              <div
                key={cat.title}
                className="group relative rounded-2xl overflow-hidden aspect-[4/3] cursor-pointer shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_16px_50px_rgba(0,0,0,0.7)] transition-all duration-500"
              >
                <img
                  src={cat.image}
                  alt={cat.title}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-12 h-12 rounded-full border border-white/40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <Play className="w-5 h-5 text-white ml-0.5" fill="currentColor" />
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="font-heading text-lg text-white font-bold">{cat.title}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 4. APP EXPERIENCE ═══ */}
      <section className="py-20 md:py-32 border-t border-border/30 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <span className="text-white font-bold text-xs uppercase tracking-[0.25em] mb-3 block">The App</span>
            <h2 className="font-heading text-3xl md:text-[40px] text-foreground leading-tight mb-4">
              Your Training System In One App
            </h2>
            <p className="text-white max-w-lg mx-auto text-base">
              Workouts, programs, nutrition, and progress tracking — all in one premium experience.
            </p>
          </div>

          <IPhoneMockup />

          <div className="flex justify-center mt-12">
            <Button
              size="lg"
              className="rounded-full h-14 px-10 bg-white text-black hover:bg-white/90 border border-white font-semibold"
              onClick={scrollToDownload}
            >
              Download the App
              <ArrowRight className="ml-2" size={18} />
            </Button>
          </div>
        </div>
      </section>

      {/* ═══ 5. STRUCTURED PROGRAMS ═══ */}
      <section id="programs" className="py-16 md:py-24 border-t border-border/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-white font-bold text-xs uppercase tracking-[0.25em] mb-3 block">Programs</span>
            <h2 className="font-heading text-3xl md:text-[40px] text-foreground leading-tight mb-4">
              Structured Training Programs
            </h2>
            <p className="text-white max-w-lg mx-auto text-base">
              Follow proven training programs designed to help you build strength, improve endurance, and stay consistent.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ 6. NUTRITION ═══ */}
      <section id="nutrition" className="py-16 md:py-24 border-t border-border/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-white font-bold text-xs uppercase tracking-[0.25em] mb-3 block">Nutrition</span>
            <h2 className="font-heading text-3xl md:text-[40px] text-foreground leading-tight mb-4">
              Fuel Your Training
            </h2>
            <p className="text-white max-w-lg mx-auto text-base">
              Macro-tracked meal plans that match your grocery store and your weekly budget. No extreme diets, no $300 grocery runs.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-4xl mx-auto">
            {[
              { icon: BarChart3, title: "Macro Tracking", desc: "Log meals and track your daily macros effortlessly." },
              { icon: UtensilsCrossed, title: "Meal Plans", desc: "Weekly meal plans tailored to your calorie goals." },
              { icon: RefreshCw, title: "Meal Swaps", desc: "Don't like a meal? Swap it for an alternative instantly." },
              { icon: ShoppingCart, title: "Grocery Lists", desc: "Auto-generated grocery lists from your meal plan." },
            ].map((f) => (
              <div key={f.title} className="card-apollo text-center group cursor-default">
                <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5 group-hover:bg-white/10 transition-all duration-300">
                  <f.icon className="w-6 h-6 text-white" strokeWidth={1.5} />
                </div>
                <h3 className="font-heading text-base text-foreground mb-2">{f.title}</h3>
                <p className="text-white/70 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 7. FOUNDER ═══ */}
      <section className="py-16 md:py-24 border-t border-border/30">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 md:gap-14 items-center">
            <div className="rounded-2xl overflow-hidden aspect-[4/5] shadow-[0_16px_50px_rgba(0,0,0,0.6)]">
              <img
                src={marcosAction1}
                alt="Marcos Leyba, founder of Apollo Reborn, training"
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <span className="text-white font-bold text-xs uppercase tracking-[0.25em] mb-3 block">The Founder</span>
              <h2 className="font-heading text-3xl md:text-[40px] text-foreground leading-tight mb-6">
                Built By a Coach Who Understands Training
              </h2>
              <p className="text-white text-base leading-relaxed mb-5">
                Apollo Reborn exists because fitness shouldn't require a $200/month gym, a nutritionist, and three separate apps. Every workout, program, and meal plan is built with purpose — structured training that delivers real results without the chaos of traditional gym culture or the noise of influencer fitness.
              </p>
              <p className="text-white text-base leading-relaxed mb-6">
                Founded by Marcos Leyba, a coach with over a decade of experience in strength training and body transformation. His philosophy: build programs that fit your life, not the other way around.
              </p>
              <a
                href="https://www.instagram.com/larcosfit"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-white text-sm font-semibold hover:text-white/70 transition-colors"
              >
                Follow @larcosfit →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 8. DOWNLOAD CTA ═══ */}
      <section id="download" className="py-12 md:py-16 border-t border-border/30">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-heading text-3xl md:text-[40px] text-foreground mb-4 leading-tight">
              Start Training Today
            </h2>
            <p className="text-white text-base leading-relaxed mb-6 max-w-md mx-auto">
              Download Apollo Reborn and get access to structured workouts, training programs, and nutrition tools.
            </p>

            <div className="flex items-center justify-center gap-3 mb-4">
              <a href="#" className="flex items-center gap-2.5 bg-white text-black px-5 py-3 rounded-xl hover:bg-white/90 transition-all hover:-translate-y-0.5">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <div className="text-left">
                  <div className="text-[9px] font-light opacity-60">Download on the</div>
                  <div className="text-sm font-semibold -mt-0.5">App Store</div>
                </div>
              </a>
              <a href="#" className="flex items-center gap-2.5 bg-white text-black px-5 py-3 rounded-xl hover:bg-white/90 transition-all hover:-translate-y-0.5">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M3 20.5v-17c0-.59.34-1.11.84-1.35L13.69 12l-9.85 9.85c-.5-.24-.84-.76-.84-1.35zm13.81-5.38L6.05 21.34l8.49-8.49 2.27 2.27zm.91-.91L19.59 12l-1.87-2.21-2.27 2.27 2.27 2.15zM6.05 2.66l10.76 6.22-2.27 2.27-8.49-8.49z" />
                </svg>
                <div className="text-left">
                  <div className="text-[9px] font-light opacity-60">Get it on</div>
                  <div className="text-sm font-semibold -mt-0.5">Google Play</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default Index;
