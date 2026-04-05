import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import apolloLogo from "@/assets/apollo-logo-sm.png";
import heroImage from "@/assets/marcos-1.jpg";
import { Shield } from "lucide-react";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const isAdminMode = searchParams.get("role") === "admin";
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, loading, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-foreground">Loading...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) {
          toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
          toast({ title: "Check your email", description: "We've sent you a password reset link." });
          setMode("login");
        }
      } else if (mode === "login") {
        const { error } = await signIn(email, password);
        if (error) {
          toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
        } else {
          const { data: session } = await supabase.auth.getSession();
          const userId = session?.session?.user?.id;
          if (userId) {
            const { data: roleData } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", userId)
              .eq("role", "admin")
              .maybeSingle();

            if (isAdminMode) {
              if (roleData) {
                navigate("/admin");
              } else {
                toast({ title: "Access denied", description: "This account does not have admin privileges.", variant: "destructive" });
                await supabase.auth.signOut();
              }
              return;
            }

            if (roleData) {
              navigate("/admin");
              return;
            }
          }
          navigate("/dashboard");
        }
      } else {
        if (isAdminMode) {
          toast({ title: "Not allowed", description: "Admin accounts cannot be created from the login page.", variant: "destructive" });
          return;
        }
        const { error } = await signUp(email, password, displayName);
        if (error) {
          toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
        } else {
          toast({ title: "Check your email", description: "We've sent you a confirmation link to verify your account." });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side — photo */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <img
          src={heroImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-[50%_20%]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/40 to-background/80" />
        <div className="absolute bottom-12 left-12 right-12 z-10">
          <div className="flex items-center gap-3 mb-6">
            <img src={apolloLogo} alt="Apollo Nation" className="w-10 h-10 invert" />
            <span className="font-heading text-lg tracking-[0.15em]">
              APOLLO <span className="text-foreground/60">NATION</span>
            </span>
          </div>
          <p className="text-muted-foreground text-sm font-light leading-relaxed max-w-sm">
            {isAdminMode
              ? "Coach Panel — Manage your clients, programs, and content."
              : "On-demand workouts, structured programs, and practical nutrition tools."}
          </p>
        </div>
      </div>

      {/* Right side — form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <img src={apolloLogo} alt="Apollo Nation" className="w-10 h-10 invert" />
            <span className="font-heading text-lg tracking-[0.15em]">
              APOLLO <span className="text-foreground/60">NATION</span>
            </span>
          </div>

          {/* Admin badge */}
          {isAdminMode && (
            <div className="flex items-center gap-2 mb-6 px-3 py-2 rounded-lg bg-apollo-gold/10 border border-apollo-gold/20">
              <Shield className="w-4 h-4 text-apollo-gold" />
              <span className="text-sm text-apollo-gold font-medium">Coach Panel Login</span>
            </div>
          )}

          <h2 className="font-heading text-3xl mb-2">
            {mode === "login"
              ? isAdminMode ? "Coach Sign In" : "Sign In"
              : mode === "signup"
              ? "Create Account"
              : "Reset Password"}
          </h2>
          <p className="text-muted-foreground text-sm mb-10">
            {mode === "login"
              ? isAdminMode ? "Access the coach dashboard" : "Welcome back"
              : mode === "signup"
              ? "Start your transformation today"
              : "Enter your email to receive a reset link"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "signup" && !isAdminMode && (
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-xs uppercase tracking-wider text-muted-foreground">Display Name</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-muted border-border h-12 text-foreground"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                  className="bg-muted border-border h-12 text-foreground"
              />
            </div>

            {mode !== "forgot" && (
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-muted border-border h-12 text-foreground"
                />
              </div>
            )}

            {mode === "login" && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Forgot your password?
                </button>
              </div>
            )}

            <Button
              type="submit"
              variant="apollo"
              size="lg"
              className="w-full h-12"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Please wait..."
                : mode === "login"
                ? "Sign In"
                : mode === "signup"
                ? "Create Account"
                : "Send Reset Link"}
            </Button>
          </form>

          <div className="mt-8 text-center space-y-3">
            {mode === "forgot" ? (
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                Back to sign in
              </button>
            ) : !isAdminMode ? (
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                {mode === "login"
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"}
              </button>
            ) : null}

            {/* Toggle between admin/client login */}
            <div>
              <button
                type="button"
                onClick={() => {
                  const newUrl = isAdminMode ? "/auth" : "/auth?role=admin";
                  navigate(newUrl, { replace: true });
                }}
                className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                {isAdminMode ? "← Client login" : "Coach login →"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
