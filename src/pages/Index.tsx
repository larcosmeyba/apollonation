import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import VideosSection from "@/components/VideosSection";
import PricingSection from "@/components/PricingSection";
import ContactRequestSection from "@/components/ContactRequestSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import { AlertTriangle } from "lucide-react";

import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

const Index = () => {
  return (
    <main className="min-h-screen overflow-x-hidden w-full">
      <div className="bg-primary text-primary-foreground py-3 px-4 text-center relative z-50">
        <div className="container mx-auto flex items-center justify-center gap-2 text-sm md:text-base">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <p className="font-medium">
            🚀 We're launching on the App Store &amp; Google Play! The web app may be temporarily unavailable during this transition. Stay tuned!
          </p>
        </div>
      </div>
      <SEOHead
        path="/"
        description="Transform your body with Coach Marcos at Apollo Nation. Elite personal training programs, HD workout videos, custom nutrition plans, and 1-on-1 coaching. Join today."
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Apollo Nation",
            "url": "https://www.www-apollo.com",
            "logo": "https://www.www-apollo.com/favicon.png",
            "description": "Elite personal training and coaching by Coach Marcos.",
            "sameAs": [
              "https://www.instagram.com/larcosfit",
              "https://www.youtube.com/@larcosfitness"
            ]
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "Apollo Nation",
            "url": "https://www.www-apollo.com",
            "potentialAction": {
              "@type": "SearchAction",
              "target": "https://www.www-apollo.com/?q={search_term_string}",
              "query-input": "required name=search_term_string"
            }
          },
          {
            "@context": "https://schema.org",
            "@type": "Service",
            "serviceType": "Personal Training & Fitness Coaching",
            "provider": {
              "@type": "Organization",
              "name": "Apollo Nation"
            },
            "name": "Elite Personal Training by Coach Marcos",
            "description": "Personalized workout programs, nutrition plans, and 1-on-1 coaching to transform your body and mind.",
            "offers": {
              "@type": "AggregateOffer",
              "priceCurrency": "USD",
              "lowPrice": "19.99",
              "offerCount": "3"
            }
          }
        ]}
      />
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <ContactRequestSection />
      <VideosSection />
      <PricingSection />
      <TestimonialsSection />
      <Footer />
    </main>
  );
};

export default Index;
