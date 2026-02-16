import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { useQuestionnaire } from "@/hooks/useQuestionnaire";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredTier?: "basic" | "pro" | "elite";
}

const ProtectedRoute = ({ children, requiredTier }: ProtectedRouteProps) => {
  const { user, profile, loading, subscription, subscriptionLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminStatus();
  const { hasQuestionnaire, loading: questionnaireLoading } = useQuestionnaire(user?.id);
  const location = useLocation();

  if (loading || subscriptionLoading || adminLoading || questionnaireLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Block frozen, cancelled, or archived accounts
  if (profile?.account_status === "frozen" || profile?.account_status === "cancelled" || profile?.account_status === "archived") {
    const messages: Record<string, { title: string; desc: string }> = {
      frozen: { title: "Account Frozen", desc: "Your account has been temporarily frozen. Please contact Coach Marcos for assistance." },
      cancelled: { title: "Membership Cancelled", desc: "Your membership has been cancelled. Please contact Coach Marcos to resubscribe." },
      archived: { title: "Account Inactive", desc: "Your membership is no longer active. Please contact Coach Marcos to reactivate." },
    };
    const msg = messages[profile.account_status] || messages.archived;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-md space-y-4">
          <h1 className="font-heading text-2xl">{msg.title}</h1>
          <p className="text-muted-foreground">{msg.desc}</p>
        </div>
      </div>
    );
  }

  // Admins bypass subscription and tier checks
  if (isAdmin) {
    return <>{children}</>;
  }

  // Require active subscription to access dashboard
  if (!subscription?.subscribed) {
    return <Navigate to="/subscribe" replace />;
  }

  // Pro/Elite users must complete questionnaire before accessing dashboard
  const tier = profile?.subscription_tier;
  if ((tier === "pro" || tier === "elite") && !hasQuestionnaire) {
    return <Navigate to="/questionnaire" replace />;
  }

  // Check tier access if required
  if (requiredTier && profile) {
    const tierHierarchy = { basic: 1, pro: 2, elite: 3 };
    const userTierLevel = tierHierarchy[profile.subscription_tier];
    const requiredTierLevel = tierHierarchy[requiredTier];

    if (userTierLevel < requiredTierLevel) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
