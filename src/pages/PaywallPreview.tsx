// Temporary preview-only page to screenshot the paywall design without auth.
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, RotateCcw, Sparkles } from "lucide-react";

const Feature = ({ children }: { children: React.ReactNode }) => (
  <li className="flex items-start gap-2.5">
    <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" strokeWidth={2} />
    <span>{children}</span>
  </li>
);

const PaywallPreview = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className="max-w-lg mx-auto px-6 pt-12 pb-24"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 3rem)" }}
      >
        <div className="mb-10">
          <h1 className="font-heading text-[44px] leading-[1.02] tracking-[-0.02em] mb-4">
            Train like<br />you mean it.
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            Structured training, nutrition, and recovery — engineered for who you're becoming.
          </p>
        </div>

        <div className="space-y-6 mb-10">
          {/* Apollo Reborn */}
          <div className="relative rounded-3xl bg-card border border-primary/30 p-7 space-y-6 shadow-[0_20px_60px_-20px_rgba(255,255,255,0.12)]">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary rounded-full">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-foreground">
                Most Popular
              </span>
            </div>

            <div className="pt-2">
              <h2 className="font-heading text-2xl tracking-tight mb-1">Apollo Reborn™</h2>
              <p className="text-xs text-muted-foreground uppercase tracking-[0.15em]">Full Access</p>
            </div>

            <ul className="text-[13px] text-foreground/80 space-y-2.5">
              <Feature>Unlimited workouts</Feature>
              <Feature>All training programs</Feature>
              <Feature>Full recipe library</Feature>
              <Feature>Meal plan, grocery list & macro tracker</Feature>
              <Feature>AI daily workouts</Feature>
            </ul>

            <div className="space-y-3">
              <div className="space-y-2">
                <Button variant="apollo" className="w-full rounded-2xl h-14 text-[15px] shadow-[0_8px_30px_rgba(255,255,255,0.08)]">
                  Unlock Apollo Reborn™ — $9.99 / month
                </Button>
                <p className="text-[11px] text-muted-foreground leading-relaxed px-1">
                  $9.99/month. Auto-renews monthly until cancelled. Cancel anytime in App Store / Google Play settings.
                </p>
              </div>
              <div className="space-y-2">
                <Button variant="apollo" className="w-full rounded-2xl h-14 text-[15px] shadow-[0_8px_30px_rgba(255,255,255,0.08)]">
                  Unlock Apollo Reborn™ — $69.99 / year
                </Button>
                <p className="text-[11px] text-muted-foreground leading-relaxed px-1">
                  $69.99/year. Auto-renews yearly until cancelled. Cancel anytime in App Store / Google Play settings.
                </p>
              </div>
            </div>
          </div>

          {/* Apollo Elite */}
          <div className="relative rounded-3xl p-7 space-y-6 border border-white/10 bg-gradient-to-b from-[hsl(0_0%_6%)] to-[hsl(0_0%_3%)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading text-2xl tracking-tight mb-1 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 opacity-80" />
                  Apollo Elite™
                </h2>
                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.18em]">
                  Limited Coaching Access
                </p>
              </div>
            </div>

            <ul className="text-[13px] text-foreground/80 space-y-2.5">
              <Feature>Everything in Apollo Reborn™</Feature>
              <Feature>1:1 coach messaging (24h replies)</Feature>
              <Feature>Weekly check-ins</Feature>
              <Feature>Personalized guidance from Marcos</Feature>
            </ul>

            <div className="space-y-3">
              <div className="space-y-2">
                <Button variant="apollo" className="w-full rounded-2xl h-14 text-[15px] shadow-[0_8px_30px_rgba(255,255,255,0.08)]">
                  Join Apollo Elite™ — $29.99 / month
                </Button>
                <p className="text-[11px] text-muted-foreground leading-relaxed px-1">
                  $29.99/month. Auto-renews monthly until cancelled. Cancel anytime in App Store / Google Play settings.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
            >
              Continue with Free Starter →
            </button>
          </div>
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground mb-4">
          Subscriptions are billed through your Apple ID or Google Play account and auto-renew at the displayed price unless cancelled at least 24 hours before the end of the current period. Manage or cancel anytime in your device's App Store or Google Play settings — access remains active until the end of the billing period.
        </p>
        <p className="text-[11px] text-muted-foreground mb-6">
          <Link to="/terms" className="underline">Terms of Use</Link>
          {" · "}
          <Link to="/privacy" className="underline">Privacy Policy</Link>
        </p>

        <Button variant="ghost" className="w-full">
          <RotateCcw className="w-4 h-4 mr-2" /> Restore Purchases
        </Button>
      </div>
    </div>
  );
};

export default PaywallPreview;
