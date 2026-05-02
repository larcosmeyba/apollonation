import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"loading" | "valid" | "invalid" | "already" | "success" | "submitting" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    (async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`, {
          headers: { apikey: SUPABASE_ANON },
        });
        const data = await res.json();
        if (data?.valid) setState("valid");
        else if (data?.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      } catch {
        setState("invalid");
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState("submitting");
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data?.success || data?.reason === "already_unsubscribed") setState("success");
      else { setState("error"); setErrorMsg(data?.error || "Failed to unsubscribe"); }
    } catch (e: any) {
      setState("error"); setErrorMsg(e?.message || "Network error");
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Email Preferences</h1>
        {state === "loading" && <p className="text-muted-foreground">Validating your request…</p>}
        {state === "valid" && (
          <>
            <p className="text-muted-foreground">Click below to unsubscribe from Apollo Reborn emails.</p>
            <Button onClick={confirm} size="lg">Confirm Unsubscribe</Button>
          </>
        )}
        {state === "submitting" && <p className="text-muted-foreground">Processing…</p>}
        {state === "already" && <p className="text-muted-foreground">You're already unsubscribed.</p>}
        {state === "success" && <p className="text-foreground">You've been unsubscribed. We're sorry to see you go.</p>}
        {state === "invalid" && <p className="text-destructive">Invalid or expired link.</p>}
        {state === "error" && <p className="text-destructive">{errorMsg}</p>}
      </div>
    </main>
  );
}
