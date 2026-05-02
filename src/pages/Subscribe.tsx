import { useEffect, useMemo, useState } from "react";
import { useNavigate, Navigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  isPurchasesAvailable,
} from "@/lib/purchases";
import { Loader2, RotateCcw, Smartphone } from "lucide-react";
import marcosHero from "@/assets/marcos-hero.jpg";

interface IntroOffer {
  periodLabel: string;
  isFree: boolean;
}

interface UiPackage {
  identifier: string;
  tier: "reborn" | "elite";
  priceString: string;
  periodLabel: "month" | "year";
  introOffer: IntroOffer | null;
  raw: any;
}

function readIntroOffer(pkg: any): IntroOffer | null {
  const intro = pkg?.product?.introPrice;
  if (!intro) return null;
  const isFree = typeof intro.price === "number" ? intro.price === 0 : !!intro.price?.amount === false;
  if (!isFree) return null;
  const n: number = intro.periodNumberOfUnits ?? intro.period?.numberOfUnits ?? 0;
  const unitRaw: string = (intro.periodUnit ?? intro.period?.unit ?? "").toString().toUpperCase();
  if (!n || !unitRaw) return null;
  const unitMap: Record<string, string> = {
    DAY: "day", D: "day",
    WEEK: "week", W: "week",
    MONTH: "month", M: "month",
    YEAR: "year", Y: "year",
  };
  const unit = unitMap[unitRaw] ?? unitRaw.toLowerCase();
  return { periodLabel: `${n} ${unit}${n === 1 ? "" : "s"}`, isFree: true };
}

function periodFromPackage(pkg: any): "month" | "year" {
  const id = String(pkg?.identifier ?? "").toLowerCase();
  const productId = String(pkg?.product?.identifier ?? "").toLowerCase();
  const combined = `${id} ${productId}`;
  if (combined.includes("annual") || combined.includes("year")) return "year";
  return "month";
}

function isElitePackage(pkg: any): boolean {
  const id = String(pkg?.identifier ?? "").toLowerCase();
  const productId = String(pkg?.product?.identifier ?? "").toLowerCase();
  return id.includes("elite") || productId.includes("elite");
}

const REASON_BANNERS: Record<string, string> = {
  workouts: "You've used your 10 free workouts. Unlock unlimited training.",
  recipes: "You've used your 10 free recipes. Upgrade for full nutrition access.",
  programs: "You've enrolled in your 2 free programs. Upgrade for the full library.",
  nutrition: "Meal plans, grocery lists, and macro tracking are part of Apollo Reborn.",
  ai: "Your workout, built for today. Unlock AI training with Apollo Reborn.",
  elite: "Apollo Elite includes 1:1 async coaching with Marcos.",
};

// Champagne accent
const CHAMPAGNE = "#F5E6C8";

// Thin custom check
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

