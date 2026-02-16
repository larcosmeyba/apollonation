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

  // Block frozen or archived accounts
  if (profile?.account_status === "frozen" || profile?.account_status === "archived") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-md space-y-4">
          <h1 className="font-heading text-2xl">Account {profile.account_status === "frozen" ? "Frozen" : "Inactive"}</h1>
          <p className="text-muted-foreground">
            {profile.account_status === "frozen"
              ? "Your account has been temporarily frozen. Please contact Coach Marcos for assistance."
              : "Your membership is no longer active. Please contact Coach Marcos to reactivate."}
          </p>
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
