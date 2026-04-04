import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { ArrowRight, Play, Dumbbell, Calendar, Apple } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import heroImage from "@/assets/marcos-hero.jpg";
import marcosAction1 from "@/assets/marcos-action-1.jpg";
import marcosAction6 from "@/assets/marcos-action-6.jpg";
import marcosAction7 from "@/assets/marcos-action-7.jpg";
import marcos6 from "@/assets/marcos-6.jpg";
import marcos7 from "@/assets/marcos-7.jpg";

const PILLARS = [
  {
    icon: Play,
    title: "On-Demand Workouts",
    description: "Premium HD workout videos you can do anywhere, anytime. New content added weekly.",
    image: marcosAction1,
  },
  {
    icon: Calendar,
    title: "Structured Programs",
    description: "Multi-week training programs designed to build strength, endurance, and confidence.",
    image: marcosAction6,
  },
  {
    icon: Apple,
    title: "Nutrition Guidance",
    description: "Practical meal plans, macro tracking, and recipes that fit your lifestyle.",
    image: marcosAction7,
  },
];

const FEATURES = [
  "HD workout library",
  "4–8 week programs",
  "Weekly meal plans",
  "Macro tracking",
  "Progress photos",
  "Recipe collection",
];

const Index = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

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
            sameAs: [
              "https://www.instagram.com/larcosfit",
              "https://www.youtube.com/@larcosfitness",
            ],
          },
        ]}
      />
      <Navbar />

      {/* ─── HERO ─── */}
      <header className="relative min-h-screen flex items-end overflow-hidden" role="banner">
        <img
          src={heroImage}
          alt="Apollo Nation athlete training"
          fetchPriority="high"
          decoding="async"
          className={`absolute inset-0 w-full h-full object-cover object-[50%_20%] transition-transform duration-[2500ms] ease-out ${isVisible ? "scale-100" : "scale-110"}`}
        />
        {/* Cinematic gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />

        <div className="container mx-auto px-4 relative z-10 pb-24 md:pb-32">
          <div className="max-w-2xl">
            <div
              className={`transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
            >
              <span className="inline-block text-[10px] uppercase tracking-[0.3em] text-white/50 mb-6 font-light">
                On-Demand Fitness Platform
              </span>
            </div>

            <h1
              className={`font-heading text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[1] mb-6 tracking-[0.02em] transition-all duration-1000 delay-100 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            >
              <span className="block text-white">Train</span>
              <span className="block text-white">Without</span>
              <span className="block text-white/60">Limits</span>
            </h1>

            <p
              className={`text-base md:text-lg text-white/60 max-w-md mb-10 font-light leading-relaxed transition-all duration-1000 delay-200 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            >
              Premium workouts, structured programs, and nutrition guidance — all in one app.
            </p>

            <div
              className={`flex flex-col sm:flex-row items-start gap-4 transition-all duration-1000 delay-300 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            >
              <Button
                variant="apollo"
                size="lg"
                className="group h-14 px-8 text-base rounded-full"
                onClick={() => document.getElementById("download")?.scrollIntoView({ behavior: "smooth" })}
              >
                Download the App
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
              </Button>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 transition-all duration-1000 delay-700 ${isVisible ? "opacity-30" : "opacity-0"}`}
        >
          <div className="w-px h-10 bg-gradient-to-b from-white/30 to-transparent animate-pulse" />
        </div>
      </header>

      {/* ─── THREE PILLARS ─── */}
      <section id="pillars" className="py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-4 block font-light">
              The Platform
            </span>
            <h2 className="font-heading text-3xl md:text-5xl text-white tracking-wide">
              Everything You Need
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {PILLARS.map((pillar, i) => (
              <div
                key={pillar.title}
                className="group relative rounded-2xl overflow-hidden border border-white/10 bg-card hover:border-white/20 transition-all duration-500"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={pillar.image}
                    alt={pillar.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                </div>
                <div className="relative p-6 -mt-16 z-10">
                  <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center mb-4 bg-background/50 backdrop-blur-sm">
                    <pillar.icon className="w-4 h-4 text-white" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-heading text-lg text-white mb-2 tracking-wide">
                    {pillar.title}
                  </h3>
                  <p className="text-white/50 text-sm font-light leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── EDITORIAL SPLIT SECTION ─── */}
      <section className="py-24 md:py-32 border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative rounded-2xl overflow-hidden aspect-[3/4]">
              <img
                src={marcos6}
                alt="Apollo Nation training"
                loading="lazy"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
            </div>
            <div className="lg:pl-8">
              <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-4 block font-light">
                Why Apollo Nation
              </span>
              <h2 className="font-heading text-3xl md:text-4xl text-white mb-6 tracking-wide leading-tight">
                Built for People<br />Who Show Up
              </h2>
              <p className="text-white/50 font-light leading-relaxed mb-8 max-w-md">
                No gimmicks. No fluff. Apollo Nation delivers real workouts, real programs, and real nutrition guidance designed by Coach Marcos — accessible from your phone, on your schedule.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {FEATURES.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-3 py-2"
                  >
                    <div className="w-1 h-1 rounded-full bg-white/40 flex-shrink-0" />
                    <span className="text-white/70 text-sm font-light">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CINEMATIC QUOTE ─── */}
      <section className="py-24 md:py-32 border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={marcos7}
            alt=""
            role="presentation"
            loading="lazy"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-background/80" />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <blockquote className="font-heading text-2xl md:text-4xl lg:text-5xl text-white leading-tight tracking-wide mb-8">
              "The body achieves what the mind believes."
            </blockquote>
            <p className="text-white/40 text-sm uppercase tracking-[0.2em] font-light">
              Coach Marcos
            </p>
          </div>
        </div>
      </section>

      {/* ─── DOWNLOAD CTA ─── */}
      <section id="download" className="py-24 md:py-32 border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-4 block font-light">
              Get Started
            </span>
            <h2 className="font-heading text-3xl md:text-5xl text-white mb-6 tracking-wide">
              Your Training<br />Starts Here
            </h2>
            <p className="text-white/50 font-light leading-relaxed mb-10 max-w-md mx-auto">
              Download Apollo Nation and get instant access to on-demand workouts, structured programs, and nutrition guidance.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              {/* App Store Badge */}
              <a
                href="#"
                className="flex items-center gap-3 bg-white text-background px-6 py-3.5 rounded-xl hover:bg-white/90 transition-colors group"
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <div className="text-left">
                  <div className="text-[10px] font-light opacity-70">Download on the</div>
                  <div className="text-sm font-semibold -mt-0.5">App Store</div>
                </div>
              </a>

              {/* Google Play Badge */}
              <a
                href="#"
                className="flex items-center gap-3 bg-white text-background px-6 py-3.5 rounded-xl hover:bg-white/90 transition-colors group"
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                  <path d="M3 20.5v-17c0-.59.34-1.11.84-1.35L13.69 12l-9.85 9.85c-.5-.24-.84-.76-.84-1.35zm13.81-5.38L6.05 21.34l8.49-8.49 2.27 2.27zm.91-.91L19.59 12l-1.87-2.21-2.27 2.27 2.27 2.15zM6.05 2.66l10.76 6.22-2.27 2.27-8.49-8.49z" />
                </svg>
                <div className="text-left">
                  <div className="text-[10px] font-light opacity-70">Get it on</div>
                  <div className="text-sm font-semibold -mt-0.5">Google Play</div>
                </div>
              </a>
            </div>

            <p className="text-white/30 text-xs font-light">
              Coming soon to iOS and Android
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default Index;
