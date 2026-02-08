import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import apolloLogo from "@/assets/apollo-logo.png";

const Auth = () => {
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
        <div className="animate-pulse text-apollo-gold">Loading...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/subscribe" replace />;
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
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Check your email",
            description: "We've sent you a password reset link.",
          });
          setMode("login");
        }
      } else if (mode === "login") {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: "Sign in failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          navigate("/dashboard");
        }
      } else {
        const { error } = await signUp(email, password, displayName);
        if (error) {
          toast({
            title: "Sign up failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Check your email",
            description: "We've sent you a confirmation link to verify your account.",
          });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-apollo-charcoal-light to-background relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-apollo-gold/10 to-transparent" />
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
          <img src={apolloLogo} alt="Apollo Nation" className="w-32 h-32 invert mb-8" />
          <h1 className="font-heading text-4xl text-center mb-4">
            WELCOME TO
            <span className="text-gradient-gold block">APOLLO NATION</span>
          </h1>
          <p className="text-muted-foreground text-center max-w-md">
            Train with Coach Marcos Leyba. Access 100+ HD workouts, nutrition recipes, and personalized coaching to transform your body.
          </p>
        </div>
      </div>

      {/* Right side - form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <img src={apolloLogo} alt="Apollo Nation" className="w-12 h-12 invert" />
            <span className="font-heading text-xl tracking-wider">
              APOLLO <span className="text-apollo-gold">NATION</span>
            </span>
          </div>

          <div className="card-apollo p-8">
            <h2 className="font-heading text-2xl mb-2 text-center">
              {mode === "login"
                ? "SIGN IN"
                : mode === "signup"
                ? "CREATE ACCOUNT"
                : "RESET PASSWORD"}
            </h2>
            <p className="text-muted-foreground text-center mb-8">
              {mode === "login"
                ? "Welcome back, warrior"
                : mode === "signup"
                ? "Begin your transformation today"
                : "Enter your email to receive a reset link"}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Your name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-muted border-border"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-muted border-border"
                />
              </div>

              {mode !== "forgot" && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="bg-muted border-border"
                  />
                </div>
              )}

              {mode === "login" && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-xs text-muted-foreground hover:text-apollo-gold transition-colors"
                  >
                    Forgot your password?
                  </button>
                </div>
              )}

              <Button
                type="submit"
                variant="apollo"
                size="lg"
                className="w-full"
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

            <div className="mt-6 text-center space-y-2">
              {mode === "forgot" ? (
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-muted-foreground hover:text-apollo-gold transition-colors text-sm"
                >
                  Back to sign in
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setMode(mode === "login" ? "signup" : "login")}
                  className="text-muted-foreground hover:text-apollo-gold transition-colors text-sm"
                >
                  {mode === "login"
                    ? "Don't have an account? Sign up"
                    : "Already have an account? Sign in"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