const Subscribe = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reason = searchParams.get("reason") ?? "";
  const reasonText = REASON_BANNERS[reason];

  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [rebornPackages, setRebornPackages] = useState<UiPackage[]>([]);
  const [elitePackages, setElitePackages] = useState<UiPackage[]>([]);
  const [billing, setBilling] = useState<"month" | "year">("year");
  const native = isPurchasesAvailable();

  useEffect(() => {
    let active = true;
    (async () => {
      if (!native) {
        setLoading(false);
        return;
      }
      try {
        const offering = await getOfferings();
        if (!active) return;

        const all: UiPackage[] = (offering?.availablePackages ?? []).map((p: any) => ({
          identifier: p.identifier,
          tier: isElitePackage(p) ? "elite" : "reborn",
          priceString: p.product?.priceString ?? "—",
          periodLabel: periodFromPackage(p),
          introOffer: readIntroOffer(p),
          raw: p,
        }));
        setRebornPackages(all.filter((p) => p.tier === "reborn"));
        setElitePackages(all.filter((p) => p.tier === "elite"));
      } catch (err) {
        console.error("[Subscribe] offerings", err);
        toast({
          title: "Couldn't load plans",
          description: err instanceof Error ? err.message : "Try again.",
          variant: "destructive",
        });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [native, toast]);

  if (!user) return <Navigate to="/auth" replace />;

  if (profile?.is_subscribed && (profile as any)?.entitlement === "apollo_elite") {
    return (
      <div className="min-h-screen bg-[#000] text-white">
        <div
          className="max-w-[480px] mx-auto px-6 pt-12 pb-24 text-center"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 3rem)" }}
        >
          <h1 className="font-heading text-4xl mb-3 tracking-tight">You're an Apollo Elite member</h1>
          <p className="text-sm text-white/60 mb-8 leading-relaxed">
            Manage your subscription in your device's App Store or Play Store settings.
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="w-full h-14 rounded-[12px] bg-white text-black font-medium text-[15px] active:scale-[0.98] transition-transform duration-300"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const syncEntitlement = async () => {
    try { await supabase.functions.invoke("sync-entitlement"); } catch (err) { console.warn(err); }
  };

  const handlePurchase = async (pkg: UiPackage) => {
    setPurchasing(pkg.identifier);
    try {
      await purchasePackage(pkg.raw);
      await syncEntitlement();
      await refreshProfile();
      const isElite = pkg.tier === "elite";
      toast({
        title: isElite ? "Welcome to Apollo Elite" : "Welcome to Apollo Reborn",
        description: "Your subscription is active.",
      });
      navigate("/dashboard");
    } catch (err: any) {
      if (err?.userCancelled || err?.code === "PURCHASE_CANCELLED" || err?.code === "USER_CANCELLED") return;
      let title = "Purchase failed";
      let description: string = err?.message ?? "Try again.";
      switch (err?.code) {
        case "NETWORK_ERROR": title = "Connection issue"; description = "Please try again."; break;
        case "PAYMENT_PENDING": title = "Payment pending"; description = "Payment is pending — check back shortly."; break;
        case "STORE_PROBLEM": title = "Store unavailable"; description = "App Store is unavailable. Please try later."; break;
      }
      toast({ title, description, variant: "destructive" });
    } finally {
      setPurchasing(null);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await restorePurchases();
      await syncEntitlement();
      await refreshProfile();
      toast({ title: "Purchases restored" });
      if (user) navigate("/dashboard");
    } catch (err: any) {
      toast({
        title: "Restore failed",
        description: err?.message ?? "Nothing to restore.",
        variant: "destructive",
      });
    } finally {
      setRestoring(false);
    }
  };

  const rebornForBilling = useMemo(
    () => rebornPackages.find((p) => p.periodLabel === billing) ?? rebornPackages[0],
    [rebornPackages, billing]
  );
  const eliteForBilling = useMemo(
    () => elitePackages.find((p) => p.periodLabel === billing) ?? elitePackages[0],
    [elitePackages, billing]
  );

  const hasYearAndMonth = (pkgs: UiPackage[]) =>
    pkgs.some((p) => p.periodLabel === "month") && pkgs.some((p) => p.periodLabel === "year");

  const showToggle = hasYearAndMonth(rebornPackages) || hasYearAndMonth(elitePackages);

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
        <div
          className="absolute inset-x-0 bottom-0 px-6 pb-12 max-w-[480px] mx-auto"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 3rem)" }}
        >
          <p
            className="text-[11px] uppercase mb-5 text-white/60"
            style={{ letterSpacing: "0.24em" }}
          >
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

      <div
        className="max-w-[480px] mx-auto px-6 pt-20 pb-24"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 6rem)" }}
      >
        {/* Outcomes */}
        <section className="mb-20">
          <p
            className="text-[11px] uppercase text-white/50 mb-8"
            style={{ letterSpacing: "0.24em" }}
          >
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

        {reasonText && (
          <div className="rounded-[12px] border border-white/8 bg-white/[0.03] p-5 mb-12">
            <p className="text-[14px] text-white/75 leading-relaxed">{reasonText}</p>
          </div>
        )}

        {!native && (
          <div className="rounded-[12px] border border-white/10 bg-white/[0.02] p-7 mb-12">
            <div className="flex items-center gap-3 mb-3 text-white/85">
              <Smartphone className="w-[18px] h-[18px]" strokeWidth={1.25} />
              <h2 className="font-heading text-[20px]">Open in the app to subscribe</h2>
            </div>
            <p className="text-[14px] text-white/60 leading-relaxed">
              Memberships are processed through the Apple App Store and Google Play.
              Open Apollo Reborn on your phone to choose a plan.
            </p>
          </div>
        )}

        {native && loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-5 h-5 animate-spin text-white/60" />
          </div>
        )}

        {(!native || !loading) && (
          <>
            {/* Billing toggle */}
            {showToggle && (
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
                          background: active ? "#F5E6C8" : "transparent",
                        }}
                      >
                        {opt === "month" ? "Monthly" : "Annual"}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-5 mb-12">
              <PlanCard
                name="Apollo Reborn"
                eyebrow="Full Access"
                features={[
                  "Unlimited workouts",
                  "All training programs",
                  "Full recipe library",
                  "Meal plan, grocery list & macro tracker",
                  "AI daily workouts",
                ]}
                pkg={rebornForBilling}
                native={native}
                purchasing={purchasing}
                onPurchase={handlePurchase}
                ctaLabel="Begin"
              />

              {elitePackages.length > 0 && (
                <PlanCard
                  name="Apollo Elite"
                  eyebrow="By Invitation · 1:1 Coaching"
                  features={[
                    "Everything in Apollo Reborn",
                    "1:1 coach messaging (24h replies)",
                    "Weekly check-ins",
                    "Personalized guidance from Marcos",
                  ]}
                  pkg={eliteForBilling}
                  native={native}
                  purchasing={purchasing}
                  onPurchase={handlePurchase}
                  ctaLabel="Request Access"
                  champagne
                />
              )}
            </div>

            {/* Social proof */}
            <p className="text-center text-[13px] text-white/45 mb-14 leading-relaxed">
              Join thousands training with Apollo.
            </p>

            {/* Free starter */}
            <div className="text-center mb-16">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="text-[14px] text-white/55 hover:text-white/85 transition-colors"
              >
                Continue with Free Starter →
              </button>
            </div>
          </>
        )}

        {/* Footer disclosures */}
        <div className="border-t border-white/[0.06] pt-8">
          <p className="text-[12px] leading-[1.6] text-white/45 mb-4">
            Subscriptions are billed through your Apple ID or Google Play account and
            auto-renew at the displayed price unless cancelled at least 24 hours before
            the end of the current period. Manage or cancel anytime in your device's
            settings — access remains active until the end of the billing period.
          </p>
          <p className="text-[12px] text-white/45 mb-8">
            <Link to="/terms" className="underline underline-offset-4">Terms of Use</Link>
            <span className="mx-2">·</span>
            <Link to="/privacy" className="underline underline-offset-4">Privacy Policy</Link>
          </p>

          <button
            onClick={handleRestore}
            disabled={restoring}
            className="inline-flex items-center gap-2 text-[12px] text-white/45 hover:text-white/75 transition-colors"
          >
            {restoring ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
            )}
            Restore Purchases
          </button>
        </div>
      </div>
    </div>
  );
};

