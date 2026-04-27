import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import apolloLogo from "@/assets/apollo-logo-sm.png";

/**
 * Handles the password recovery flow. Supabase appends recovery tokens to
 * the URL fragment (#access_token=...&type=recovery) when the user clicks
 * the email link. The supabase-js auth listener picks this up automatically
 * and emits a PASSWORD_RECOVERY event — we simply listen for it and let
 * the user set a new password.
 */
const ResetPassword = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // If the URL has the recovery hash, supabase-js will fire PASSWORD_RECOVERY
    // and a session will be available. Mark the form ready once we have it.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && window.location.hash.includes("type=recovery"))) {
        setReady(true);
      }
    });

    // Also check existing session in case the event already fired before mount
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && window.location.hash.includes("type=recovery")) {
        setReady(true);
      } else if (data.session) {
        // No recovery hash but logged in — allow reset anyway
        setReady(true);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Use at least 6 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      toast({ title: "Couldn't update password", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Password updated", description: "Signing you in…" });
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-10">
          <img src={apolloLogo} alt="Apollo Reborn" className="w-10 h-10 invert" loading="eager" />
          <span className="font-heading text-lg tracking-[0.15em]">
            APOLLO <span className="text-foreground/60">REBORN</span>
          </span>
        </div>

        <h2 className="font-heading text-3xl mb-2">Set new password</h2>
        <p className="text-muted-foreground text-sm mb-10">
          {ready
            ? "Enter and confirm a new password for your account."
            : "Verifying reset link…"}
        </p>

        {ready && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground">
                New Password
              </Label>
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
            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-xs uppercase tracking-wider text-muted-foreground">
                Confirm Password
              </Label>
              <Input
                id="confirm"
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
                className="bg-muted border-border h-12 text-foreground"
              />
            </div>
            <Button type="submit" variant="apollo" size="lg" className="w-full h-12" disabled={submitting}>
              {submitting ? "Updating…" : "Update Password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
