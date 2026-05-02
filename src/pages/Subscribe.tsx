import { useEffect, useState } from "react";
import { useNavigate, Navigate, useSearchParams, Link } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
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
import { Loader2, Check, RotateCcw, Smartphone } from "lucide-react";

interface IntroOffer {
  periodLabel: string; // e.g. "7 days"
  isFree: boolean;
}

interface UiPackage {
  identifier: "monthly" | "annual";
  priceString: string;
  periodLabel: "month" | "year";
  introOffer: IntroOffer | null;
  raw: any;
}

interface ElitePackage {
  identifier: string;
  priceString: string;
  periodLabel: "month" | "year";
  introOffer: IntroOffer | null;
  raw: any;
}

// Read intro offer from a RevenueCat package. Returns null when no intro exists
// so we never advertise a trial that isn't actually configured in the store.
function readIntroOffer(pkg: any): IntroOffer | null {
  const intro = pkg?.product?.introPrice;
  if (!intro) return null;
  // RC normalizes price to a number; 0 means "free trial". Anything > 0 is
  // a discounted intro, which we conservatively also surface as a trial-like
  // teaser only if it's free — paid intro pricing has its own disclosure rules.
  const isFree = typeof intro.price === "number" ? intro.price === 0 : !!intro.price?.amount === false;
  if (!isFree) return null;
  // periodNumberOfUnits + periodUnit (DAY/WEEK/MONTH/YEAR)
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

function periodFromIdentifier(id: string): "month" | "year" {
  return id.toLowerCase().includes("annual") || id.toLowerCase().includes("year") ? "year" : "month";
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
  const [packages, setPackages] = useState<UiPackage[]>([]);
  const [elitePackages, setElitePackages] = useState<ElitePackage[]>([]);
  const [offeringsLoaded, setOfferingsLoaded] = useState(false);
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
        if (!offering) {
          setPackages([]);
          setElitePackages([]);
          setOfferingsLoaded(true);
          return;
        }
        const ui: UiPackage[] = [];
        const monthly = offering?.availablePackages?.find(
          (p: any) => p.identifier === "$rc_monthly" || p.identifier === "monthly"
        );
        const annual = offering?.availablePackages?.find(
          (p: any) => p.identifier === "$rc_annual" || p.identifier === "annual"
        );
        if (monthly) {
          ui.push({
            identifier: "monthly",
            priceString: monthly.product?.priceString ?? "—",
            periodLabel: "month",
            introOffer: readIntroOffer(monthly),
            raw: monthly,
          });
        }
        if (annual) {
          ui.push({
            identifier: "annual",
            priceString: annual.product?.priceString ?? "—",
            periodLabel: "year",
            introOffer: readIntroOffer(annual),
            raw: annual,
          });
        }
        setPackages(ui);

        // Look for any elite packages by identifier or product id containing "elite"
        const elite: ElitePackage[] = (offering?.availablePackages ?? [])
          .filter((p: any) => {
            const id = String(p.identifier ?? "").toLowerCase();
            const productId = String(p.product?.identifier ?? "").toLowerCase();
            return id.includes("elite") || productId.includes("elite");
          })
          .map((p: any) => ({
            identifier: p.identifier,
            priceString: p.product?.priceString ?? "—",
            periodLabel: periodFromIdentifier(p.identifier),
            introOffer: readIntroOffer(p),
            raw: p,
          }));
        setElitePackages(elite);
        setOfferingsLoaded(true);
      } catch (err) {
        console.error("[Subscribe] offerings", err);
        setOfferingsLoaded(true);
        toast({
          title: "Couldn't load plans",
          description: err instanceof Error ? err.message : "Try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [native, toast]);

  if (!user) return <Navigate to="/auth" replace />;

  // Elite members are already at the top tier — show a confirmation screen.
  // Reborn (basic) members fall through to the full plans page so they can upgrade to Elite.
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
          <Button variant="apollo" className="w-full" onClick={() => navigate("/dashboard")}>
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

  const handlePurchase = async (pkg: UiPackage | ElitePackage) => {
    setPurchasing(pkg.identifier);
    try {
      await purchasePackage(pkg.raw);
      await syncEntitlement();
      await refreshProfile();
      const isElite = String(pkg.identifier).toLowerCase().includes("elite");
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
  const hasNoEntitlement = !entitlement && !profile?.is_subscribed;

  const monthlyPkg = packages.find((p) => p.identifier === "monthly");
  const annualPkg = packages.find((p) => p.identifier === "annual");
  const offeringsEmpty =
    native && offeringsLoaded && packages.length === 0 && elitePackages.length === 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className="max-w-lg mx-auto px-5 pt-12 pb-24"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 3rem)" }}
      >
        <h1 className="font-heading text-3xl mb-2">
          Start free. Unlock the full Apollo system when you're ready.
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Train with structure, nutrition, and workouts built for your day.
        </p>

        {reasonText && (
          <div className="rounded-xl bg-muted p-4 mb-6">
            <p className="text-sm font-medium">{reasonText}</p>
          </div>
        )}

        {!native && (
          <div className="card-apollo p-5 mb-6 space-y-3">
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
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {(!native || !loading) && (
          <div className="space-y-4 mb-6">
            {/* Free Starter */}
            <div className="card-apollo p-5 space-y-4">
              <div className="flex items-baseline justify-between">
                <h2 className="font-heading text-xl">Free Starter</h2>
                <p className="font-heading text-2xl">$0</p>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <Feature>10 on-demand workouts</Feature>
                <Feature>2 workout programs</Feature>
                <Feature>10 nutrition recipes</Feature>
              </ul>
              <Button variant="outline" className="w-full" disabled={hasNoEntitlement}>
                {hasNoEntitlement ? "Current plan" : "Free plan"}
              </Button>
            </div>

            {/* Apollo Reborn */}
            <div className="card-apollo p-5 space-y-4 border-primary/40">
              <div className="flex items-baseline justify-between">
                <h2 className="font-heading text-xl">Apollo Reborn™</h2>
                <span className="text-[10px] uppercase tracking-wider text-primary">
                  {entitlement === "apollo_premium" ? "Current plan" : "Most popular"}
                </span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <Feature>Unlimited workouts</Feature>
                <Feature>All programs</Feature>
                <Feature>Full recipe library</Feature>
                <Feature>Meal plan + grocery list + macro tracker</Feature>
                <Feature>AI daily workouts</Feature>
              </ul>

              {!native ? (
                <p className="text-xs text-muted-foreground">
                  Open the app on your phone to subscribe.
                </p>
              ) : offeringsEmpty ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Plans unavailable — try again later.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.location.reload()}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" /> Retry
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {monthlyPkg && (
                    <>
                      <Button
                        variant="apollo"
                        className="w-full"
                        disabled={purchasing !== null}
                        onClick={() => handlePurchase(monthlyPkg)}
                      >
                        {purchasing === monthlyPkg.identifier ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…
                          </>
                        ) : monthlyPkg.introOffer ? (
                          `Start ${monthlyPkg.introOffer.periodLabel} free — Apollo Reborn™ Monthly`
                        ) : (
                          `Unlock Apollo Reborn™ — ${monthlyPkg.priceString} / month`
                        )}
                      </Button>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {monthlyPkg.introOffer
                          ? `${monthlyPkg.introOffer.periodLabel} free, then ${monthlyPkg.priceString}/month. Auto-renews monthly until cancelled. Cancel anytime in App Store / Google Play settings.`
                          : `${monthlyPkg.priceString}/month. Auto-renews monthly until cancelled. Cancel anytime in App Store / Google Play settings.`}
                      </p>
                    </>
                  )}
                  {annualPkg && (
                    <>
                      <Button
                        variant="apollo"
                        className="w-full"
                        disabled={purchasing !== null}
                        onClick={() => handlePurchase(annualPkg)}
                      >
                        {purchasing === annualPkg.identifier ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…
                          </>
                        ) : annualPkg.introOffer ? (
                          `Start ${annualPkg.introOffer.periodLabel} free — Apollo Reborn™ Annual`
                        ) : (
                          `Unlock Apollo Reborn™ — ${annualPkg.priceString} / year`
                        )}
                      </Button>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {annualPkg.introOffer
                          ? `${annualPkg.introOffer.periodLabel} free, then ${annualPkg.priceString}/year. Auto-renews yearly until cancelled. Cancel anytime in App Store / Google Play settings.`
                          : `${annualPkg.priceString}/year. Auto-renews yearly until cancelled. Cancel anytime in App Store / Google Play settings.`}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Apollo Elite */}
            <div id="elite-tier" className="card-apollo p-5 space-y-4">
              <div className="flex items-baseline justify-between">
                <h2 className="font-heading text-xl">Apollo Elite™</h2>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <Feature>Everything in Apollo Reborn™</Feature>
                <Feature>Coach messaging (replies typically within 24h)</Feature>
                <Feature>Weekly check-ins</Feature>
                <Feature>Personalized guidance</Feature>
              </ul>
              {!native ? (
                <p className="text-xs text-muted-foreground">
                  Open the app on your phone to subscribe.
                </p>
              ) : !offeringsLoaded ? (
                <Button variant="outline" className="w-full" disabled>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Plans loading…
                </Button>
              ) : elitePackages.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Elite plan unavailable — try again later.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.location.reload()}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" /> Retry
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {elitePackages.map((pkg) => (
                    <div key={pkg.identifier} className="space-y-1">
                      <Button
                        variant="apollo"
                        className="w-full"
                        disabled={purchasing !== null}
                        onClick={() => handlePurchase(pkg)}
                      >
                        {purchasing === pkg.identifier ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…
                          </>
                        ) : pkg.introOffer ? (
                          `Start ${pkg.introOffer.periodLabel} free — Apollo Elite™`
                        ) : (
                          `Unlock Apollo Elite™ — ${pkg.priceString} / ${pkg.periodLabel}`
                        )}
                      </Button>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {pkg.introOffer
                          ? `${pkg.introOffer.periodLabel} free, then ${pkg.priceString}/${pkg.periodLabel}. Auto-renews ${pkg.periodLabel === "year" ? "yearly" : "monthly"} until cancelled. Cancel anytime in App Store / Google Play settings.`
                          : `${pkg.priceString}/${pkg.periodLabel}. Auto-renews ${pkg.periodLabel === "year" ? "yearly" : "monthly"} until cancelled. Cancel anytime in App Store / Google Play settings.`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Apple-required disclosure (general) */}
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
  <li className="flex items-start gap-2">
    <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /> {children}
  </li>
);

export default Subscribe;
