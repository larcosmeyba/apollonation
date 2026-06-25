// One unified 20-question onboarding flow that replaces the separate
// Training + Fuel questionnaires. Writes to user_fitness_profile (master),
// mw_questionnaire_responses, client_nutrition_questionnaires,
// client_nutrition_profiles, and user_macro_targets so every existing
// generator (workouts, meal plans) keeps working unchanged.

import { useEffect, useMemo, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useFitnessProfile } from "@/hooks/useFitnessProfile";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

// ── Options ───────────────────────────────────────────────────────────────
const PRIMARY_GOALS = [
  { id: "lose_fat", label: "Lose Fat" },
  { id: "build_muscle", label: "Build Muscle" },
  { id: "recomp", label: "Tone & Sculpt" },
  { id: "health", label: "Improve Health" },
  { id: "strength", label: "Increase Strength" },
];
const PACE = [
  { id: "mild", label: "Casual" },
  { id: "standard", label: "Moderate" },
  { id: "aggressive", label: "Aggressive" },
];
const MOTIVATION = [
  { id: "appearance", label: "Appearance" },
  { id: "health", label: "Health" },
  { id: "energy", label: "Energy" },
  { id: "performance", label: "Performance" },
  { id: "confidence", label: "Confidence" },
];
const FITNESS_LEVEL = [
  { id: 1, label: "Beginner" },
  { id: 3, label: "Intermediate" },
  { id: 5, label: "Advanced" },
];
const WORKOUT_LENGTH = [
  { id: 15, label: "15 min" },
  { id: 20, label: "20 min" },
  { id: 30, label: "30 min" },
  { id: 45, label: "45+ min" },
];
const LOCATION = [
  { id: "home", label: "Home", env: "home" },
  { id: "gym", label: "Gym", env: "full_gym" },
  { id: "both", label: "Both", env: "mixed" },
];
const EQUIPMENT = [
  { id: "bodyweight", label: "Bodyweight" },
  { id: "bands", label: "Bands" },
  { id: "dumbbells", label: "Dumbbells" },
  { id: "full_gym", label: "Full Gym" },
];
const GENDERS = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "unspecified", label: "Prefer not to say" },
];
const DIETARY = [
  { id: "none", label: "None" },
  { id: "high_protein", label: "High Protein" },
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "gluten_free", label: "Gluten Free" },
  { id: "dairy_free", label: "Dairy Free" },
];
const ACTIVITY = [
  { id: "sedentary", label: "Sedentary" },
  { id: "light", label: "Lightly Active" },
  { id: "moderate", label: "Active" },
  { id: "active", label: "Very Active" },
];
const COACHING = [
  { id: "encouraging", label: "Encouraging" },
  { id: "balanced", label: "Balanced" },
  { id: "tough_love", label: "Tough Love" },
];
const YN = [
  { id: "yes", label: "Yes" },
  { id: "no", label: "No" },
];

const SECTIONS = [
  { id: "goals", label: "Goals" },
  { id: "training", label: "Training" },
  { id: "nutrition", label: "Nutrition" },
  { id: "lifestyle", label: "Lifestyle" },
  { id: "personalize", label: "Personalize" },
];

// Mifflin-St Jeor
const calcMacros = (
  age: number,
  sex: string,
  heightInches: number,
  weightLbs: number,
  activity: string,
  goalId: string,
  pace: string,
) => {
  const wKg = weightLbs * 0.453592;
  const hCm = heightInches * 2.54;
  const bmr =
    sex === "female"
      ? 10 * wKg + 6.25 * hCm - 5 * age - 161
      : 10 * wKg + 6.25 * hCm - 5 * age + 5;
  const mult: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
  };
  const tdee = bmr * (mult[activity] ?? 1.55);
  const delta = pace === "mild" ? 250 : pace === "aggressive" ? 750 : 500;
  let calories = Math.round(tdee);
  if (goalId === "lose_fat") calories = Math.round(tdee - delta);
  else if (goalId === "build_muscle" || goalId === "strength")
    calories = Math.round(tdee + (pace === "mild" ? 200 : pace === "aggressive" ? 500 : 350));
  else if (goalId === "recomp") calories = Math.round(tdee - 100);

  const proteinPerLb =
    goalId === "build_muscle" || goalId === "strength" ? 1.0 : goalId === "recomp" ? 1.1 : 0.95;
  const protein = Math.round(weightLbs * proteinPerLb);
  const fat = Math.round(weightLbs * 0.35);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  return { calories, protein, carbs, fat };
};

