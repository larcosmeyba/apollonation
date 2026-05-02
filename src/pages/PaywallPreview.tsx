// Temporary preview-only page to screenshot the paywall design without auth.
import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, RotateCcw } from "lucide-react";
import marcosHero from "@/assets/marcos-hero.jpg";

const CHAMPAGNE = "#F5E6C8";

const ThinCheck = ({ className = "", style }: { className?: string; style?: React.CSSProperties }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.25"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
    aria-hidden
  >
    <path d="M4 12.5l5 5L20 6.5" />
  </svg>
);

interface Plan {
  name: string;
  eyebrow: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  champagne?: boolean;
}

const PaywallPreview = () => {
  const [billing, setBilling] = useState<"month" | "year">("year");

  const reborn: Plan = {
    name: "Apollo Reborn",
    eyebrow: "Full Access",
    price: billing === "year" ? "$69.99" : "$9.99",
    period: billing,
    features: [
      "Unlimited workouts",
      "All training programs",
      "Full recipe library",
      "Meal plan, grocery list & macro tracker",
      "AI daily workouts",
    ],
    cta: "Begin",
  };

  const elite: Plan = {
    name: "Apollo Elite",
    eyebrow: "By Invitation · 1:1 Coaching",
    price: billing === "year" ? "$299.99" : "$29.99",
    period: billing,
    features: [
      "Everything in Apollo Reborn",
      "1:1 coach messaging (24h replies)",
      "Weekly check-ins",
      "Personalized guidance from Marcos",
    ],
    cta: "Request Access",
    champagne: true,
  };

  return (
    <div
      className="min-h-screen text-white"
      style={{ background: "linear-gradient(180deg, #000 0%, #0A0A0A 100%)" }}
    >
      {/* Hero */}
      <section className="relative h-[88vh] min-h-[560px] w-full overflow-hidden">
        <img
          src={marcosHero}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ transform: "scale(1.05)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black" />
        <div className="absolute inset-x-0 bottom-0 px-6 pb-12 max-w-[480px] mx-auto">
          <p className="text-[11px] uppercase mb-5 text-white/60" style={{ letterSpacing: "0.24em" }}>
            Apollo Membership
          </p>
          <h1
            className="font-heading text-[56px] leading-[1.02] tracking-[-0.02em] mb-5"
            style={{ fontWeight: 400 }}
          >
            Train like<br />you mean it.
          </h1>
          <p className="text-[16px] leading-[1.5] text-white/70 max-w-[400px]">
            Structured training, nutrition, and recovery — engineered for who you're becoming.
          </p>
        </div>
      </section>

      <div className="max-w-[480px] mx-auto px-6 pt-20 pb-24">
        {/* Outcomes */}
        <section className="mb-20">
          <p className="text-[11px] uppercase text-white/50 mb-8" style={{ letterSpacing: "0.24em" }}>
            What you receive
          </p>
          <ul className="space-y-6">
            {[
              "Daily AI workouts tuned to your recovery",
              "Coaching that adapts in real time",
              "Nutrition built around your training, not a template",
              "Progress you can actually feel",
            ].map((line) => (
              <li key={line} className="flex items-start gap-4">
                <ThinCheck className="w-[18px] h-[18px] mt-1 text-white/70 flex-shrink-0" />
                <span className="text-[16px] leading-[1.5] text-white/85">{line}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex p-1 rounded-full border border-white/10 bg-white/[0.02]">
            {(["month", "year"] as const).map((opt) => {
              const active = billing === opt;
              return (
                <button
                  key={opt}
                  onClick={() => setBilling(opt)}
                  className="relative px-5 py-2 text-[12px] uppercase rounded-full transition-colors duration-300"
                  style={{
                    letterSpacing: "0.18em",
                    color: active ? "#000" : "rgba(255,255,255,0.65)",
                    background: active ? CHAMPAGNE : "transparent",
                  }}
                >
                  {opt === "month" ? "Monthly" : "Annual"}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-5 mb-12">
          {[reborn, elite].map((plan) => (
            <div
              key={plan.name}
              className="relative rounded-[20px] p-8"
              style={{
                background: "linear-gradient(180deg, #141414 0%, #0E0E0E 100%)",
                border: plan.champagne
                  ? "1px solid rgba(245,230,200,0.22)"
                  : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <p
                className="text-[11px] uppercase mb-4"
                style={{
                  letterSpacing: "0.22em",
                  color: plan.champagne ? CHAMPAGNE : "rgba(255,255,255,0.55)",
                }}
              >
                {plan.eyebrow}
              </p>
              <h2
                className="font-heading text-[34px] tracking-[-0.01em] mb-6 leading-[1.05]"
                style={{ fontWeight: 400 }}
              >
                {plan.name}
              </h2>

              <div className="flex items-baseline gap-2 mb-2">
                <span
                  className="font-heading text-[44px] tracking-[-0.02em] leading-none"
                  style={{ fontWeight: 400 }}
                >
                  {plan.price}
                </span>
                <span className="text-[13px] text-white/50">/ {plan.period}</span>
              </div>

              <div className="my-7 h-px w-full" style={{ background: "rgba(255,255,255,0.07)" }} />

              <ul className="space-y-3.5 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <ThinCheck
                      className="w-[16px] h-[16px] mt-[3px] flex-shrink-0"
                      style={{ color: plan.champagne ? CHAMPAGNE : "rgba(255,255,255,0.7)" }}
                    />
                    <span className="text-[15px] leading-[1.5] text-white/80">{f}</span>
                  </li>
                ))}
              </ul>

              <button
                className="w-full h-14 rounded-[12px] bg-white text-black font-medium text-[15px] active:scale-[0.98] transition-transform"
                style={{ transitionTimingFunction: "cubic-bezier(0.25, 1, 0.5, 1)" }}
              >
                {plan.cta}
              </button>
              <p className="text-[11px] text-white/40 leading-relaxed mt-3">
                {plan.price}/{plan.period}. Auto-renews until cancelled.
              </p>
            </div>
          ))}
        </div>

        <p className="text-center text-[13px] text-white/45 mb-14 leading-relaxed">
          Join thousands training with Apollo.
        </p>

        <div className="text-center mb-16">
          <button className="text-[14px] text-white/55 hover:text-white/85 transition-colors">
            Continue with Free Starter →
          </button>
        </div>

        <div className="border-t border-white/[0.06] pt-8">
          <p className="text-[12px] leading-[1.6] text-white/45 mb-4">
            Subscriptions are billed through your Apple ID or Google Play account and
            auto-renew at the displayed price unless cancelled at least 24 hours before
            the end of the current period.
          </p>
          <p className="text-[12px] text-white/45 mb-8">
            <Link to="/terms" className="underline underline-offset-4">Terms of Use</Link>
            <span className="mx-2">·</span>
            <Link to="/privacy" className="underline underline-offset-4">Privacy Policy</Link>
          </p>
          <button className="inline-flex items-center gap-2 text-[12px] text-white/45">
            <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
            Restore Purchases
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaywallPreview;
