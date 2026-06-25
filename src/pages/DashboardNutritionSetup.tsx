import { useState, useEffect } from "react";
import { useNavigate, Navigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Loader2, Check, Sparkles } from "lucide-react";
import { useFitnessProfile } from "@/hooks/useFitnessProfile";

// ── Macro engine (Mifflin-St Jeor + goal adjust) ──
const calcMacros = (
  age: number,
  gender: string,
  heightInches: number,
  weightLbs: number,
  activity: string,
  goal: string,
  highProtein: boolean,
  carbPref: string,
) => {
  const wKg = weightLbs * 0.453592;
  const hCm = heightInches * 2.54;
  const bmr =
    gender === "female"
      ? 10 * wKg + 6.25 * hCm - 5 * age - 161
      : 10 * wKg + 6.25 * hCm - 5 * age + 5;
  const mult: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    extreme: 1.9,
  };
  const tdee = bmr * (mult[activity] || 1.55);

  let calories = Math.round(tdee);
  if (goal === "lose_fat") calories = Math.round(tdee - 500);
  else if (goal === "lean_bulk") calories = Math.round(tdee + 250);
  else if (goal === "build_muscle") calories = Math.round(tdee + 400);
  else if (goal === "recomp") calories = Math.round(tdee - 100);

  const proteinPerLb = highProtein ? 1.1 : goal === "lose_fat" ? 1.0 : 0.9;
  const protein = Math.round(weightLbs * proteinPerLb);

  const fatPct = carbPref === "low" ? 0.35 : carbPref === "moderate" ? 0.28 : 0.22;
  const fat = Math.round((calories * fatPct) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  const water = Math.round(weightLbs * 0.55); // oz

  return { calories, protein, carbs, fat, water };
};

// ── Option lists ──
const GENDERS = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "unspecified", label: "Prefer not to say" },
];
const ACTIVITY = [
  { id: "sedentary", label: "Sedentary", desc: "Desk job, little movement" },
  { id: "light", label: "Light", desc: "1–3 active days a week" },
  { id: "moderate", label: "Moderate", desc: "3–5 active days a week" },
  { id: "active", label: "Active", desc: "6–7 active days a week" },
  { id: "extreme", label: "Athlete", desc: "Daily intense training" },
];
const MOVEMENT = [
  { id: "low", label: "Mostly seated" },
  { id: "moderate", label: "On my feet some" },
  { id: "high", label: "Constantly moving" },
];
const GOALS = [
  { id: "lose_fat", label: "Lose Fat" },
  { id: "build_muscle", label: "Build Muscle" },
  { id: "lean_bulk", label: "Lean Bulk" },
  { id: "recomp", label: "Recomposition" },
  { id: "maintain", label: "Maintain" },
  { id: "health", label: "Overall Health" },
];
const INTENSITIES = [
  { id: "low", label: "Low" },
  { id: "moderate", label: "Moderate" },
  { id: "high", label: "High" },
  { id: "very_high", label: "Very High" },
];
const STYLES = ["Strength", "Hypertrophy", "Powerlifting", "Bodybuilding", "HIIT", "Conditioning", "Functional", "Athletic"];
const CARDIO_FREQ = [
  { id: "none", label: "None" },
  { id: "1_2", label: "1–2 / week" },
  { id: "3_4", label: "3–4 / week" },
  { id: "5_plus", label: "5+ / week" },
];
const MEALS_PER_DAY = [3, 4, 5, 6];
const SCHEDULES = [
  { id: "standard", label: "Standard 3 meals" },
  { id: "frequent", label: "Frequent small meals" },
  { id: "if_16_8", label: "Intermittent fasting" },
  { id: "flexible", label: "Flexible" },
];
const MEAL_STYLES = ["Quick & easy", "Hearty & filling", "Light & fresh", "High protein", "Comfort food"];
const CARB_PREF = [
  { id: "high", label: "Higher carb" },
  { id: "moderate", label: "Moderate carb" },
  { id: "low", label: "Lower carb" },
];
const PROTEINS = ["Chicken", "Beef", "Fish", "Eggs", "Turkey", "Pork", "Greek Yogurt", "Tofu", "Tempeh", "Whey", "Legumes"];
const RESTRICTIONS = ["Vegetarian", "Vegan", "Pescatarian", "Dairy-Free", "Gluten-Free", "Keto", "Halal", "Kosher", "No Restrictions"];
const ALLERGIES = ["Nuts", "Dairy", "Eggs", "Shellfish", "Soy", "Gluten"];
const PREP_PREF = [
  { id: "daily", label: "Cook daily" },
  { id: "few_times", label: "Few times a week" },
  { id: "weekly_prep", label: "Weekly meal prep" },
  { id: "minimal", label: "Minimal cooking" },
];
const COOKING_SKILL = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
];
const COOKING_TIME = [
  { id: "under_15", label: "Under 15 min" },
  { id: "15_30", label: "15–30 min" },
  { id: "30_60", label: "30–60 min" },
  { id: "60_plus", label: "60+ min" },
];
const EATS_OUT = [
  { id: "rarely", label: "Rarely" },
  { id: "sometimes", label: "Sometimes" },
  { id: "often", label: "Often" },
];
const COMPLEXITY = [
  { id: "simple", label: "Simple meals" },
  { id: "balanced", label: "Mix of both" },
  { id: "advanced", label: "Advanced recipes" },
];
const STRUGGLES = [
  "Cravings", "Portion control", "Lack of time", "Eating enough protein",
  "Emotional eating", "Consistency", "Budget", "Snacking", "Late-night eating",
];