interface Form {
  // section 1
  primary_goal: string;
  pace: string;
  motivation: string;
  // section 2
  fitness_level: number;
  days_per_week: string;
  workout_length: number;
  location: string;
  equipment: string[];
  // section 3
  age: string;
  gender: string;
  height_feet: string;
  height_inches: string;
  weight_lbs: string;
  dietary: string;
  // section 4
  activity_level: string;
  meals_per_day: string;
  disliked_foods: string;
  injuries: string;
  // section 5
  coaching_style: string;
  auto_meals: string;
  auto_workouts: string;
}

const DashboardPersonalize = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { profile, save: saveFitnessProfile } = useFitnessProfile();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [f, setF] = useState<Form>({
    primary_goal: "",
    pace: "standard",
    motivation: "",
    fitness_level: 3,
    days_per_week: "4",
    workout_length: 45,
    location: "",
    equipment: [],
    age: "",
    gender: "",
    height_feet: "",
    height_inches: "",
    weight_lbs: "",
    dietary: "none",
    activity_level: "moderate",
    meals_per_day: "3",
    disliked_foods: "",
    injuries: "",
    coaching_style: "balanced",
    auto_meals: "yes",
    auto_workouts: "yes",
  });

  // Pre-fill from existing fitness profile if available
  useEffect(() => {
    if (!profile) return;
    setF((p) => ({
      ...p,
      age: p.age || (profile.age?.toString() ?? ""),
      gender: p.gender || (profile.sex ?? ""),
      height_feet: p.height_feet || (profile.height_inches ? Math.floor(profile.height_inches / 12).toString() : ""),
      height_inches: p.height_inches || (profile.height_inches ? (profile.height_inches % 12).toString() : ""),
      weight_lbs: p.weight_lbs || (profile.weight_lbs?.toString() ?? ""),
      days_per_week: p.days_per_week || (profile.training_days_per_week?.toString() ?? p.days_per_week),
      meals_per_day: p.meals_per_day || (profile.meals_per_day?.toString() ?? p.meals_per_day),
    }));
  }, [profile]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));
  const toggleEquip = (id: string) =>
    setF((p) => ({
      ...p,
      equipment: p.equipment.includes(id) ? p.equipment.filter((x) => x !== id) : [...p.equipment, id],
    }));

  const totalSteps = SECTIONS.length;
  const progress = ((step + 1) / totalSteps) * 100;

  const canAdvance = useMemo(() => {
    switch (step) {
      case 0:
        return !!f.primary_goal && !!f.pace && !!f.motivation;
      case 1:
        return (
          !!f.fitness_level &&
          !!f.days_per_week &&
          !!f.workout_length &&
          !!f.location &&
          f.equipment.length > 0
        );
      case 2:
        return (
          !!f.age && !!f.gender && !!f.height_feet && !!f.weight_lbs && !!f.dietary
        );
      case 3:
        return !!f.activity_level && !!f.meals_per_day;
      case 4:
        return !!f.coaching_style && !!f.auto_meals && !!f.auto_workouts;
      default:
        return true;
    }
  }, [step, f]);

  const heightInches =
    (parseInt(f.height_feet) || 0) * 12 + (parseInt(f.height_inches) || 0);

  const computed = useMemo(() => {
    if (!heightInches || !f.weight_lbs || !f.age || !f.gender || !f.primary_goal) return null;
    return calcMacros(
      parseInt(f.age),
      f.gender,
      heightInches,
      parseFloat(f.weight_lbs),
      f.activity_level,
      f.primary_goal,
      f.pace,
    );
  }, [f, heightInches]);

  const submit = async () => {
    if (!user || !computed) {
      toast({ title: "Missing info", description: "Please complete every question.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const loc = LOCATION.find((l) => l.id === f.location);
      const dietaryArr = f.dietary === "none" ? [] : [f.dietary];
      const days = parseInt(f.days_per_week) || 4;
      const trainingDays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].slice(0, days);

      // 1) Master profile (trigger mirrors to legacy tables)
      await saveFitnessProfile({
        age: parseInt(f.age) || null,
        sex: (f.gender || null) as "male" | "female" | null,
        height_inches: heightInches || null,
        weight_lbs: parseFloat(f.weight_lbs) || null,
        primary_goal: f.primary_goal,
        activity_level: f.activity_level,
        training_days_per_week: days,
        preferred_training_days: trainingDays,
        workout_duration_minutes: f.workout_length,
        workout_environment: loc?.env ?? "mixed",
        equipment_available: f.equipment,
        meals_per_day: parseInt(f.meals_per_day) || 3,
        dietary_preferences: dietaryArr,
        disliked_foods: f.disliked_foods
          ? f.disliked_foods.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        injuries: f.injuries || null,
        calorie_target: computed.calories,
        protein_target_g: computed.protein,
        carb_target_g: computed.carbs,
        fat_target_g: computed.fat,
        onboarding_completed: true,
        nutrition_completed: true,
      });

      // 2) Training questionnaire (powers My Workouts)
      await (supabase as any)
        .from("mw_questionnaire_responses")
        .upsert(
          {
            user_id: user.id,
            main_goal: f.primary_goal,
            goals: [f.primary_goal],
            experience_level: f.fitness_level,
            training_location: f.location as "home" | "gym" | "both",
            training_days: trainingDays,
            workout_duration_minutes: f.workout_length,
            workout_environment: loc?.env ?? "mixed",
            equipment: f.equipment,
            coach_intensity:
              f.coaching_style === "encouraging" || f.coaching_style === "tough_love" ? "more" : "fewer",
            focus_areas: [],
            improve_areas: [],
            avoid_areas: [],
            workout_styles: [],
            injuries: f.injuries || null,
            completed_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );

      // 3) Nutrition questionnaire (powers Fuel + meal plan generator)
      const { data: savedNutritionQ } = await (supabase as any)
        .from("client_nutrition_questionnaires")
        .upsert(
          {
            user_id: user.id,
            current_weight_lbs: parseFloat(f.weight_lbs) || null,
            height_inches: heightInches,
            age: parseInt(f.age) || null,
            gender: f.gender,
            activity_level: f.activity_level,
            main_goal: f.primary_goal,
            training_days_per_week: days,
            workout_intensity: f.pace === "aggressive" ? "high" : f.pace === "mild" ? "low" : "moderate",
            workout_style: "Strength",
            meals_per_day: parseInt(f.meals_per_day) || 3,
            carb_preference: "moderate",
            high_protein: f.dietary === "high_protein",
            dietary_restrictions: dietaryArr,
            allergies: [],
            disliked_foods: f.disliked_foods || null,
            calorie_target: computed.calories,
            protein_target_g: computed.protein,
            carb_target_g: computed.carbs,
            fat_target_g: computed.fat,
            is_active: true,
            completed_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        )
        .select("id")
        .single();

      // 4) Macro targets + nutrition profile
      await (supabase as any).from("user_macro_targets").upsert(
        {
          user_id: user.id,
          calorie_target: computed.calories,
          protein_grams: computed.protein,
          carb_grams: computed.carbs,
          fat_grams: computed.fat,
          source: "auto",
          goal_type: f.primary_goal,
        },
        { onConflict: "user_id" },
      );

      await (supabase as any).from("client_nutrition_profiles").upsert(
        {
          user_id: user.id,
          age: parseInt(f.age) || null,
          height_inches: heightInches,
          weight_lbs: parseFloat(f.weight_lbs) || null,
          activity_level: f.activity_level,
          goals: f.primary_goal,
          dietary_preferences: [f.gender],
          food_restrictions: dietaryArr,
        },
        { onConflict: "user_id" },
      );

      // 5) Trigger auto-generation if user opted in (don't block on errors)
      if (f.auto_meals === "yes" || f.auto_workouts === "yes") {
        try {
          await supabase.functions.invoke("auto-generate-programs", {
            body: { nutritionQuestionnaireId: savedNutritionQ?.id },
          });
        } catch (e) {
          console.warn("[Personalize] auto-generate failed (non-fatal)", e);
        }
      }

      await Promise.all([
        qc.invalidateQueries({ queryKey: ["fitness_profile", user.id] }),
        qc.invalidateQueries({ queryKey: ["mw_questionnaire_responses", user.id] }),
        qc.invalidateQueries({ queryKey: ["nutrition-questionnaire", user.id] }),
        qc.invalidateQueries({ queryKey: ["nutrition-questionnaire-existing", user.id] }),
        qc.invalidateQueries({ queryKey: ["my-nutrition-plans"] }),
        qc.invalidateQueries({ queryKey: ["user-macro-targets", user.id] }),
        qc.invalidateQueries({ queryKey: ["personalization-status", user.id] }),
      ]);

      toast({
        title: "You're all set",
        description: "Your training plan and fuel targets are ready.",
      });
      navigate("/dashboard");
    } catch (err: any) {
      console.error("[Personalize] submit failed", err);
      toast({ title: "Could not save", description: err?.message ?? "Try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background pb-32" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <div className="sticky top-0 z-20 bg-background/85 backdrop-blur-md border-b border-border/40">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => (step === 0 ? navigate("/dashboard") : setStep((s) => s - 1))}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> {step === 0 ? "Exit" : "Back"}
          </button>
          <span className="text-[10px] tracking-[0.3em] uppercase text-primary flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" /> {SECTIONS[step].label} · {step + 1}/{totalSteps}
          </span>
        </div>
        <Progress value={progress} className="h-1 rounded-none" />
      </div>

      <div className="max-w-xl mx-auto px-4 pt-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="space-y-10"
          >
            {step === 0 && (
              <>
                <SectionHeader
                  eyebrow="Section 1 of 5"
                  title="Your goals."
                  desc="Tell us what you're chasing."
                />
                <Q label="What is your primary goal?">
                  <Pills value={f.primary_goal} onChange={(v) => set("primary_goal", v)} options={PRIMARY_GOALS} />
                </Q>
                <Q label="How quickly do you want to reach it?">
                  <Pills value={f.pace} onChange={(v) => set("pace", v)} options={PACE} cols={3} />
                </Q>
                <Q label="What motivates you most?">
                  <Pills value={f.motivation} onChange={(v) => set("motivation", v)} options={MOTIVATION} />
                </Q>
              </>
            )}

            {step === 1 && (
              <>
                <SectionHeader
                  eyebrow="Section 2 of 5"
                  title="How you train."
                  desc="So we build the right plan around your week."
                />
                <Q label="Fitness level?">
                  <Pills
                    value={f.fitness_level}
                    onChange={(v) => set("fitness_level", v as number)}
                    options={FITNESS_LEVEL}
                    cols={3}
                  />
                </Q>
                <Q label="How many days per week can you train?">
                  <div className="grid grid-cols-7 gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                      <PillBtn
                        key={d}
                        active={f.days_per_week === String(d)}
                        onClick={() => set("days_per_week", String(d))}
                      >
                        {d}
                      </PillBtn>
                    ))}
                  </div>
                </Q>
                <Q label="Preferred workout length?">
                  <Pills
                    value={f.workout_length}
                    onChange={(v) => set("workout_length", v as number)}
                    options={WORKOUT_LENGTH}
                    cols={4}
                  />
                </Q>
                <Q label="Where do you work out?">
                  <Pills value={f.location} onChange={(v) => set("location", v)} options={LOCATION} cols={3} />
                </Q>
                <Q label="Equipment available? (pick all)">
                  <div className="grid grid-cols-2 gap-2">
                    {EQUIPMENT.map((e) => (
                      <PillBtn key={e.id} active={f.equipment.includes(e.id)} onClick={() => toggleEquip(e.id)}>
                        {e.label}
                      </PillBtn>
                    ))}
                  </div>
                </Q>
              </>
            )}

            {step === 2 && (
              <>
                <SectionHeader
                  eyebrow="Section 3 of 5"
                  title="A few body basics."
                  desc="We use these to dial in your calories and macros."
                />
                <Q label="Age">
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={f.age}
                    onChange={(e) => set("age", e.target.value)}
                    placeholder=""
                  />
                </Q>
                <Q label="Gender">
                  <Pills value={f.gender} onChange={(v) => set("gender", v)} options={GENDERS} cols={2} />
                </Q>
                <Q label="Height">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={f.height_feet}
                      onChange={(e) => set("height_feet", e.target.value)}
                      placeholder="ft"
                    />
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={f.height_inches}
                      onChange={(e) => set("height_inches", e.target.value)}
                      placeholder="in"
                    />
                  </div>
                </Q>
                <Q label="Weight (lbs)">
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={f.weight_lbs}
                    onChange={(e) => set("weight_lbs", e.target.value)}
                    placeholder=""
                  />

                </Q>
                <Q label="Dietary preference?">
                  <Pills value={f.dietary} onChange={(v) => set("dietary", v)} options={DIETARY} cols={2} />
                </Q>
              </>
            )}

            {step === 3 && (
              <>
                <SectionHeader
                  eyebrow="Section 4 of 5"
                  title="Your lifestyle."
                  desc="A bit about your day so we don't miss the basics."
                />
                <Q label="Average daily activity level?">
                  <Pills
                    value={f.activity_level}
                    onChange={(v) => set("activity_level", v)}
                    options={ACTIVITY}
                    cols={2}
                  />
                </Q>
                <Q label="How many meals per day do you prefer?">
                  <div className="grid grid-cols-4 gap-2">
                    {[2, 3, 4, 5].map((n) => (
                      <PillBtn
                        key={n}
                        active={f.meals_per_day === String(n)}
                        onClick={() => set("meals_per_day", String(n))}
                      >
                        {n}
                      </PillBtn>
                    ))}
                  </div>
                </Q>
                <Q label="Any foods you dislike?" optional>
                  <Textarea
                    rows={3}
                    value={f.disliked_foods}
                    onChange={(e) => set("disliked_foods", e.target.value)}
                    placeholder="e.g. mushrooms, cilantro"
                  />
                </Q>
                <Q label="Any injuries or limitations?" optional>
                  <Textarea
                    rows={3}
                    value={f.injuries}
                    onChange={(e) => set("injuries", e.target.value)}
                    placeholder="e.g. left knee, lower back"
                  />
                </Q>
              </>
            )}

            {step === 4 && (
              <>
                <SectionHeader
                  eyebrow="Section 5 of 5"
                  title="Apollo personalization."
                  desc="How you want Apollo to coach and plan for you."
                />
                <Q label="What type of coaching style do you prefer?">
                  <Pills
                    value={f.coaching_style}
                    onChange={(v) => set("coaching_style", v)}
                    options={COACHING}
                    cols={3}
                  />
                </Q>
                <Q label="Generate meal plans automatically?">
                  <Pills value={f.auto_meals} onChange={(v) => set("auto_meals", v)} options={YN} cols={2} />
                </Q>
                <Q label="Generate workout schedules automatically?">
                  <Pills value={f.auto_workouts} onChange={(v) => set("auto_workouts", v)} options={YN} cols={2} />
                </Q>

                {computed && (
                  <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-3">
                    <p className="text-[10px] tracking-[0.3em] uppercase text-primary">Your targets</p>
                    <div className="grid grid-cols-4 gap-3 text-center">
                      <Stat value={computed.calories} label="kcal" />
                      <Stat value={`${computed.protein}g`} label="protein" />
                      <Stat value={`${computed.carbs}g`} label="carbs" />
                      <Stat value={`${computed.fat}g`} label="fat" />
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div
        className="fixed bottom-0 inset-x-0 z-20 bg-background/95 backdrop-blur-md border-t border-border/40"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || submitting}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          {step < totalSteps - 1 ? (
            <Button
              variant="apollo"
              onClick={() => setStep((s) => Math.min(totalSteps - 1, s + 1))}
              disabled={!canAdvance}
              className="gap-1 min-w-32"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button variant="apollo" onClick={submit} disabled={!canAdvance || submitting} className="gap-1 min-w-32">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Build my plan
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── UI helpers ────────────────────────────────────────────────────────────
const SectionHeader = ({
  eyebrow,
  title,
  desc,
}: {
  eyebrow: string;
  title: string;
  desc: string;
}) => (
  <div className="space-y-2">
    <p className="text-[10px] tracking-[0.3em] uppercase text-primary">{eyebrow}</p>
    <h1 className="font-heading text-3xl md:text-4xl tracking-tight leading-tight">{title}</h1>
    <p className="text-sm text-muted-foreground">{desc}</p>
  </div>
);

const Q = ({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <p className="text-sm font-semibold">{label}</p>
      {optional && (
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Optional</span>
      )}
    </div>
    {children}
  </div>
);

const PillBtn = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "rounded-xl px-4 py-3 text-sm font-medium border transition-all text-center",
      active
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-card border-border/60 text-foreground/80 hover:border-primary/40",
    )}
  >
    {children}
  </button>
);

function Pills<T extends string | number>({
  value,
  onChange,
  options,
  cols = 2,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
  cols?: 2 | 3 | 4 | 5;
}) {
  const colsClass =
    cols === 5 ? "grid-cols-2 sm:grid-cols-5" : cols === 4 ? "grid-cols-2 sm:grid-cols-4" : cols === 3 ? "grid-cols-3" : "grid-cols-2";
  return (
    <div className={cn("grid gap-2", colsClass)}>
      {options.map((o) => (
        <PillBtn key={String(o.id)} active={value === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </PillBtn>
      ))}
    </div>
  );
}

const Stat = ({ value, label }: { value: string | number; label: string }) => (
  <div>
    <p className="text-xl font-bold leading-tight">{value}</p>
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</p>
  </div>
);

export default DashboardPersonalize;
