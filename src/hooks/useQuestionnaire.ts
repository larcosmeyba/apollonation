import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { withTimeout } from "@/lib/timeout";

export const useQuestionnaire = (userId: string | undefined) => {
  const [hasQuestionnaire, setHasQuestionnaire] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsRenewal, setNeedsRenewal] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const check = async () => {
      setLoading(true);
      try {
        // Questionnaire is one-time per user. ANY row (active or not) means they've completed it.
        // This prevents users from being prompted repeatedly if `is_active` ever gets toggled off.
        const { data, error } = await withTimeout<any>(
          (supabase as any)
            .from("client_questionnaires")
            .select("id")
            .eq("user_id", userId)
            .limit(1),
          8_000,
          "Questionnaire check timed out"
        );

        if (error) {
          console.error("Error checking questionnaire:", error);
          // On error, fail OPEN — don't trap the user on /questionnaire forever
          // because of a transient network / RLS hiccup.
          setHasQuestionnaire(true);
          setNeedsRenewal(false);
          return;
        }

        if (data && data.length > 0) {
          setHasQuestionnaire(true);
          setNeedsRenewal(false);
        } else {
          setHasQuestionnaire(false);
        }
      } catch (error) {
        console.error("Error checking questionnaire:", error);
        setHasQuestionnaire(false);
      } finally {
        setLoading(false);
      }
    };

    check();
  }, [userId]);

  return { hasQuestionnaire, loading, needsRenewal };
};
