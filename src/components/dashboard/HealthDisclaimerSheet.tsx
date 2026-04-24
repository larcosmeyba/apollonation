import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * One-time fitness/health disclaimer sheet shown to every user after login.
 * Persisted in profiles.health_disclaimer_acknowledged_at so we never show it
 * again on subsequent sessions.
 */
const HealthDisclaimerSheet = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !profile) return;
    // Profile loaded; show only if never acknowledged.
    const ack = (profile as any).health_disclaimer_acknowledged_at;
    if (!ack) setOpen(true);
  }, [user, profile]);

  const handleAck = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase
        .from("profiles")
        .update({ health_disclaimer_acknowledged_at: new Date().toISOString() })
        .eq("user_id", user.id);
      await refreshProfile();
    } catch (e) {
      console.error("HealthDisclaimerSheet:", e);
    } finally {
      setSaving(false);
      setOpen(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        // Don't allow dismissing without acknowledgment
        if (v === false && !saving) return;
        setOpen(v);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Before you start</AlertDialogTitle>
          <AlertDialogDescription className="leading-relaxed">
            Apollo Reborn provides fitness and nutrition guidance for educational
            purposes. It is not medical advice. Consult a healthcare professional
            before starting any exercise or nutrition program.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleAck} disabled={saving}>
            {saving ? "Saving…" : "I understand"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default HealthDisclaimerSheet;
