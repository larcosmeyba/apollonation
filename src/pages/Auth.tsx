import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { withTimeout } from "@/lib/timeout";
import apolloLogo from "@/assets/apollo-logo-sm.png";
import heroImage from "@/assets/marcos-1.jpg";
import { Shield } from "lucide-react";

// Generic, non-leaky messages for auth errors. We deliberately do NOT echo
// the raw Supabase message so we don't disclose whether an account exists,
// rate-limit hints, etc.
const GENERIC_LOGIN_FAILURE = "Invalid email or password.";
const GENERIC_SIGNUP_FAILURE = "Couldn't create your account. Check your details and try again.";
const GENERIC_RESET_RESPONSE = "If an account exists, a reset email has been sent.";

const isInvalidEmailFormatError = (msg: string | undefined) => {
  if (!msg) return false;
  const m = msg.toLowerCase();
  return m.includes("invalid email") || m.includes("email address") && m.includes("invalid");
};

const Auth = () => {
  const [searchParams] = useSearchParams();
  const isAdminMode = searchParams.get("role") === "admin";
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "login";
  const [mode, setMode] = useState<"login" | "signup" | "forgot">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
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
        // Always show the same generic message, regardless of outcome,
        // to avoid leaking whether the email exists.
        await withTimeout(
          supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
          }),
          12_000,
          "Password reset timed out"
        );
        toast({ title: "Check your email", description: GENERIC_RESET_RESPONSE });
        setMode("login");
      } else if (mode === "login") {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: "Sign in failed",
            description: GENERIC_LOGIN_FAILURE,
            variant: "destructive",
          });
        } else {
          const { data: session } = await withTimeout(
            supabase.auth.getSession(),
            8_000,
            "Session check timed out"
          );
          const userId = session?.session?.user?.id;
          if (userId) {
            const { data: roleData } = await withTimeout<any>(
              supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", userId)
                .eq("role", "admin")
                .maybeSingle(),
              8_000,
              "Role check timed out"
            );

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
        if (!ageConfirmed) {
          toast({
            title: "Confirm age",
            description: "You must confirm you are 18 or older to create an account.",
            variant: "destructive",
          });
          return;
        }
        const { error } = await signUp(email, password, displayName);
        if (error) {
          // Show the specific message ONLY for invalid email formatting,
          // generic message for everything else.
          if (isInvalidEmailFormatError(error.message)) {
            toast({ title: "Sign up failed", description: "Please enter a valid email address.", variant: "destructive" });
          } else {
            toast({ title: "Sign up failed", description: GENERIC_SIGNUP_FAILURE, variant: "destructive" });
          }
        } else {
          // Best-effort: persist age/terms acceptance timestamp on the profile row.
          // Profile is created by the handle_new_user trigger; this update may run
          // before the user has a session (email confirmation flow) — that's OK.
          try {
            const { data: sess } = await withTimeout(
              supabase.auth.getSession(),
              8_000,
              "Session check timed out"
            );
            const uid = sess?.session?.user?.id;
            if (uid) {
              await withTimeout(
                supabase
                  .from("profiles")
                  .update({ agreed_to_terms_at: new Date().toISOString() })
                  .eq("user_id", uid),
                8_000,
                "Profile update timed out"
              );
            }
          } catch {
            // Non-fatal — the column has a sensible default of NULL.
          }
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
            <img src={apolloLogo} alt="Apollo Reborn" className="w-10 h-10 invert" loading="eager" />
            <span className="font-heading text-lg tracking-[0.15em]">
              APOLLO <span className="text-foreground/60">REBORN</span>
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
            <img src={apolloLogo} alt="Apollo Reborn" className="w-10 h-10 invert" loading="eager" />
            <span className="font-heading text-lg tracking-[0.15em]">
              APOLLO <span className="text-foreground/60">REBORN</span>
            </span>
          </div>

          {/* Admin badge */}
          {isAdminMode && (
            <div className="flex items-center gap-2 mb-6 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">Coach Panel Login</span>
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

            {mode === "signup" && !isAdminMode && (
              <div className="flex items-start gap-3 pt-1">
                <Checkbox
                  id="ageConfirm"
                  checked={ageConfirmed}
                  onCheckedChange={(v) => setAgeConfirmed(v === true)}
                  className="mt-0.5"
                />
                <Label
                  htmlFor="ageConfirm"
                  className="text-xs text-muted-foreground leading-relaxed cursor-pointer font-normal"
                >
                  I confirm that I am 18 years of age or older and I agree to the{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                    Privacy Policy
                  </a>.
                </Label>
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
              disabled={isSubmitting || (mode === "signup" && !isAdminMode && !ageConfirmed)}
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
