import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { withTimeout } from "@/lib/timeout";

let cachedKey: string | null = null;
let inflight: Promise<string> | null = null;

/**
 * Fetches the public Mux Data environment key once per session.
 * Mux Data env keys are safe to ship to clients — they only identify
 * the destination of analytics beacons.
 */
export function useMuxEnvKey(): string | null {
  const [key, setKey] = useState<string | null>(cachedKey);

  useEffect(() => {
    if (cachedKey) {
      setKey(cachedKey);
      return;
    }
    if (!inflight) {
      inflight = withTimeout(
        supabase.functions.invoke("get-mux-config"),
        2000,
        "Mux env key fetch timed out"
      )
        .then(({ data }) => {
          const k = (data as { env_key?: string } | null)?.env_key ?? "";
          cachedKey = k;
          return k;
        })
        .catch(() => {
          cachedKey = "";
          return "";
        });
    }
    inflight.then((k) => setKey(k));
  }, []);

  return key;
}
