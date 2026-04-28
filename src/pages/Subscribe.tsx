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

interface UiPackage {
  identifier: "monthly" | "annual";
  priceString: string;
  raw: any;
}

interface ElitePackage {
  identifier: string;
  priceString: string;
  raw: any;
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
            raw: monthly,
          });
        }
        if (annual) {
          ui.push({
            identifier: "annual",
            priceString: annual.product?.priceString ?? "—",
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

  if (profile?.is_subscribed) {
    const isElite = (profile as any)?.entitlement === "apollo_elite";
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div
          className="max-w-lg mx-auto px-5 pt-12 pb-24 text-center"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 3rem)" }}
        >
          <h1 className="font-heading text-3xl mb-3">
            {isElite ? "You're an Apollo Elite™ member" : "You're an Apollo Reborn™ member"}
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            Manage your subscription in your device's App Store or Play Store settings.
          </p>
          <div className="space-y-3">
            <Button variant="apollo" className="w-full" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
            {!isElite && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  document.getElementById("elite-tier")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Upgrade to Elite
              </Button>
            )}
          </div>
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
      toast({ title: "Welcome to Apollo Reborn™", description: "Your subscription is active." });
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
                <Feature>5 workouts</Feature>
                <Feature>1 recipe</Feature>
                <Feature>Calorie tracker</Feature>
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
                  Most popular
                </span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <Feature>Unlimited workouts</Feature>
                <Feature>Full programs</Feature>
                <Feature>Full recipe library</Feature>
                <Feature>AI daily workouts</Feature>
                <Feature>Progress tracking</Feature>
              </ul>

              {!native ? (
                <p className="text-xs text-muted-foreground">
                  Open the app on your phone to subscribe.
                </p>
              ) : offeringsEmpty ? (
                <p className="text-sm text-muted-foreground">
                  Plans unavailable — try again later.
                </p>
              ) : (
                <div className="space-y-2">
                  {monthlyPkg && (
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
                      ) : (
                        `Unlock Apollo Reborn™ — ${monthlyPkg.priceString} / month`
                      )}
                    </Button>
                  )}
                  {annualPkg && (
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
                      ) : (
                        `Unlock Apollo Reborn™ — ${annualPkg.priceString} / year`
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Apollo Elite */}
            <div className="card-apollo p-5 space-y-4">
              <div className="flex items-baseline justify-between">
                <h2 className="font-heading text-xl">Apollo Elite™</h2>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <Feature>Everything in Apollo Reborn™</Feature>
                <Feature>Coach messaging</Feature>
                <Feature>Weekly check-ins</Feature>
                <Feature>Personalized guidance</Feature>
              </ul>
              {!native ? (
                <p className="text-xs text-muted-foreground">
                  Open the app on your phone to subscribe.
                </p>
              ) : offeringsEmpty || elitePackages.length === 0 ? (
                <Button variant="outline" className="w-full" disabled>
                  Coming soon
                </Button>
              ) : (
                <div className="space-y-2">
                  {elitePackages.map((pkg) => (
                    <Button
                      key={pkg.identifier}
                      variant="apollo"
                      className="w-full"
                      disabled={purchasing !== null}
                      onClick={() => handlePurchase(pkg)}
                    >
                      {purchasing === pkg.identifier ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…
                        </>
                      ) : (
                        `Unlock Apollo Elite™ — ${pkg.priceString}`
                      )}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Apple-required disclosure */}
        <p className="text-[11px] leading-relaxed text-muted-foreground mb-4">
          Subscriptions are billed through your Apple ID or Google Play account. Apollo
          Reborn™ Monthly auto-renews monthly at the displayed price. Apollo Reborn™
          Annual auto-renews yearly. Cancel anytime in App Store / Google Play settings —
          your access remains active until the end of the billing period.
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
