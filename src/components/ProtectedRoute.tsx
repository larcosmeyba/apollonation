import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { useQuestionnaire } from "@/hooks/useQuestionnaire";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Deprecated — kept for backward compatibility. Premium gating is now per-feature, not per-route. */
  requirePremium?: boolean;
  /** If true, route is restricted to apollo_elite users; others are sent to /subscribe?reason=elite. */
  requireElite?: boolean;
}

const ProtectedRoute = ({ children, requireElite = false }: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminStatus();
  const { hasQuestionnaire, loading: questionnaireLoading } = useQuestionnaire(user?.id);
  const location = useLocation();

  if (loading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Block frozen accounts
  if (profile?.account_status === "frozen") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-md space-y-4">
          <h1 className="font-heading text-2xl">Account Frozen</h1>
          <p className="text-muted-foreground">Your account has been temporarily frozen. Please contact Coach Marcos for assistance.</p>
        </div>
      </div>
    );
  }

  // Wait for questionnaire loading
  if (questionnaireLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  // Admins bypass questionnaire + subscription checks
  if (isAdmin) {
    return <>{children}</>;
  }

  // All users must complete questionnaire before accessing dashboard
  if (!hasQuestionnaire) {
    return <Navigate to="/questionnaire" replace />;
  }

  // Elite-only gate — restricted features (e.g. coach messaging).
  if (requireElite && (profile as any)?.entitlement !== "apollo_elite") {
    return <Navigate to="/subscribe?reason=elite" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
