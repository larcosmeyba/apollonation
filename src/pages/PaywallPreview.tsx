// Temporary preview-only page to screenshot the paywall design without auth.
import { useState } from "react";
import { Link } from "react-router-dom";
import { RotateCcw } from "lucide-react";

const CHAMPAGNE = "#F5E6C8";

const ThinCheck = ({ className = "", style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25"
    strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden>
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
    features: ["Unlimited workouts", "All programs & recipes", "Meal plan & macro tracker", "AI daily workouts"],
    cta: "Begin",
  };

  const elite: Plan = {
    name: "Apollo Elite",
    eyebrow: "By Invitation · 1:1 Coaching",
    price: billing === "year" ? "$299.99" : "$29.99",
    period: billing,
    features: ["Everything in Reborn", "1:1 coach messaging", "Weekly check-ins", "Guidance from Marcos"],
    cta: "Request Access",
    champagne: true,
  };

  return (
    <div className="h-screen overflow-hidden text-white flex flex-col"
      style={{ background: "linear-gradient(180deg, #000 0%, #0A0A0A 100%)" }}>
      <div className="flex-1 max-w-[440px] mx-auto w-full px-5 flex flex-col"
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 1.5rem)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)",
        }}>
        {/* Header */}
        <div className="text-center mb-5">
          <p className="text-[10px] uppercase text-white/50 mb-2" style={{ letterSpacing: "0.28em" }}>
            Apollo
          </p>
          <h1 className="font-heading text-[34px] leading-[1.05] tracking-[-0.02em]" style={{ fontWeight: 400 }}>
            Memberships
          </h1>
        </div>

        {/* Toggle */}
        <div className="flex justify-center mb-5">
          <div className="inline-flex p-1 rounded-full border border-white/10 bg-white/[0.02]">
            {(["month", "year"] as const).map((opt) => {
              const active = billing === opt;
              return (
                <button key={opt} onClick={() => setBilling(opt)}
                  className="px-4 py-1.5 text-[11px] uppercase rounded-full transition-colors"
                  style={{
                    letterSpacing: "0.18em",
                    color: active ? "#000" : "rgba(255,255,255,0.65)",
                    background: active ? CHAMPAGNE : "transparent",
                  }}>
                  {opt === "month" ? "Monthly" : "Annual"}
                </button>
              );
            })}
          </div>
        </div>

        {/* Plans */}
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          {[reborn, elite].map((plan) => (
            <div key={plan.name} className="rounded-[18px] p-5 flex flex-col"
              style={{
                background: "linear-gradient(180deg, #141414 0%, #0E0E0E 100%)",
                border: plan.champagne
                  ? "1px solid rgba(245,230,200,0.22)"
                  : "1px solid rgba(255,255,255,0.08)",
              }}>
              {/* Top row: name + price */}
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="text-[10px] uppercase mb-1.5"
                    style={{
                      letterSpacing: "0.2em",
                      color: plan.champagne ? CHAMPAGNE : "rgba(255,255,255,0.55)",
                    }}>
                    {plan.eyebrow}
                  </p>
                  <h2 className="font-heading text-[24px] tracking-[-0.01em] leading-none" style={{ fontWeight: 400 }}>
                    {plan.name}
                  </h2>
                </div>
                <div className="text-right">
                  <div className="font-heading text-[28px] tracking-[-0.02em] leading-none" style={{ fontWeight: 400 }}>
                    {plan.price}
                  </div>
                  <div className="text-[11px] text-white/50 mt-1">/ {plan.period}</div>
                </div>
              </div>

              <div className="my-3 h-px w-full" style={{ background: "rgba(255,255,255,0.07)" }} />

              <ul className="space-y-2 mb-4 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <ThinCheck className="w-[14px] h-[14px] mt-[3px] flex-shrink-0"
                      style={{ color: plan.champagne ? CHAMPAGNE : "rgba(255,255,255,0.65)" }} />
                    <span className="text-[13px] leading-[1.45] text-white/80">{f}</span>
                  </li>
                ))}
              </ul>

              <button className="w-full h-11 rounded-[10px] bg-white text-black font-medium text-[14px] active:scale-[0.98] transition-transform">
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-4 mt-3 text-center space-y-2.5">
          <button className="text-[12px] text-white/55 hover:text-white/85 block w-full">
            Continue with Free Starter →
          </button>
          <p className="text-[10px] text-white/35 leading-relaxed px-2">
            Auto-renews until cancelled. Manage in App Store / Google Play settings.
            <span className="block mt-1">
              <Link to="/terms" className="underline underline-offset-2">Terms</Link>
              <span className="mx-1.5">·</span>
              <Link to="/privacy" className="underline underline-offset-2">Privacy</Link>
              <span className="mx-1.5">·</span>
              <button className="inline-flex items-center gap-1 underline underline-offset-2">
                <RotateCcw className="w-2.5 h-2.5" strokeWidth={1.5} /> Restore
              </button>
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaywallPreview;
