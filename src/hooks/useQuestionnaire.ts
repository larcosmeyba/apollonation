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
          // Check if 4-week cycle has expired
          const cycleStart = new Date(data.cycle_start_date);
          const now = new Date();
          const weeksDiff = (now.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24 * 7);

          if (weeksDiff >= 4) {
            // Cycle expired — deactivate and require new questionnaire
            await withTimeout<any>(
              (supabase as any)
                .from("client_questionnaires")
                .update({ is_active: false })
                .eq("id", data.id),
              8_000,
              "Questionnaire renewal timed out"
            );

            setHasQuestionnaire(false);
            setNeedsRenewal(true);
          } else {
            setHasQuestionnaire(true);
            setNeedsRenewal(false);
          }
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
