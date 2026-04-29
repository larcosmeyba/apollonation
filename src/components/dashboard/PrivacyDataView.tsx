import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { withTimeout } from "@/lib/timeout";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, Mail, Sparkles, FileText, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

interface Prefs {
  ai_personalization_opted_out: boolean;
  marketing_opted_out: boolean;
}

const PrivacyDataView = ({ onBack }: { onBack: () => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<Prefs>({ ai_personalization_opted_out: false, marketing_opted_out: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await withTimeout(
          supabase
            .from("user_privacy_preferences")
            .select("ai_personalization_opted_out, marketing_opted_out")
            .eq("user_id", user.id)
            .maybeSingle(),
          8_000,
          "Privacy preferences load timed out"
        );
        if (data) setPrefs(data);
      } catch (e) {
        console.error("[PrivacyDataView] load failed", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const update = async (patch: Partial<Prefs>) => {
    if (!user) return;
    setSaving(true);
    const next = { ...prefs, ...patch };
    setPrefs(next);
    const { error } = await supabase
      .from("user_privacy_preferences")
      .upsert({ user_id: user.id, ...next }, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      setPrefs(prefs);
    } else {
      toast({ title: "Saved", description: "Your privacy preference was updated." });
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <button onClick={onBack} className="text-foreground mb-4 text-sm font-bold">← Back</button>
      <h1 className="text-3xl font-bold text-foreground mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>Privacy & Data</h1>
      <p className="text-sm text-muted-foreground mb-8">Control how your information is used inside Apollo Reborn.</p>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <h3 className="text-sm font-bold text-foreground">AI personalization</h3>
                  <Switch
                    checked={!prefs.ai_personalization_opted_out}
                    onCheckedChange={(v) => update({ ai_personalization_opted_out: !v })}
                    disabled={saving}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Allow Apollo to use your questionnaire, body metrics, dietary preferences, and food restrictions to generate personalized meal plans, training plans, and AI suggestions. Turning this off means new AI-generated plans and swap suggestions will be blocked.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <h3 className="text-sm font-bold text-foreground">Marketing communications</h3>
                  <Switch
                    checked={!prefs.marketing_opted_out}
                    onCheckedChange={(v) => update({ marketing_opted_out: !v })}
                    disabled={saving}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Receive product updates, challenges, promotions, and tips by email. Transactional messages (account, billing, coach replies) are always delivered.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Where your data lives</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your data is stored in Apollo Reborn's encrypted backend (TLS in transit, AES-256 at rest). Row-level security ensures only you and authorized coaches can read your personal records. Data is retained until you request deletion.
            </p>
            <Link to="/privacy" className="inline-flex items-center gap-1.5 text-xs text-primary font-bold">
              <FileText className="w-3.5 h-3.5" /> Read our full Privacy Policy
            </Link>
          </div>

          <Link to="/account-deletion" className="flex items-center justify-between w-full py-3.5 border-b border-border">
            <span className="text-sm text-destructive flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete my account & all data</span>
          </Link>
        </div>
      )}
    </div>
  );
};

export default PrivacyDataView;
