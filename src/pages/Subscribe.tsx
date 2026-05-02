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

interface IntroOffer { periodLabel: string; isFree: boolean; }

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
  const unitMap: Record<string, string> = { DAY:"day",D:"day",WEEK:"week",W:"week",MONTH:"month",M:"month",YEAR:"year",Y:"year" };
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

const CHAMPAGNE = "#F5E6C8";

const ThinCheck = ({ className = "", style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25"
    strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden>
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
      if (!native) { setLoading(false); return; }
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
    return () => { active = false; };
  }, [native, toast]);

  if (!user) return <Navigate to="/auth" replace />;

  if (profile?.is_subscribed && (profile as any)?.entitlement === "apollo_elite") {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-[440px] mx-auto px-6 pt-12 pb-24 text-center"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 3rem)" }}>
          <h1 className="font-heading text-3xl mb-3">You're an Apollo Elite member</h1>
          <p className="text-sm text-white/60 mb-8">
            Manage your subscription in your device's App Store or Play Store settings.
          </p>
          <button onClick={() => navigate("/dashboard")}
            className="w-full h-12 rounded-[10px] bg-white text-black font-medium text-[14px]">
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
      toast({ title: "Restore failed", description: err?.message ?? "Nothing to restore.", variant: "destructive" });
    } finally {
      setRestoring(false);
    }
  };

  const rebornPkg = useMemo(
    () => rebornPackages.find((p) => p.periodLabel === billing) ?? rebornPackages[0],
    [rebornPackages, billing]
  );
  const elitePkg = useMemo(
    () => elitePackages.find((p) => p.periodLabel === billing) ?? elitePackages[0],
    [elitePackages, billing]
  );

  const hasYearAndMonth = (pkgs: UiPackage[]) =>
    pkgs.some((p) => p.periodLabel === "month") && pkgs.some((p) => p.periodLabel === "year");
  const showToggle = hasYearAndMonth(rebornPackages) || hasYearAndMonth(elitePackages);

  return (
    <div className="min-h-screen text-white flex flex-col"
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

        {reasonText && (
          <div className="rounded-[12px] border border-white/10 bg-white/[0.03] p-3 mb-4">
            <p className="text-[12px] text-white/75 leading-relaxed text-center">{reasonText}</p>
          </div>
        )}

        {!native && (
          <div className="rounded-[12px] border border-white/10 bg-white/[0.02] p-5 mb-4">
            <div className="flex items-center gap-2 mb-2 text-white/85">
              <Smartphone className="w-4 h-4" strokeWidth={1.25} />
              <h2 className="font-heading text-[16px]">Open in the app to subscribe</h2>
            </div>
            <p className="text-[13px] text-white/60 leading-relaxed">
              Memberships are processed through the Apple App Store and Google Play.
            </p>
          </div>
        )}

        {native && loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-white/60" />
          </div>
        )}

        {(!native || !loading) && (
          <>
            {/* Toggle */}
            {showToggle && (
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
            )}

            {/* Plans */}
            <div className="flex-1 flex flex-col gap-3 min-h-0">
              <PlanCard
                name="Apollo Reborn"
                eyebrow="Full Access"
                features={["Unlimited workouts", "All programs & recipes", "Meal plan & macro tracker", "AI daily workouts"]}
                pkg={rebornPkg}
                native={native}
                purchasing={purchasing}
                onPurchase={handlePurchase}
                ctaLabel="Begin"
              />
              {elitePackages.length > 0 && (
                <PlanCard
                  name="Apollo Elite"
                  eyebrow="By Invitation · 1:1 Coaching"
                  features={["Everything in Reborn", "1:1 coach messaging", "Weekly check-ins", "Guidance from Marcos"]}
                  pkg={elitePkg}
                  native={native}
                  purchasing={purchasing}
                  onPurchase={handlePurchase}
                  ctaLabel="Request Access"
                  champagne
                />
              )}
            </div>

            {/* Footer */}
            <div className="pt-4 mt-3 text-center space-y-2.5">
              <button onClick={() => navigate("/dashboard")}
                className="text-[12px] text-white/55 hover:text-white/85 block w-full">
                Continue with Free Starter →
              </button>
              <p className="text-[10px] text-white/35 leading-relaxed px-2">
                Auto-renews until cancelled. Manage in App Store / Google Play settings.
                <span className="block mt-1">
                  <Link to="/terms" className="underline underline-offset-2">Terms</Link>
                  <span className="mx-1.5">·</span>
                  <Link to="/privacy" className="underline underline-offset-2">Privacy</Link>
                  <span className="mx-1.5">·</span>
                  <button onClick={handleRestore} disabled={restoring}
                    className="inline-flex items-center gap-1 underline underline-offset-2">
                    {restoring ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <RotateCcw className="w-2.5 h-2.5" strokeWidth={1.5} />}
                    Restore
                  </button>
                </span>
              </p>
            </div>
          </>
        )}
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

const PlanCard = ({ name, eyebrow, features, pkg, native, purchasing, onPurchase, ctaLabel, champagne }: PlanCardProps) => {
  const isProcessing = pkg && purchasing === pkg.identifier;
  return (
    <div className="rounded-[18px] p-5 flex flex-col"
      style={{
        background: "linear-gradient(180deg, #141414 0%, #0E0E0E 100%)",
        border: champagne ? "1px solid rgba(245,230,200,0.22)" : "1px solid rgba(255,255,255,0.08)",
      }}>
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-[10px] uppercase mb-1.5"
            style={{ letterSpacing: "0.2em", color: champagne ? CHAMPAGNE : "rgba(255,255,255,0.55)" }}>
            {eyebrow}
          </p>
          <h2 className="font-heading text-[24px] tracking-[-0.01em] leading-none" style={{ fontWeight: 400 }}>
            {name}
          </h2>
        </div>
        <div className="text-right">
          <div className="font-heading text-[28px] tracking-[-0.02em] leading-none" style={{ fontWeight: 400 }}>
            {pkg?.priceString ?? "—"}
          </div>
          {pkg && <div className="text-[11px] text-white/50 mt-1">/ {pkg.periodLabel}</div>}
        </div>
      </div>

      <div className="my-3 h-px w-full" style={{ background: "rgba(255,255,255,0.07)" }} />

      <ul className="space-y-2 mb-4 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <ThinCheck className="w-[14px] h-[14px] mt-[3px] flex-shrink-0"
              style={{ color: champagne ? CHAMPAGNE : "rgba(255,255,255,0.65)" }} />
            <span className="text-[13px] leading-[1.45] text-white/80">{f}</span>
          </li>
        ))}
      </ul>

      {!native ? (
        <p className="text-[11px] text-white/45 text-center">Open the app to subscribe.</p>
      ) : !pkg ? (
        <button disabled className="w-full h-11 rounded-[10px] border border-white/10 text-white/45 text-[13px]">
          Plans loading…
        </button>
      ) : (
        <button onClick={() => onPurchase(pkg)} disabled={purchasing !== null}
          className="w-full h-11 rounded-[10px] bg-white text-black font-medium text-[14px] active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-70">
          {isProcessing ? (<><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>) : ctaLabel}
        </button>
      )}
    </div>
  );
};

export default Subscribe;
