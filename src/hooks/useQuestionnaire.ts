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
        const { data, error } = await withTimeout<any>(
          (supabase as any)
            .from("client_questionnaires")
            .select("id, cycle_start_date, cycle_number")
            .eq("user_id", userId)
            .eq("is_active", true)
            .maybeSingle(),
          8_000,
          "Questionnaire check timed out"
        );

        if (error) {
          console.error("Error checking questionnaire:", error);
        }

        if (data) {
          // Questionnaire is one-time. Users update it from their profile if needed.
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
