import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
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

const Subscribe = () => {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [packages, setPackages] = useState<UiPackage[]>([]);
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
      } catch (err) {
        console.error("[Subscribe] offerings", err);
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
      toast({ title: "Welcome to Apollo Reborn", description: "Your subscription is active." });
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

  const platform = Capacitor.getPlatform();
  const billingHost = platform === "android" ? "Google Play" : "Apple ID";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-lg mx-auto px-5 pt-12 pb-24" style={{ paddingTop: "calc(env(safe-area-inset-top) + 3rem)" }}>
        <h1 className="font-heading text-3xl mb-2">Become a Member</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Unlimited access to coaches, training plans, and the full Fuel system.
        </p>

        {!native && (
          <div className="card-apollo p-5 mb-6 space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Smartphone className="w-5 h-5" />
              <h2 className="font-heading text-base">Open in the app to subscribe</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Memberships are processed through the Apple App Store and Google Play. Open
              Apollo Reborn on your phone to choose a plan.
            </p>
          </div>
        )}

        {native && loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {native && !loading && packages.length === 0 && (
          <div className="card-apollo p-5 mb-6">
            <p className="text-sm text-muted-foreground">
              Plans aren't available right now. Pull to refresh or try again shortly.
            </p>
          </div>
        )}

        {native && packages.length > 0 && (
          <div className="space-y-4 mb-6">
            {packages.map((pkg) => {
              const isAnnual = pkg.identifier === "annual";
              const length = isAnnual ? "1 year" : "1 month";
              return (
                <div
                  key={pkg.identifier}
                  className={`card-apollo p-5 space-y-4 ${isAnnual ? "border-primary/40" : ""}`}
                >
                  <div className="flex items-baseline justify-between">
                    <h2 className="font-heading text-xl capitalize">
                      {pkg.identifier}
                      {isAnnual && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider text-primary">
                          Best value
                        </span>
                      )}
                    </h2>
                    <p className="font-heading text-2xl">{pkg.priceString}</p>
                  </div>

                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /> Full on-demand library
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /> Personalized training & nutrition
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /> AI macro tracking & coach access
                    </li>
                  </ul>

                  {/* Apple 3.1.2 required disclosures */}
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Length of subscription: {length}. Your subscription auto-renews at{" "}
                    {pkg.priceString} per {isAnnual ? "year" : "month"} unless cancelled at
                    least 24 hours before the end of the current period. Payment is charged
                    to your {billingHost} at confirmation. Manage or cancel in your account
                    settings after purchase. By continuing you agree to our{" "}
                    <Link to="/terms" className="underline">Terms</Link> and{" "}
                    <Link to="/privacy" className="underline">Privacy Policy</Link>.
                  </p>

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
                    ) : (
                      `Subscribe ${pkg.priceString} / ${isAnnual ? "year" : "month"}`
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

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

export default Subscribe;
