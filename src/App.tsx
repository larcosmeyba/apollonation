import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import ApplyCoach from "./pages/ApplyCoach";
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
import ContactPortal from "./pages/ContactPortal";
import AccountDeletion from "./pages/AccountDeletion";
import PlanReady from "./pages/PlanReady";
import DashboardTransformation from "./pages/DashboardTransformation";
import DashboardRecovery from "./pages/DashboardRecovery";
import DashboardChallenges from "./pages/DashboardChallenges";
import Subscribe from "./pages/Subscribe";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import ErrorBoundary from "@/components/ErrorBoundary";

// Wrap a route element in an ErrorBoundary so a thrown error in any
// dashboard page shows a friendly fallback instead of a white screen.
const eb = (node: React.ReactNode) => <ErrorBoundary>{node}</ErrorBoundary>;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
      staleTime: 1000 * 60 * 5,
    },
  },
});

const App = () => {
  return (
    <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<AppEntryRedirect />} />
              <Route path="/home" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/questionnaire" element={<Questionnaire />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/system" element={<ApolloSystem />} />
              <Route path="/about" element={<About />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/contact" element={<ContactPortal />} />
              <Route path="/apply-coach" element={<ApplyCoach />} />
              <Route path="/account-deletion" element={<AccountDeletion />} />
              <Route path="/subscribe" element={<Subscribe />} />
              <Route path="/plan-ready" element={<ProtectedRoute><PlanReady /></ProtectedRoute>} />
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
              <Route
                path="/dashboard/profile"
                element={<ProtectedRoute>{eb(<DashboardProfile />)}</ProtectedRoute>}
              />
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
              <Route
                path="/dashboard/coach/:coachId"
                element={<ProtectedRoute>{eb(<DashboardCoachProfile />)}</ProtectedRoute>}
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
