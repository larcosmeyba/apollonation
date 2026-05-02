import { useEffect, useState } from "react";
import { useNavigate, Navigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  isPurchasesAvailable,
} from "@/lib/purchases";
import { Loader2, Check, RotateCcw, Smartphone, Sparkles } from "lucide-react";

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
  nutrition: "Meal plans, grocery lists, and macro tracking are part of Apollo Reborn™.",
  ai: "Your workout, built for today. Unlock AI training with Apollo Reborn™.",
  elite: "Apollo Elite™ includes 1:1 async coaching with Marcos.",
};

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
        console.log("[Subscribe] offering", offering);
        console.log("[Subscribe] availablePackages", offering?.availablePackages);

        const all: UiPackage[] = (offering?.availablePackages ?? []).map((p: any) => ({
          identifier: p.identifier,
          tier: isElitePackage(p) ? "elite" : "reborn",
          priceString: p.product?.priceString ?? "—",
          periodLabel: periodFromPackage(p),
          introOffer: readIntroOffer(p),
          raw: p,
        }));
        console.log("[Subscribe] mapped packages", all);
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
      <div className="min-h-screen bg-background text-foreground">
        <div
          className="max-w-lg mx-auto px-5 pt-12 pb-24 text-center"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 3rem)" }}
        >
          <h1 className="font-heading text-3xl mb-3">You're an Apollo Elite™ member</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Manage your subscription in your device's App Store or Play Store settings.
          </p>
          <Button variant="apollo" className="w-full rounded-2xl" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const syncEntitlement = async () => {
    try {
      await supabase.functions.invoke("sync-entitlement");
    } catch (err) {
      console.warn("[Subscribe] sync-entitlement", err);
    }
  };

  const handlePurchase = async (pkg: UiPackage) => {
    setPurchasing(pkg.identifier);
    try {
      await purchasePackage(pkg.raw);
      await syncEntitlement();
      await refreshProfile();
      const isElite = pkg.tier === "elite";
      toast({
        title: isElite ? "Welcome to Apollo Elite™" : "Welcome to Apollo Reborn™",
        description: "Your subscription is active.",
      });
      navigate("/dashboard");
    } catch (err: any) {
      if (err?.userCancelled || err?.code === "PURCHASE_CANCELLED" || err?.code === "USER_CANCELLED") return;
      let title = "Purchase failed";
      let description: string = err?.message ?? "Try again.";
      switch (err?.code) {
        case "NETWORK_ERROR":
          title = "Connection issue";
          description = "Please try again.";
          break;
        case "PAYMENT_PENDING":
          title = "Payment pending";
          description = "Payment is pending — check back shortly.";
          break;
        case "STORE_PROBLEM":
          title = "Store unavailable";
          description = "App Store is unavailable. Please try later.";
          break;
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

  const entitlement = (profile as any)?.entitlement as
    | "apollo_premium"
    | "apollo_elite"
    | null
    | undefined;

  const renderPurchaseButton = (pkg: UiPackage, label: string) => (
    <div key={pkg.identifier} className="space-y-2">
      <Button
        variant="apollo"
        className="w-full rounded-2xl h-14 text-[15px] shadow-[0_8px_30px_rgba(255,255,255,0.08)]"
        disabled={purchasing !== null}
        onClick={() => handlePurchase(pkg)}
      >
        {purchasing === pkg.identifier ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…
          </>
        ) : pkg.introOffer ? (
          `Start ${pkg.introOffer.periodLabel} free — ${label}`
        ) : (
          `${label} — ${pkg.priceString} / ${pkg.periodLabel}`
        )}
      </Button>
      <p className="text-[11px] text-muted-foreground leading-relaxed px-1">
        {pkg.introOffer
          ? `${pkg.introOffer.periodLabel} free, then ${pkg.priceString}/${pkg.periodLabel}. Auto-renews ${pkg.periodLabel === "year" ? "yearly" : "monthly"} until cancelled. Cancel anytime in App Store / Google Play settings.`
          : `${pkg.priceString}/${pkg.periodLabel}. Auto-renews ${pkg.periodLabel === "year" ? "yearly" : "monthly"} until cancelled. Cancel anytime in App Store / Google Play settings.`}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className="max-w-lg mx-auto px-6 pt-12 pb-24"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 3rem)" }}
      >
        {/* Hero */}
        <div className="mb-10">
          <h1 className="font-heading text-[44px] leading-[1.02] tracking-[-0.02em] mb-4">
            Train like<br />you mean it.
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            Structured training, nutrition, and recovery — engineered for who you're becoming.
          </p>
        </div>

        {reasonText && (
          <div className="rounded-2xl bg-muted/60 border border-border/50 p-4 mb-8">
            <p className="text-sm">{reasonText}</p>
          </div>
        )}

        {!native && (
          <div className="card-apollo p-6 mb-8 space-y-3 rounded-2xl">
            <div className="flex items-center gap-2 text-primary">
              <Smartphone className="w-5 h-5" />
              <h2 className="font-heading text-base">Open in the app to subscribe</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Memberships are processed through the Apple App Store and Google Play. Open
              Apollo Reborn™ on your phone to choose a plan.
            </p>
          </div>
        )}

        {native && loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {(!native || !loading) && (
          <div className="space-y-6 mb-10">
            {/* Apollo Reborn — featured */}
            <div className="relative rounded-3xl bg-card border border-primary/30 p-7 space-y-6 shadow-[0_20px_60px_-20px_rgba(255,255,255,0.12)]">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary rounded-full">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-foreground">
                  {entitlement === "apollo_premium" ? "Current Plan" : "Most Popular"}
                </span>
              </div>

              <div className="pt-2">
                <h2 className="font-heading text-2xl tracking-tight mb-1">Apollo Reborn™</h2>
                <p className="text-xs text-muted-foreground uppercase tracking-[0.15em]">
                  Full Access
                </p>
              </div>

              <ul className="text-[13px] text-foreground/80 space-y-2.5">
                <Feature>Unlimited workouts</Feature>
                <Feature>All training programs</Feature>
                <Feature>Full recipe library</Feature>
                <Feature>Meal plan, grocery list & macro tracker</Feature>
                <Feature>AI daily workouts</Feature>
              </ul>

              {!native ? (
                <p className="text-xs text-muted-foreground">
                  Open the app on your phone to subscribe.
                </p>
              ) : rebornPackages.length === 0 ? (
                <Button variant="outline" className="w-full rounded-2xl" disabled>
                  Plans loading…
                </Button>
              ) : (
                <div className="space-y-3">
                  {rebornPackages
                    .slice()
                    .sort((a) => (a.periodLabel === "month" ? -1 : 1))
                    .map((pkg) =>
                      renderPurchaseButton(
                        pkg,
                        `Unlock Apollo Reborn™`
                      )
                    )}
                </div>
              )}
            </div>

            {/* Apollo Elite — exclusive — only render when packages exist */}
            {elitePackages.length > 0 && (
              <div
                id="elite-tier"
                className="relative rounded-3xl p-7 space-y-6 border border-white/10 bg-gradient-to-b from-[hsl(0_0%_6%)] to-[hsl(0_0%_3%)]"
              >
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
                  {elitePackages
                    .slice()
                    .sort((a) => (a.periodLabel === "month" ? -1 : 1))
                    .map((pkg) => renderPurchaseButton(pkg, `Join Apollo Elite™`))}
                </div>
              </div>
            )}

            {/* Free starter — subtle text link */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
              >
                Continue with Free Starter →
              </button>
            </div>
          </div>
        )}

        {/* Apple-required disclosure */}
        <p className="text-[11px] leading-relaxed text-muted-foreground mb-4">
          Subscriptions are billed through your Apple ID or Google Play account and
          auto-renew at the displayed price unless cancelled at least 24 hours before
          the end of the current period. Manage or cancel anytime in your device's App
          Store or Google Play settings — access remains active until the end of the
          billing period. Free-trial periods, when offered, convert automatically to a
          paid subscription at the displayed price unless cancelled before the trial
          ends.
        </p>
        <p className="text-[11px] text-muted-foreground mb-6">
          <Link to="/terms" className="underline">Terms of Use</Link>
          {" · "}
          <Link to="/privacy" className="underline">Privacy Policy</Link>
        </p>

        <Button
          variant="ghost"
          className="w-full"
          disabled={restoring}
          onClick={handleRestore}
        >
          {restoring ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Restoring…
            </>
          ) : (
            <>
              <RotateCcw className="w-4 h-4 mr-2" /> Restore Purchases
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

const Feature = ({ children }: { children: React.ReactNode }) => (
  <li className="flex items-start gap-2.5">
    <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" strokeWidth={2} />
    <span>{children}</span>
  </li>
);

export default Subscribe;
