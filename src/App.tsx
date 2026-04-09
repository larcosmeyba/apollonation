import { useState, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import SplashScreen from "@/components/SplashScreen";
import Index from "./pages/Index";
import AppEntryRedirect from "@/components/AppEntryRedirect";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
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
import ApplyCoach from "./pages/ApplyCoach";
import PlanReady from "./pages/PlanReady";
import DashboardTransformation from "./pages/DashboardTransformation";
import DashboardRecovery from "./pages/DashboardRecovery";
import DashboardChallenges from "./pages/DashboardChallenges";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

const App = () => {
  const [splashDone, setSplashDone] = useState(false);
  const handleSplashFinish = useCallback(() => setSplashDone(true), []);

  return (
    <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {!splashDone && <SplashScreen onFinish={handleSplashFinish} />}
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/questionnaire" element={<Questionnaire />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/system" element={<ApolloSystem />} />
              <Route path="/about" element={<About />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/apply-coach" element={<ApplyCoach />} />
              <Route path="/plan-ready" element={<ProtectedRoute><PlanReady /></ProtectedRoute>} />
              <Route
                path="/dashboard/transformation"
                element={<ProtectedRoute><DashboardTransformation /></ProtectedRoute>}
              />
              <Route
                path="/dashboard/recovery"
                element={<ProtectedRoute><DashboardRecovery /></ProtectedRoute>}
              />
              <Route
                path="/dashboard/challenges"
                element={<ProtectedRoute><DashboardChallenges /></ProtectedRoute>}
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/workouts"
                element={
                  <ProtectedRoute>
                    <DashboardWorkouts />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/recipes"
                element={
                  <ProtectedRoute>
                    <DashboardRecipes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/macros"
                element={
                  <ProtectedRoute>
                    <DashboardMacros />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/profile"
                element={
                  <ProtectedRoute>
                    <DashboardProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/nutrition"
                element={
                  <ProtectedRoute>
                    <DashboardNutrition />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/training"
                element={
                  <ProtectedRoute>
                    <DashboardTraining />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/training/workout"
                element={
                  <ProtectedRoute>
                    <DashboardWorkoutDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/calendar"
                element={
                  <ProtectedRoute>
                    <DashboardCalendar />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/coach/:coachId"
                element={
                  <ProtectedRoute>
                    <DashboardCoachProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
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
