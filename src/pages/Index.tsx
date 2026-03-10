import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import VideosSection from "@/components/VideosSection";
import PricingSection from "@/components/PricingSection";
import JoinSection from "@/components/JoinSection";
import ContactRequestSection from "@/components/ContactRequestSection";
import TestimonialsSection from "@/components/TestimonialsSection";

import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

const Index = () => {
  return (
    <main className="min-h-screen bg-background overflow-x-hidden w-full">
      <SEOHead
        path="/"
        description="Transform your body with Coach Marcos at Apollo Nation. Elite personal training programs, HD workout videos, custom nutrition plans, and 1-on-1 coaching. Join 100+ athletes today."
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Apollo Nation",
            "url": "https://www.www-apollo.com",
            "logo": "https://www.www-apollo.com/favicon.png",
            "description": "Elite personal training and coaching by Coach Marcos.",
            "sameAs": []
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
      <JoinSection />
      <TestimonialsSection />
      <Footer />
    </main>
  );
};

export default Index;
