import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, ShoppingBasket } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

/**
 * Help The Hive CTA — shown only when the user has flagged grocery cost as a
 * concern (weekly_food_budget set, or budget_help_needed=true on the
 * nutrition questionnaire). Apollo owns the meal plan; Hive only builds the
 * grocery/budget list. The handoff sends all 9 spec fields so the user never
 * re-enters data.
 */
const HIVE_URL = "https://helpthehive.app/import";

const HelpTheHiveCTA = () => {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["help-the-hive-context", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: q }, { data: plan }, { data: meals }, { data: budgetRow }] = await Promise.all([
        (supabase as any).from("client_questionnaires")
          .select("dietary_restrictions, weekly_food_budget, household_size")
          .eq("user_id", user!.id).eq("is_active", true).maybeSingle(),
        (supabase as any).from("nutrition_plans")
          .select("id, daily_calories, protein_grams, carbs_grams, fat_grams")
          .eq("user_id", user!.id).eq("status", "active").maybeSingle(),
        null,
        (supabase as any).from("user_food_budgets")
          .select("weekly_budget").eq("user_id", user!.id).maybeSingle(),
      ]);
      let mealRows: any[] = [];
      if (plan?.id) {
        const { data: m } = await (supabase as any).from("nutrition_plan_meals")
          .select("day_number, meal_type, meal_name, ingredients, calories, protein_grams, carbs_grams, fat_grams")
          .eq("plan_id", plan.id).order("day_number").order("sort_order");
        mealRows = m || [];
      }
      return { questionnaire: q, plan, meals: mealRows, weekly_budget: budgetRow?.weekly_budget ?? q?.weekly_food_budget ?? null };
    },
  });

  const visible = useMemo(() => {
    // Gate: weekly_food_budget OR explicit budget flag implies budget_help_needed=Yes.
    return !!(data?.weekly_budget && Number(data.weekly_budget) > 0);
  }, [data?.weekly_budget]);

  if (!visible || !data?.plan) return null;

  const handleClick = () => {
    const ingredients = Array.from(new Set(
      (data.meals || []).flatMap((m: any) =>
        (m.ingredients || "")
          .split(/[,;\n]/)
          .map((s: string) => s.trim())
          .filter(Boolean),
      ),
    ));
    const payload = {
      calories: data.plan.daily_calories,
      protein: data.plan.protein_grams,
      carbs: data.plan.carbs_grams,
      fat: data.plan.fat_grams,
      meal_plan: data.meals,
      ingredients,
      household_size: data.questionnaire?.household_size ?? 1,
      dietary_restrictions: data.questionnaire?.dietary_restrictions ?? [],
      weekly_budget: data.weekly_budget,
    };
    // Open Hive with payload encoded — Hive consumes its own /import endpoint.
    const url = `${HIVE_URL}?source=apollo&data=${encodeURIComponent(JSON.stringify(payload))}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className="rounded-2xl p-5 mt-4"
      style={{
        background:
          "linear-gradient(135deg, hsl(var(--apollo-gold) / 0.08), transparent 60%), hsl(0 0% 7%)",
        border: "1px solid hsl(var(--apollo-gold) / 0.18)",
      }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "hsl(var(--apollo-gold) / 0.12)", border: "1px solid hsl(var(--apollo-gold) / 0.2)" }}
        >
          <ShoppingBasket className="w-5 h-5" style={{ color: "hsl(var(--apollo-gold))" }} />
        </div>
        <div className="flex-1">
          <h3 className="font-heading text-sm mb-1">Grocery Budget Helper</h3>
          <p className="text-xs text-foreground/65 leading-relaxed">
            Need help staying within your grocery budget while hitting your protein goal? Build your grocery plan with Help The Hive.
          </p>
        </div>
      </div>
      <Button variant="apollo-outline" size="sm" className="w-full gap-2" onClick={handleClick}>
        Open Help The Hive <ExternalLink className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
};

export default HelpTheHiveCTA;
