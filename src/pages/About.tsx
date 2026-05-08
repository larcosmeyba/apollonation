import DashboardLayout from "@/components/dashboard/DashboardLayout";
import marcosAction1 from "@/assets/marcos-action-1.jpg";

const About = () => {
  return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto space-y-8 pb-12">
        {/* Hero */}
        <div className="relative rounded-2xl overflow-hidden aspect-[16/10]">
          <img src={marcosAction1} alt="Marcos Leyba" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Apollo Reborn
            </h1>
            <p className="text-sm font-medium text-white/80 mt-2">
              Built by Marcos Leyba
            </p>
          </div>
        </div>

        {/* Mission */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Our Mission
          </h2>
          <p className="text-sm text-foreground leading-relaxed">
            Apollo Reborn was created to bring structured, coach-led training to everyone — regardless of experience level, age, or fitness background. We believe that real results come from real programming, not random workouts.
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            Every workout on Apollo Reborn is designed with purpose. Each session follows a structured training methodology built around progressive overload, balanced programming, and recovery — the same principles used by professional athletes.
          </p>
        </div>

        {/* The Founder */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Meet the Founder
          </h2>
          <p className="text-sm text-foreground leading-relaxed">
            Marcos Leyba is a certified fitness coach and the founder of Apollo Reborn. After years in the gym and in the trenches of personal training, he realized one truth: every fitness app on the market felt disconnected — cluttered interfaces, cookie-cutter programs, and no real accountability. Nothing matched the precision he demanded for his clients.
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            Drawing on a background in web design and digital business creation, Marcos decided to build what the industry was missing. He personally designed every screen, every flow, and every detail of Apollo Reborn — from the training logic to the user experience — to deliver a platform that feels as intentional as the workouts themselves.
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            Apollo Reborn is the result: a fully integrated training ecosystem built by a coach who refused to settle for mediocrity. His approach combines evidence-based strength training, functional movement, and practical nutrition guidance into one cohesive system — engineered to scale real coaching to anyone, anywhere.
          </p>
        </div>

        {/* What We Offer */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            What You Get
          </h2>
          <div className="space-y-3">
            {[
              { title: "On-Demand Workouts", desc: "New classes added weekly — Strength, HIIT, Sculpt, Cardio, and more." },
              { title: "Nutrition Guidance", desc: "Personalized meal plans, macro tracking, and grocery lists tailored to your goals." },
            ].map((item) => (
              <div key={item.title} className="p-4 rounded-2xl bg-card border border-border">
                <h3 className="text-sm font-bold text-foreground">{item.title}</h3>
                <p className="text-xs text-foreground/70 mt-1 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default About;
