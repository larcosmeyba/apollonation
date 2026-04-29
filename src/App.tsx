import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { isWeb } from "@/lib/platform";
import { HelmetProvider } from "react-helmet-async";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import ApplyCoach from "./pages/ApplyCoach";
import AppEntryRedirect from "@/components/AppEntryRedirect";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Questionnaire from "./pages/Questionnaire";
import Dashboard from "./pages/Dashboard";
import DashboardWorkouts from "./pages/DashboardWorkouts";
import DashboardRecipes from "./pages/DashboardRecipes";
import DashboardMacros from "./pages/DashboardMacros";
import DashboardProfile from "./pages/DashboardProfile";
import DashboardCoachProfile from "./pages/DashboardCoachProfile";
import DashboardNutrition from "./pages/DashboardNutrition";
import DashboardTraining from "./pages/DashboardTraining";
import DashboardWorkoutDetail from "./pages/DashboardWorkoutDetail";
import DashboardCalendar from "./pages/DashboardCalendar";
import AdminDashboard from "./pages/admin/AdminDashboard";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import ApolloSystem from "./pages/ApolloSystem";
import About from "./pages/About";
import FAQ from "./pages/FAQ";
import ContactPortal from "./pages/ContactPortal";
import AccountDeletion from "./pages/AccountDeletion";
import PlanReady from "./pages/PlanReady";
import DashboardTransformation from "./pages/DashboardTransformation";
import DashboardRecovery from "./pages/DashboardRecovery";
import DashboardChallenges from "./pages/DashboardChallenges";
import DashboardAIWorkout from "./pages/DashboardAIWorkout";
import DashboardMessages from "./pages/DashboardMessages";
import Subscribe from "./pages/Subscribe";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import HealthDisclaimerSheet from "@/components/dashboard/HealthDisclaimerSheet";

// Wrap a route element in an ErrorBoundary so a thrown error in any
// dashboard page shows a friendly fallback instead of a white screen.
const eb = (node: React.ReactNode) => <ErrorBoundary>{node}</ErrorBoundary>;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
      networkMode: "always",
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
    },
  },
});

const NativeDeepLinks = () => {
  const navigate = useNavigate();
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const appUrlSub = CapacitorApp.addListener("appUrlOpen", ({ url }) => {
      try {
        const parsed = new URL(url);
        const path = parsed.pathname + parsed.search + parsed.hash;
        if (path) navigate(path);
      } catch (e) {
        console.warn("Bad deep link", url, e);
      }
    });

    let pushActionSub: Promise<{ remove: () => Promise<void> }> | null = null;
    (async () => {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        pushActionSub = PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (event: any) => {
            const url = event?.notification?.data?.url;
            if (url) navigate(url);
          }
        );
      } catch (e) {
        console.warn("[Push] action listener failed", e);
      }
    })();

    return () => {
      appUrlSub.then((s) => s.remove()).catch(() => {});
      if (pushActionSub) pushActionSub.then((s) => s.remove()).catch(() => {});
    };
  }, [navigate]);
  return null;
};

const App = () => {
  return (
    <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <NativeDeepLinks />
            <HealthDisclaimerSheet />
            <Routes>
              <Route path="/" element={<AppEntryRedirect />} />
              <Route path="/home" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/questionnaire" element={<Questionnaire />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/system" element={<ApolloSystem />} />
              <Route path="/about" element={<About />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/contact" element={<ContactPortal />} />
              <Route path="/apply-coach" element={<ApplyCoach />} />
              <Route path="/account-deletion" element={<AccountDeletion />} />
              <Route path="/subscribe" element={eb(<Subscribe />)} />
              <Route path="/plan-ready" element={<ProtectedRoute requirePremium={false}><PlanReady /></ProtectedRoute>} />
              <Route path="/dashboard/profile" element={<ProtectedRoute requirePremium={false}>{eb(<DashboardProfile />)}</ProtectedRoute>} />
              <Route
                path="/dashboard/transformation"
                element={<ProtectedRoute>{eb(<DashboardTransformation />)}</ProtectedRoute>}
              />
              <Route
                path="/dashboard/recovery"
                element={<ProtectedRoute>{eb(<DashboardRecovery />)}</ProtectedRoute>}
              />
              <Route
                path="/dashboard/challenges"
                element={<ProtectedRoute>{eb(<DashboardChallenges />)}</ProtectedRoute>}
              />
              <Route
                path="/dashboard"
                element={<ProtectedRoute>{eb(<Dashboard />)}</ProtectedRoute>}
              />
              <Route
                path="/dashboard/workouts"
                element={<ProtectedRoute>{eb(<DashboardWorkouts />)}</ProtectedRoute>}
              />
              <Route
                path="/dashboard/recipes"
                element={<ProtectedRoute>{eb(<DashboardRecipes />)}</ProtectedRoute>}
              />
              <Route
                path="/dashboard/macros"
                element={<ProtectedRoute>{eb(<DashboardMacros />)}</ProtectedRoute>}
              />
              {/* /dashboard/profile defined above without premium gate so users can manage account / restore */}
              <Route
                path="/dashboard/nutrition"
                element={<ProtectedRoute>{eb(<DashboardNutrition />)}</ProtectedRoute>}
              />
              <Route
                path="/dashboard/training"
                element={<ProtectedRoute>{eb(<DashboardTraining />)}</ProtectedRoute>}
              />
              <Route
                path="/dashboard/training/workout"
                element={<ProtectedRoute>{eb(<DashboardWorkoutDetail />)}</ProtectedRoute>}
              />
              <Route
                path="/dashboard/calendar"
                element={<ProtectedRoute>{eb(<DashboardCalendar />)}</ProtectedRoute>}
              />
              {/* AI Workout Builder temporarily disabled — being fixed in a later build */}
              <Route path="/dashboard/ai-workout" element={<Navigate to="/dashboard" replace />} />
              <Route
                path="/dashboard/messages"
                element={<ProtectedRoute>{eb(<DashboardMessages />)}</ProtectedRoute>}
              />
              <Route
                path="/dashboard/coach/:coachId"
                element={<ProtectedRoute>{eb(<DashboardCoachProfile />)}</ProtectedRoute>}
              />
              {isWeb() ? (
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <AdminDashboard />
                    </AdminRoute>
                  }
                />
              ) : (
                <Route path="/admin/*" element={<Navigate to="/dashboard" replace />} />
              )}
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;
