import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TestimonialsSection from "@/components/TestimonialsSection";
import SEOHead from "@/components/SEOHead";
import { ArrowRight, Play, Calendar, Apple, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import heroImage from "@/assets/marcos-hero.jpg";
import marcosAction1 from "@/assets/marcos-action-1.jpg";
import marcosAction6 from "@/assets/marcos-action-6.jpg";
import marcosAction7 from "@/assets/marcos-action-7.jpg";
import marcos6 from "@/assets/marcos-6.jpg";

const scrollToDownload = () =>
  document.getElementById("download")?.scrollIntoView({ behavior: "smooth" });

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

      {/* ─── 1. HERO ─── */}
      <header className="relative min-h-[85vh] md:min-h-screen flex items-center justify-center overflow-hidden pt-16" role="banner">
        <img
          src={heroImage}
          alt="Apollo Nation athlete training"
          fetchPriority="high"
          decoding="async"
          className={`absolute inset-0 w-full h-full object-cover object-[50%_30%] transition-transform duration-[2500ms] ease-out ${isVisible ? "scale-100" : "scale-110"}`}
        />
        {/* Dark cinematic overlay */}
        <div className="absolute inset-0 bg-background/65" />
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            <span
              className={`inline-block text-[10px] uppercase tracking-[0.3em] text-white/50 mb-5 font-light transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
            >
              On-Demand Fitness Platform
            </span>

            <h1
              className={`font-heading text-4xl sm:text-5xl md:text-7xl lg:text-8xl leading-[1.05] mb-5 tracking-[0.02em] transition-all duration-1000 delay-100 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            >
              <span className="block text-white">Train Like</span>
              <span className="block text-white/60">a Legend</span>
            </h1>

            <p
              className={`text-sm md:text-lg text-white/60 max-w-md mx-auto mb-8 font-light leading-relaxed transition-all duration-1000 delay-200 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            >
              On-demand workouts, structured training programs, and practical nutrition guidance designed to fit real life.
            </p>

            <div
              className={`flex flex-col sm:flex-row items-center justify-center gap-3 transition-all duration-1000 delay-300 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            >
              <Button
                variant="apollo"
                size="lg"
                className="group h-14 px-8 text-base rounded-full"
                onClick={scrollToDownload}
              >
                Download the App
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
              </Button>
              <Button
                variant="apollo-outline"
                size="lg"
                className="h-14 px-8 text-base rounded-full"
                onClick={() => document.getElementById("pillars")?.scrollIntoView({ behavior: "smooth" })}
              >
                Start Training
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ─── 2. WHAT APOLLO IS ─── */}
      <section className="py-20 md:py-28 border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-4 block font-light">
              What is Apollo Nation
            </span>
            <h2 className="font-heading text-3xl md:text-4xl text-white tracking-wide mb-6">
              Your Training, Your Schedule
            </h2>
            <p className="text-white/50 font-light leading-relaxed text-base">
              Apollo Nation is an on-demand fitness platform with everything you need to train, eat right, and stay consistent. Just open the app and get to work.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 3. ON-DEMAND WORKOUTS ─── */}
      <section className="py-20 md:py-28 border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="relative rounded-2xl overflow-hidden aspect-video">
              <img
                src={marcosAction1}
                alt="On-demand workout"
                loading="lazy"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border border-white/30 flex items-center justify-center bg-background/30 backdrop-blur-sm">
                  <Play className="w-6 h-6 text-white ml-1" fill="white" />
                </div>
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-3 block font-light">
                01
              </span>
              <h2 className="font-heading text-2xl md:text-3xl text-white mb-4 tracking-wide">
                On-Demand Workouts
              </h2>
              <p className="text-white/50 font-light leading-relaxed mb-6">
                HD workout videos you can follow anywhere, anytime. New sessions added weekly across strength, HIIT, mobility, and more.
              </p>
              <ul className="space-y-3">
                {["Full HD video library", "New workouts weekly", "All fitness levels"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-white/60 text-sm font-light">
                    <div className="w-1 h-1 rounded-full bg-white/40" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4. STRUCTURED PROGRAMS ─── */}
      <section className="py-20 md:py-28 border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="order-2 lg:order-1">
              <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-3 block font-light">
                02
              </span>
              <h2 className="font-heading text-2xl md:text-3xl text-white mb-4 tracking-wide">
                Structured Programs
              </h2>
              <p className="text-white/50 font-light leading-relaxed mb-6">
                Multi-week training programs with progressive overload built in. Pick a program, follow the plan, and track your progress.
              </p>
              <ul className="space-y-3">
                {["4–8 week programs", "Progressive overload", "Built-in tracking"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-white/60 text-sm font-light">
                    <div className="w-1 h-1 rounded-full bg-white/40" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative rounded-2xl overflow-hidden aspect-video order-1 lg:order-2">
              <img
                src={marcosAction6}
                alt="Structured training program"
                loading="lazy"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5. NUTRITION SYSTEM ─── */}
      <section className="py-20 md:py-28 border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="relative rounded-2xl overflow-hidden aspect-video">
              <img
                src={marcosAction7}
                alt="Nutrition guidance"
                loading="lazy"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-3 block font-light">
                03
              </span>
              <h2 className="font-heading text-2xl md:text-3xl text-white mb-4 tracking-wide">
                Nutrition System
              </h2>
              <p className="text-white/50 font-light leading-relaxed mb-6">
                Practical meal plans, macro tracking, and a growing recipe library — designed to keep nutrition simple and sustainable.
              </p>
              <ul className="space-y-3">
                {["Weekly meal plans", "Macro tracking", "Recipe collection"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-white/60 text-sm font-light">
                    <div className="w-1 h-1 rounded-full bg-white/40" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 6. APP EXPERIENCE ─── */}
      <section className="py-20 md:py-28 border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-4 block font-light">
              The App
            </span>
            <h2 className="font-heading text-3xl md:text-4xl text-white tracking-wide mb-6">
              Everything in Your Pocket
            </h2>
            <p className="text-white/50 font-light leading-relaxed">
              One app. No clutter. Just open it and train.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { icon: Play, label: "Workouts" },
              { icon: Calendar, label: "Programs" },
              { icon: Apple, label: "Nutrition" },
              { icon: Smartphone, label: "Track Progress" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center gap-3 p-6 border border-white/10 rounded-2xl bg-card"
              >
                <div className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center">
                  <item.icon className="w-4 h-4 text-white/70" strokeWidth={1.5} />
                </div>
                <span className="text-white/60 text-xs font-light tracking-wide">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 7. TESTIMONIALS ─── */}
      <TestimonialsSection />

      {/* ─── 8. DOWNLOAD CTA ─── */}
      <section id="download" className="py-20 md:py-28 border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="max-w-xl mx-auto text-center">
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-4 block font-light">
              Get Started
            </span>
            <h2 className="font-heading text-3xl md:text-5xl text-white mb-5 tracking-wide">
              Start Training Today
            </h2>
            <p className="text-white/50 font-light leading-relaxed mb-10">
              Download Apollo Nation. It's that simple.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <a
                href="#"
                className="flex items-center gap-3 bg-white text-background px-6 py-3.5 rounded-xl hover:bg-white/90 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <div className="text-left">
                  <div className="text-[10px] font-light opacity-70">Download on the</div>
                  <div className="text-sm font-semibold -mt-0.5">App Store</div>
                </div>
              </a>

              <a
                href="#"
                className="flex items-center gap-3 bg-white text-background px-6 py-3.5 rounded-xl hover:bg-white/90 transition-colors"
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

            <p className="text-white/25 text-xs font-light">
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
