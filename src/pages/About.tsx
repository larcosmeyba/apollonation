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
              Apollo Nation
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
            Apollo Nation was created to bring structured, coach-led training to everyone — regardless of experience level, age, or fitness background. We believe that real results come from real programming, not random workouts.
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            Every workout on Apollo Nation is designed with purpose. Each session follows a structured training methodology built around progressive overload, balanced programming, and recovery — the same principles used by professional athletes.
          </p>
        </div>

        {/* The Coach */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Meet the Founder
          </h2>
          <p className="text-sm text-foreground leading-relaxed">
            Marcos Leyba is a certified fitness coach and the founder of Apollo Nation. With years of experience in personal training, group coaching, and program design, Marcos has helped hundreds of clients transform their bodies and build sustainable fitness habits.
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            His approach combines strength training, functional movement, and nutrition guidance into one cohesive system. Apollo Nation is the platform he built to scale that coaching to reach more people.
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
