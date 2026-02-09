import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useQuestionnaire = (userId: string | undefined) => {
  const [hasQuestionnaire, setHasQuestionnaire] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const check = async () => {
      const { data, error } = await (supabase as any)
        .from("client_questionnaires")
        .select("id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("Error checking questionnaire:", error);
      }
      setHasQuestionnaire(!!data);
      setLoading(false);
    };

    check();
  }, [userId]);

  return { hasQuestionnaire, loading };
};