const STEPS = ["Body", "Training", "Preferences", "Restrictions", "Lifestyle", "Habits", "Review"];

const DashboardNutritionSetup = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const force = searchParams.get("force") === "1";
  const { profile: fitnessProfile, save: saveFitnessProfile } = useFitnessProfile();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // If user already completed Fuel intake, skip straight to Fuel dashboard.
  // If they haven't, redirect them to the unified 20-question onboarding
  // (training + nutrition combined). The old per-tab nutrition setup remains
  // available with ?force=1 for retake/edit flows.
  useEffect(() => {
    if (!force && fitnessProfile?.nutrition_completed) {
      navigate("/dashboard/nutrition", { replace: true });
      return;
    }
    if (!force && fitnessProfile && !fitnessProfile.nutrition_completed) {
      navigate("/dashboard/personalize", { replace: true });
    }
  }, [fitnessProfile?.nutrition_completed, fitnessProfile, force, navigate]);


  // Pre-fill from existing nutrition questionnaire if retaking
  const { data: existing } = useQuery({
    queryKey: ["nutrition-questionnaire-existing", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await (supabase as any)
        .from("client_nutrition_questionnaires")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Also pull the initial intake questionnaire so we can pre-fill the body
  // basics (height/weight/age/gender/activity/goal) the user already entered
  // and stop asking them for the same info again.
  const { data: intake } = useQuery({
    queryKey: ["intake-questionnaire-for-nutrition", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await (supabase as any)
        .from("client_questionnaires")
        .select(
          "height_inches, weight_lbs, age, sex, activity_level, goal_next_4_weeks, dietary_restrictions, weekly_food_budget"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const [form, setForm] = useState<any>({
    current_weight_lbs: "",
    goal_weight_lbs: "",
    height_feet: "",
    height_inches: "",
    age: "",
    gender: "",
    activity_level: "moderate",
    daily_movement_level: "moderate",
    main_goal: "",
    training_days_per_week: "",
    workout_intensity: "moderate",
    workout_style: "",
    cardio_frequency: "none",
    daily_steps: "",
    meals_per_day: 3,
    eating_schedule: "standard",
    breakfast_style: "",
    lunch_style: "",
    dinner_style: "",
    carb_preference: "moderate",
    high_protein: true,
    preferred_proteins: [] as string[],
    favorite_foods: "",
    disliked_foods: "",
    foods_to_include: "",
    dietary_restrictions: [] as string[],
    allergies: [] as string[],
    allergies_other: "",
    grocery_budget_weekly: "",
    meal_prep_preference: "",
    cooking_skill: "",
    cooking_time: "",
    eats_out_often: "",
    recipe_complexity: "",
    preferred_grocery_stores: "" as string,
    current_calories: "",
    current_protein_grams: "",
    water_intake_oz: "",
    biggest_struggles: [] as string[],
  });

  // Hydrate once existing nutrition questionnaire loads
  useEffect(() => {
    if (existing) {
      const totalIn = existing.height_inches || 0;
      setForm((p: any) => ({
        ...p,
        ...existing,
        height_feet: Math.floor(totalIn / 12).toString(),
        height_inches: (totalIn % 12).toString(),
        current_weight_lbs: existing.current_weight_lbs?.toString() || "",
        goal_weight_lbs: existing.goal_weight_lbs?.toString() || "",
        age: existing.age?.toString() || "",
        training_days_per_week: existing.training_days_per_week?.toString() || "",
        daily_steps: existing.daily_steps?.toString() || "",
        grocery_budget_weekly: existing.grocery_budget_weekly?.toString() || "",
        current_calories: existing.current_calories?.toString() || "",
        current_protein_grams: existing.current_protein_grams?.toString() || "",
        water_intake_oz: existing.water_intake_oz?.toString() || "",
        preferred_grocery_stores: (existing.preferred_grocery_stores || []).join(", "),
      }));
    }
  }, [existing]);

  // Pre-fill from the initial intake questionnaire — only fills fields the
  // user hasn't already provided so we never overwrite their edits.
  useEffect(() => {
    if (!intake) return;
    const totalIn = intake.height_inches || 0;
    const intakeFeet = totalIn ? Math.floor(totalIn / 12).toString() : "";
    const intakeInchesPart = totalIn ? (totalIn % 12).toString() : "";

    const goalMap: Record<string, string> = {
      gain_muscle: "build_muscle",
      build_muscle: "build_muscle",
      lose_fat: "lose_fat",
      reduce_bf: "recomp",
      recomp: "recomp",
      performance: "maintain",
      maintain: "maintain",
      lean_bulk: "lean_bulk",
      health: "health",
    };

    setForm((p: any) => ({
      ...p,
      height_feet: p.height_feet || intakeFeet,
      height_inches: p.height_inches || intakeInchesPart,
      current_weight_lbs:
        p.current_weight_lbs || (intake.weight_lbs?.toString() ?? ""),
      age: p.age || (intake.age?.toString() ?? ""),
      gender: p.gender || (intake.sex ?? ""),
      activity_level:
        p.activity_level && p.activity_level !== "moderate"
          ? p.activity_level
          : intake.activity_level ?? p.activity_level,
      main_goal: p.main_goal || (goalMap[intake.goal_next_4_weeks] ?? ""),
      dietary_restrictions: p.dietary_restrictions?.length
        ? p.dietary_restrictions
        : Array.isArray(intake.dietary_restrictions)
          ? intake.dietary_restrictions
          : [],
      grocery_budget_weekly:
        p.grocery_budget_weekly || (intake.weekly_food_budget?.toString() ?? ""),
    }));
  }, [intake]);

  // Master fitness profile takes precedence — never re-ask for fields it already has
  useEffect(() => {
    if (!fitnessProfile) return;
    const totalIn = fitnessProfile.height_inches || 0;
    const goalMap: Record<string, string> = {
      gain_muscle: "build_muscle",
      build_muscle: "build_muscle",
      lose_fat: "lose_fat",
      reduce_bf: "recomp",
      recomp: "recomp",
      performance: "maintain",
      maintain: "maintain",
      lean_bulk: "lean_bulk",
      health: "health",
    };
    setForm((p: any) => ({
      ...p,
      height_feet: p.height_feet || (totalIn ? Math.floor(totalIn / 12).toString() : ""),
      height_inches: p.height_inches || (totalIn ? (totalIn % 12).toString() : ""),
      current_weight_lbs: p.current_weight_lbs || (fitnessProfile.weight_lbs?.toString() ?? ""),
      goal_weight_lbs: p.goal_weight_lbs || (fitnessProfile.goal_weight_lbs?.toString() ?? ""),
      age: p.age || (fitnessProfile.age?.toString() ?? ""),
      gender: p.gender || (fitnessProfile.sex ?? ""),
      activity_level:
        p.activity_level && p.activity_level !== "moderate"
          ? p.activity_level
          : fitnessProfile.activity_level ?? p.activity_level,
      main_goal: p.main_goal || (goalMap[fitnessProfile.primary_goal ?? ""] ?? fitnessProfile.primary_goal ?? ""),
      meals_per_day: p.meals_per_day || fitnessProfile.meals_per_day || 3,
      dietary_restrictions: p.dietary_restrictions?.length
        ? p.dietary_restrictions
        : fitnessProfile.dietary_preferences ?? [],
      allergies: p.allergies?.length ? p.allergies : fitnessProfile.allergies ?? [],
      disliked_foods: p.disliked_foods || (fitnessProfile.disliked_foods ?? []).join(", "),
      grocery_budget_weekly:
        p.grocery_budget_weekly || (fitnessProfile.weekly_food_budget?.toString() ?? ""),
    }));
  }, [fitnessProfile]);



  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  const toggle = (k: string, v: string) =>
    setForm((p: any) => {
      const arr = (p[k] || []) as string[];
      return { ...p, [k]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] };
    });

  const heightInches =
    (parseInt(form.height_feet) || 0) * 12 + (parseInt(form.height_inches) || 0);
  const computed =
    heightInches && form.current_weight_lbs && form.age && form.gender && form.main_goal
      ? calcMacros(
          parseInt(form.age),
          form.gender,
          heightInches,
          parseFloat(form.current_weight_lbs),
          form.activity_level,
          form.main_goal,
          !!form.high_protein,
          form.carb_preference,
        )
      : null;

  const canProceed = () => {
    if (step === 0)
      return form.current_weight_lbs && form.height_feet && form.age && form.gender && form.main_goal;
    if (step === 1) return form.training_days_per_week !== "" && form.workout_style;
    if (step === 2) return form.meals_per_day && form.carb_preference;
    if (step === 3) return true;
    if (step === 4) return form.cooking_skill && form.cooking_time;
    if (step === 5) return true;
    return true;
  };

  const handleSubmit = async () => {
    if (!user || !computed) return;
    setSubmitting(true);
    try {
      const payload: any = {
        user_id: user.id,
        current_weight_lbs: parseFloat(form.current_weight_lbs) || null,
        goal_weight_lbs: form.goal_weight_lbs ? parseFloat(form.goal_weight_lbs) : null,
        height_inches: heightInches,
        age: parseInt(form.age) || null,
        gender: form.gender,
        activity_level: form.activity_level,
        daily_movement_level: form.daily_movement_level,
        main_goal: form.main_goal,
        training_days_per_week: form.training_days_per_week
          ? parseInt(form.training_days_per_week)
          : null,
        workout_intensity: form.workout_intensity,
        workout_style: form.workout_style,
        cardio_frequency: form.cardio_frequency,
        daily_steps: form.daily_steps ? parseInt(form.daily_steps) : null,
        meals_per_day: parseInt(form.meals_per_day) || 3,
        eating_schedule: form.eating_schedule,
        breakfast_style: form.breakfast_style || null,
        lunch_style: form.lunch_style || null,
        dinner_style: form.dinner_style || null,
        carb_preference: form.carb_preference,
        high_protein: !!form.high_protein,
        preferred_proteins: form.preferred_proteins,
        favorite_foods: form.favorite_foods || null,
        disliked_foods: form.disliked_foods || null,
        foods_to_include: form.foods_to_include || null,
        dietary_restrictions: form.dietary_restrictions,
        allergies: form.allergies,
        allergies_other: form.allergies_other || null,
        grocery_budget_weekly: form.grocery_budget_weekly
          ? parseFloat(form.grocery_budget_weekly)
          : null,
        meal_prep_preference: form.meal_prep_preference || null,
        cooking_skill: form.cooking_skill,
        cooking_time: form.cooking_time,
        eats_out_often: form.eats_out_often || null,
        recipe_complexity: form.recipe_complexity || null,
        preferred_grocery_stores: form.preferred_grocery_stores
          ? form.preferred_grocery_stores.split(",").map((s: string) => s.trim()).filter(Boolean)
          : [],
        current_calories: form.current_calories ? parseInt(form.current_calories) : null,
        current_protein_grams: form.current_protein_grams
          ? parseInt(form.current_protein_grams)
          : null,
        water_intake_oz: form.water_intake_oz ? parseInt(form.water_intake_oz) : null,
        biggest_struggles: form.biggest_struggles,
        calorie_target: computed.calories,
        protein_target_g: computed.protein,
        carb_target_g: computed.carbs,
        fat_target_g: computed.fat,
        water_target_oz: computed.water,
        is_active: true,
        completed_at: new Date().toISOString(),
      };

      const { data: savedNutritionQ, error } = await (supabase as any)
        .from("client_nutrition_questionnaires")
        .upsert(payload, { onConflict: "user_id" })
        .select("id")
        .single();
      if (error) throw error;

      // Sync nutrition profile so the rest of the Fuel tab reflects new targets
      const profilePayload: any = {
        user_id: user.id,
        age: parseInt(form.age) || null,
        height_inches: heightInches,
        weight_lbs: parseFloat(form.current_weight_lbs) || null,
        goal_weight: form.goal_weight_lbs ? parseFloat(form.goal_weight_lbs) : null,
        activity_level: form.activity_level,
        goals: form.main_goal,
        dietary_preferences: [form.gender],
        food_restrictions: form.dietary_restrictions,
      };
      const { error: profileError } = await (supabase as any)
        .from("client_nutrition_profiles")
        .upsert(profilePayload, { onConflict: "user_id" });
      if (profileError) throw profileError;

      const { error: macroError } = await (supabase as any)
        .from("user_macro_targets")
        .upsert({
          user_id: user.id,
          calorie_target: computed.calories,
          protein_grams: computed.protein,
          carb_grams: computed.carbs,
          fat_grams: computed.fat,
          source: "auto",
          goal_type: form.main_goal,
        }, { onConflict: "user_id" });
      if (macroError) throw macroError;

      const { data: activeExistingPlan } = await supabase
        .from("nutrition_plans")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (!activeExistingPlan) {
        const { data: generated, error: generateError } = await supabase.functions
          .invoke("auto-generate-programs", { body: { nutritionQuestionnaireId: savedNutritionQ?.id } });
        if (generateError) throw new Error(generateError.message);
        if (generated?.errors?.length && !generated?.nutrition?.success) {
          throw new Error(generated.errors.join("; "));
        }
      }

      // Mirror to master fitness profile so Fuel/Coach/Onboarding never re-ask
      try {
        await saveFitnessProfile({
          height_inches: heightInches || null,
          weight_lbs: parseFloat(form.current_weight_lbs) || null,
          goal_weight_lbs: form.goal_weight_lbs ? parseFloat(form.goal_weight_lbs) : null,
          age: parseInt(form.age) || null,
          sex: (form.gender || null) as "male" | "female" | null,
          activity_level: form.activity_level || null,
          primary_goal: form.main_goal || null,
          training_days_per_week: form.training_days_per_week ? parseInt(form.training_days_per_week) : null,
          meals_per_day: parseInt(form.meals_per_day) || 3,
          dietary_preferences: form.dietary_restrictions || [],
          allergies: form.allergies || [],
          disliked_foods: form.disliked_foods
            ? String(form.disliked_foods).split(",").map((s: string) => s.trim()).filter(Boolean)
            : [],
          weekly_food_budget: form.grocery_budget_weekly ? parseFloat(form.grocery_budget_weekly) : null,
          grocery_store: form.preferred_grocery_stores
            ? String(form.preferred_grocery_stores).split(",").map((s: string) => s.trim()).filter(Boolean)[0] ?? null
            : null,
          calorie_target: computed.calories,
          protein_target_g: computed.protein,
          carb_target_g: computed.carbs,
          fat_target_g: computed.fat,
          nutrition_completed: true,
        });
      } catch (mirrorErr: any) {
        console.error("[NutritionSetup] master profile mirror failed", mirrorErr?.message);
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["nutrition-questionnaire", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["nutrition-questionnaire-existing", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["my-nutrition-plans"] }),
        queryClient.invalidateQueries({ queryKey: ["nutrition-profile"] }),
        queryClient.invalidateQueries({ queryKey: ["user-macro-targets", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["fitness_profile", user.id] }),
      ]);

      toast({
        title: "Your Fuel plan is ready",
        description: "Your targets and meals are saved.",
      });
      navigate("/dashboard/nutrition");
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="border-b border-border/30 sticky top-0 z-20 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between max-w-xl">
          <button
            onClick={() => (step === 0 ? navigate("/dashboard/nutrition") : setStep((s) => s - 1))}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {step === 0 ? "Back" : "Previous"}
          </button>
          <span className="text-[11px] tracking-widest text-muted-foreground uppercase">
            {step + 1} / {STEPS.length}
          </span>
        </div>
        <div className="h-[2px] bg-muted/30">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 md:py-14 max-w-xl">
        <div className="mb-10">
          <p className="text-[11px] tracking-[0.25em] text-primary uppercase mb-3">{STEPS[step]}</p>
          <h1 className="font-heading text-3xl md:text-4xl tracking-tight leading-tight">
            {step === 0 && <>Tell us about <span className="text-primary">your body.</span></>}
            {step === 1 && <>How you <span className="text-primary">train.</span></>}
            {step === 2 && <>Your <span className="text-primary">food preferences.</span></>}
            {step === 3 && <>Restrictions & <span className="text-primary">allergies.</span></>}
            {step === 4 && <>Lifestyle & <span className="text-primary">budget.</span></>}
            {step === 5 && <>Current <span className="text-primary">habits.</span></>}
            {step === 6 && <>Your <span className="text-primary">Fuel plan.</span></>}
          </h1>
          <p className="text-sm text-muted-foreground font-light mt-3">
            {step === 0 && "We use these to dial in your calories and macros."}
            {step === 1 && "So your fuel matches your training load."}
            {step === 2 && "Tell us how you actually like to eat."}
            {step === 3 && "We'll filter every meal we generate."}
            {step === 4 && "We tailor recipes to your kitchen and your wallet."}
            {step === 5 && "Optional — but it helps us coach you better."}
            {step === 6 && "Review your targets, then we'll build your plan."}
          </p>
        </div>

        <div className="space-y-7">
          {step === 0 && (
            <>
              <Field label="Current weight">
                <Suffix value={form.current_weight_lbs} onChange={(v) => set("current_weight_lbs", v)} placeholder="" suffix="lbs" />
              </Field>
              <Field label="Goal weight" optional>
                <Suffix value={form.goal_weight_lbs} onChange={(v) => set("goal_weight_lbs", v)} placeholder="" suffix="lbs" />
              </Field>
              <Field label="Height">
                <div className="grid grid-cols-2 gap-3">
                  <Suffix value={form.height_feet} onChange={(v) => set("height_feet", v)} placeholder="" suffix="ft" />
                  <Suffix value={form.height_inches} onChange={(v) => set("height_inches", v)} placeholder="" suffix="in" />
                </div>
              </Field>
              <Field label="Age">
                <Input type="number" value={form.age} onChange={(e) => set("age", e.target.value)} placeholder="" />
              </Field>
              <Field label="Gender">
                <PillRow options={GENDERS} value={form.gender} onChange={(v) => set("gender", v)} cols={2} />
              </Field>
              <Field label="Activity level">
                <CardChoice options={ACTIVITY} value={form.activity_level} onChange={(v) => set("activity_level", v)} />
              </Field>
              <Field label="Daily movement (outside training)">
                <PillRow options={MOVEMENT} value={form.daily_movement_level} onChange={(v) => set("daily_movement_level", v)} cols={3} />
              </Field>
              <Field label="Main nutrition goal">
                <PillRow options={GOALS} value={form.main_goal} onChange={(v) => set("main_goal", v)} cols={2} />
              </Field>
            </>
          )}

          {step === 1 && (
            <>
              <Field label="Training days per week">
                <div className="grid grid-cols-7 gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => set("training_days_per_week", String(d))}
                      className={`py-3 text-sm rounded-xl border transition-all ${
                        String(form.training_days_per_week) === String(d)
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border/30 text-muted-foreground hover:border-border/60"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Workout intensity">
                <PillRow options={INTENSITIES} value={form.workout_intensity} onChange={(v) => set("workout_intensity", v)} cols={4} />
              </Field>
              <Field label="Preferred workout style">
                <ChipMulti
                  options={STYLES}
                  values={form.workout_style ? [form.workout_style] : []}
                  onToggle={(v) => set("workout_style", v)}
                  single
                />
              </Field>
              <Field label="Cardio frequency">
                <PillRow options={CARDIO_FREQ} value={form.cardio_frequency} onChange={(v) => set("cardio_frequency", v)} cols={2} />
              </Field>
              <Field label="Estimated daily steps" optional>
                <Suffix value={form.daily_steps} onChange={(v) => set("daily_steps", v)} placeholder="8,000" suffix="steps" />
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <Field label="Meals per day">
                <div className="grid grid-cols-4 gap-2">
                  {MEALS_PER_DAY.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => set("meals_per_day", n)}
                      className={`py-3 text-sm rounded-xl border transition-all ${
                        form.meals_per_day === n
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border/30 text-muted-foreground hover:border-border/60"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Eating schedule">
                <PillRow options={SCHEDULES} value={form.eating_schedule} onChange={(v) => set("eating_schedule", v)} cols={2} />
              </Field>
              <Field label="Breakfast style" optional>
                <ChipMulti options={MEAL_STYLES} values={form.breakfast_style ? [form.breakfast_style] : []} onToggle={(v) => set("breakfast_style", v)} single />
              </Field>
              <Field label="Lunch style" optional>
                <ChipMulti options={MEAL_STYLES} values={form.lunch_style ? [form.lunch_style] : []} onToggle={(v) => set("lunch_style", v)} single />
              </Field>
              <Field label="Dinner style" optional>
                <ChipMulti options={MEAL_STYLES} values={form.dinner_style ? [form.dinner_style] : []} onToggle={(v) => set("dinner_style", v)} single />
              </Field>
              <Field label="Carb preference">
                <PillRow options={CARB_PREF} value={form.carb_preference} onChange={(v) => set("carb_preference", v)} cols={3} />
              </Field>
              <Field label="High protein focus">
                <PillRow
                  options={[{ id: "yes", label: "Yes" }, { id: "no", label: "No" }]}
                  value={form.high_protein ? "yes" : "no"}
                  onChange={(v) => set("high_protein", v === "yes")}
                  cols={2}
                />
              </Field>
              <Field label="Preferred protein sources">
                <ChipMulti options={PROTEINS} values={form.preferred_proteins} onToggle={(v) => toggle("preferred_proteins", v)} />
              </Field>
              <Field label="Favorite foods" optional>
                <Textarea
                  value={form.favorite_foods}
                  onChange={(e) => set("favorite_foods", e.target.value)}
                  placeholder="e.g. salmon, sweet potatoes, oats..."
                  className="min-h-[70px] rounded-2xl"
                />
              </Field>
              <Field label="Foods you dislike" optional>
                <Textarea
                  value={form.disliked_foods}
                  onChange={(e) => set("disliked_foods", e.target.value)}
                  placeholder="e.g. mushrooms, cilantro..."
                  className="min-h-[70px] rounded-2xl"
                />
              </Field>
              <Field label="Foods to include more often" optional>
                <Textarea
                  value={form.foods_to_include}
                  onChange={(e) => set("foods_to_include", e.target.value)}
                  placeholder="e.g. more greens, more seafood..."
                  className="min-h-[70px] rounded-2xl"
                />
              </Field>
            </>
          )}

          {step === 3 && (
            <>
              <Field label="Dietary restrictions">
                <ChipMulti
                  options={RESTRICTIONS}
                  values={form.dietary_restrictions}
                  onToggle={(v) => toggle("dietary_restrictions", v)}
                />
              </Field>
              <Field label="Allergies & sensitivities">
                <ChipMulti options={ALLERGIES} values={form.allergies} onToggle={(v) => toggle("allergies", v)} />
              </Field>
              <Field label="Other allergies" optional>
                <Input
                  value={form.allergies_other}
                  onChange={(e) => set("allergies_other", e.target.value)}
                  placeholder="e.g. sesame, nightshades"
                />
              </Field>
            </>
          )}

          {step === 4 && (
            <>
              <Field label="Meal prep preference">
                <PillRow options={PREP_PREF} value={form.meal_prep_preference} onChange={(v) => set("meal_prep_preference", v)} cols={2} />
              </Field>
              <Field label="Cooking skill">
                <PillRow options={COOKING_SKILL} value={form.cooking_skill} onChange={(v) => set("cooking_skill", v)} cols={3} />
              </Field>
              <Field label="Time available for cooking">
                <PillRow options={COOKING_TIME} value={form.cooking_time} onChange={(v) => set("cooking_time", v)} cols={2} />
              </Field>
              <Field label="How often do you eat out?">
                <PillRow options={EATS_OUT} value={form.eats_out_often} onChange={(v) => set("eats_out_often", v)} cols={3} />
              </Field>
              <Field label="Recipe complexity">
                <PillRow options={COMPLEXITY} value={form.recipe_complexity} onChange={(v) => set("recipe_complexity", v)} cols={3} />
              </Field>
              <Field label="Preferred grocery stores" optional>
                <Input
                  value={form.preferred_grocery_stores}
                  onChange={(e) => set("preferred_grocery_stores", e.target.value)}
                  placeholder="Whole Foods, Trader Joe's, Costco..."
                />
                <p className="text-[11px] text-muted-foreground mt-1.5">Separate with commas.</p>
              </Field>
            </>
          )}

          {step === 5 && (
            <>
              <Field label="Current daily calories" optional>
                <Suffix value={form.current_calories} onChange={(v) => set("current_calories", v)} placeholder="2200" suffix="cal" />
              </Field>
              <Field label="Current daily protein" optional>
                <Suffix value={form.current_protein_grams} onChange={(v) => set("current_protein_grams", v)} placeholder="120" suffix="g" />
              </Field>
              <Field label="Daily water intake" optional>
                <Suffix value={form.water_intake_oz} onChange={(v) => set("water_intake_oz", v)} placeholder="80" suffix="oz" />
              </Field>
              <Field label="Biggest nutrition struggles" optional>
                <ChipMulti options={STRUGGLES} values={form.biggest_struggles} onToggle={(v) => toggle("biggest_struggles", v)} />
              </Field>
            </>
          )}

          {step === 6 && (
            <div className="space-y-6">
              {computed ? (
                <>
                  <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="text-[11px] uppercase tracking-[0.2em] text-primary">Daily targets</span>
                    </div>
                    <div className="text-5xl font-heading tracking-tight">
                      {computed.calories.toLocaleString()}
                      <span className="text-base text-muted-foreground font-light ml-2">cal</span>
                    </div>
                    <div className="grid grid-cols-4 gap-3 mt-6">
                      <Stat label="Protein" value={`${computed.protein}g`} />
                      <Stat label="Carbs" value={`${computed.carbs}g`} />
                      <Stat label="Fat" value={`${computed.fat}g`} />
                      <Stat label="Water" value={`${computed.water}oz`} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    These targets are calculated from the answers you just gave. Once you finish, your
                    coach will personalize a meal plan and grocery list around them. You can update your
                    answers any time from the Fuel tab.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Some required answers are missing. Tap previous to fill them in.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-12 pt-6 border-t border-border/20">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button variant="apollo" onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              variant="apollo"
              onClick={handleSubmit}
              disabled={submitting || !computed}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Build my plan
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Tiny presentational helpers ──
const Field = ({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) => (
  <div className="space-y-2.5">
    <Label className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground font-medium">
      {label}
      {optional && (
        <span className="ml-2 text-muted-foreground/60 normal-case tracking-normal">· optional</span>
      )}
    </Label>
    {children}
  </div>
);

const Suffix = ({
  value, onChange, placeholder, suffix,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; suffix: string;
}) => (
  <div className="relative">
    <Input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
      {suffix}
    </span>
  </div>
);

const PillRow = ({
  options, value, onChange, cols,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  cols: number;
}) => (
  <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
    {options.map((o) => (
      <button
        key={o.id}
        type="button"
        onClick={() => onChange(o.id)}
        className={`p-3 text-sm rounded-2xl border transition-all ${
          value === o.id
            ? "border-primary bg-primary/10 text-primary font-medium"
            : "border-border/30 text-muted-foreground hover:border-border/60"
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const CardChoice = ({
  options, value, onChange,
}: {
  options: { id: string; label: string; desc?: string }[];
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="space-y-2">
    {options.map((o) => (
      <button
        key={o.id}
        type="button"
        onClick={() => onChange(o.id)}
        className={`w-full p-4 rounded-2xl border text-left transition-all ${
          value === o.id ? "border-primary bg-primary/5" : "border-border/30 hover:border-border/60"
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">{o.label}</div>
            {o.desc && <div className="text-xs text-muted-foreground mt-0.5">{o.desc}</div>}
          </div>
          {value === o.id && <Check className="w-4 h-4 text-primary" />}
        </div>
      </button>
    ))}
  </div>
);

const ChipMulti = ({
  options, values, onToggle, single,
}: {
  options: string[];
  values: string[];
  onToggle: (v: string) => void;
  single?: boolean;
}) => (
  <div className="flex flex-wrap gap-2">
    {options.map((o) => {
      const active = single ? values[0] === o : values.includes(o);
      return (
        <button
          key={o}
          type="button"
          onClick={() => onToggle(o)}
          className={`px-4 py-2 text-xs rounded-full border transition-all ${
            active
              ? "border-primary bg-primary/10 text-primary"
              : "border-border/30 text-muted-foreground hover:border-border/60"
          }`}
        >
          {o}
        </button>
      );
    })}
  </div>
);

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="text-center">
    <div className="font-heading text-lg">{value}</div>
    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{label}</div>
  </div>
);

export default DashboardNutritionSetup;