interface PlanCardProps {
  name: string;
  eyebrow: string;
  features: string[];
  pkg: UiPackage | undefined;
  native: boolean;
  purchasing: string | null;
  onPurchase: (pkg: UiPackage) => void;
  ctaLabel: string;
  champagne?: boolean;
}

const PlanCard = ({
  name, eyebrow, features, pkg, native, purchasing, onPurchase, ctaLabel, champagne,
}: PlanCardProps) => {
  const isProcessing = pkg && purchasing === pkg.identifier;

  return (
    <div
      className="relative rounded-[20px] p-8 transition-all duration-500"
      style={{
        background: "linear-gradient(180deg, #141414 0%, #0E0E0E 100%)",
        border: champagne
          ? "1px solid rgba(245,230,200,0.22)"
          : "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <p
        className="text-[11px] uppercase mb-4"
        style={{
          letterSpacing: "0.22em",
          color: champagne ? CHAMPAGNE : "rgba(255,255,255,0.55)",
          opacity: champagne ? 0.85 : 1,
        }}
      >
        {eyebrow}
      </p>

      <h2
        className="font-heading text-[34px] tracking-[-0.01em] mb-6 leading-[1.05]"
        style={{ fontWeight: 400 }}
      >
        {name}
      </h2>

      {/* Price */}
      <div className="flex items-baseline gap-2 mb-2">
        <span
          className="font-heading text-[44px] tracking-[-0.02em] leading-none"
          style={{ fontWeight: 400 }}
        >
          {pkg?.priceString ?? "—"}
        </span>
        {pkg && (
          <span className="text-[13px] text-white/50">
            / {pkg.periodLabel}
          </span>
        )}
      </div>
      {pkg?.introOffer && (
        <p
          className="inline-block text-[11px] uppercase mt-1 mb-2 px-2.5 py-1 rounded-full"
          style={{
            letterSpacing: "0.18em",
            color: CHAMPAGNE,
            border: `1px solid ${CHAMPAGNE}40`,
          }}
        >
          {pkg.introOffer.periodLabel} free
        </p>
      )}

      <div
        className="my-7 h-px w-full"
        style={{ background: "rgba(255,255,255,0.07)" }}
      />

      <ul className="space-y-3.5 mb-8">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-3">
            <ThinCheck
              className="w-[16px] h-[16px] mt-[3px] flex-shrink-0"
              style={{ color: champagne ? CHAMPAGNE : "rgba(255,255,255,0.7)" } as any}
            />
            <span className="text-[15px] leading-[1.5] text-white/80">{f}</span>
          </li>
        ))}
      </ul>

      {!native ? (
        <p className="text-[12px] text-white/45 leading-relaxed">
          Open the app on your phone to subscribe.
        </p>
      ) : !pkg ? (
        <button
          disabled
          className="w-full h-14 rounded-[12px] border border-white/10 text-white/45 text-[14px]"
        >
          Plans loading…
        </button>
      ) : (
        <>
          <button
            onClick={() => onPurchase(pkg)}
            disabled={purchasing !== null}
            className="w-full h-14 rounded-[12px] bg-white text-black font-medium text-[15px] active:scale-[0.98] transition-transform duration-300 flex items-center justify-center gap-2 disabled:opacity-70"
            style={{ transitionTimingFunction: "cubic-bezier(0.25, 1, 0.5, 1)" }}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Processing…
              </>
            ) : (
              ctaLabel
            )}
          </button>
          <p className="text-[11px] text-white/40 leading-relaxed mt-3">
            {pkg.introOffer
              ? `${pkg.introOffer.periodLabel} free, then ${pkg.priceString}/${pkg.periodLabel}. Auto-renews until cancelled.`
              : `${pkg.priceString}/${pkg.periodLabel}. Auto-renews until cancelled.`}
          </p>
        </>
      )}
    </div>
  );
};

export default Subscribe;
