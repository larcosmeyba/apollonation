import { useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import apolloLogo from "@/assets/apollo-logo-sm.png";

const DAYS_OF_WEEK = [
  { id: "monday", label: "Mon" },
  { id: "tuesday", label: "Tue" },
  { id: "wednesday", label: "Wed" },
  { id: "thursday", label: "Thu" },
  { id: "friday", label: "Fri" },
  { id: "saturday", label: "Sat" },
  { id: "sunday", label: "Sun" },
];

const DIETARY_OPTIONS = [
  "Vegan", "Vegetarian", "Gluten-Free", "Dairy-Free",
  "Keto", "Paleo", "Halal", "Kosher", "No Restrictions",
];

const GOALS = [
  { id: "gain_muscle", label: "Gain Muscle" },
  { id: "lose_fat", label: "Weight Loss" },
  { id: "reduce_bf", label: "Reduce Body Fat %" },
];

const STEPS = ["Personal Info", "Training", "Nutrition"];

const calculateMacros = (age: number, sex: string, heightInches: number, weightLbs: number, activityLevel: string, goal: string) => {
  const weightKg = weightLbs * 0.453592;
  const heightCm = heightInches * 2.54;
  const bmr = sex === "female"
    ? 10 * weightKg + 6.25 * heightCm - 5 * age - 161
    : 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  const multipliers: Record<string, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, extreme: 1.9 };
  const tdee = bmr * (multipliers[activityLevel] || 1.55);

  let calories: number;
  if (goal === "lose_fat") calories = Math.round(tdee - 500);
  else if (goal === "gain_muscle") calories = Math.round(tdee + 300);
  else if (goal === "reduce_bf") calories = Math.round(tdee - 400);
  else calories = Math.round(tdee);

  let proteinPerLb: number;
  if (goal === "lose_fat" || goal === "reduce_bf") proteinPerLb = 1.1;
  else if (goal === "gain_muscle") proteinPerLb = 1.0;
  else proteinPerLb = 0.85;
  const protein = Math.round(weightLbs * proteinPerLb);
  const fat = Math.round((calories * 0.25) / 9);
  const carbCalories = calories - (protein * 4) - (fat * 9);
  const carbs = Math.max(Math.round(carbCalories / 4), 0);

  return { calories, protein, carbs, fat };
};

const Questionnaire = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    sex: "",
    age: "",
    height_feet: "",
    height_inches: "",
    weight_lbs: "",
    activity_level: "moderate",
    goal: "",
    preferred_training_days: [] as string[],
    weekly_food_budget: "",
    dietary_restrictions: [] as string[],
    disliked_foods: "",
    waiver_accepted: false,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const updateField = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayField = (
    field: "dietary_restrictions" | "preferred_training_days",
    value: string
  ) => {
    setForm((prev) => {
      const arr = prev[field];
      return {
        ...prev,
        [field]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      };
    });
  };

  const canProceed = () => {
    if (step === 0) {
      return form.sex && form.age && form.height_feet && form.weight_lbs && form.goal;
    }
    if (step === 1) {
      return form.preferred_training_days.length > 0;
    }
    if (step === 2) {
      return form.waiver_accepted;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);

    const totalInches = (parseInt(form.height_feet) || 0) * 12 + (parseInt(form.height_inches) || 0);
    const weightLbs = parseFloat(form.weight_lbs) || 150;
    const age = parseInt(form.age) || 25;

    const macros = calculateMacros(age, form.sex, totalInches, weightLbs, form.activity_level, form.goal);

    try {
      const { data: questionnaireData, error } = await (supabase as any)
        .from("client_questionnaires")
        .insert({
          user_id: user.id,
          sex: form.sex,
          age,
          height_inches: totalInches,
          weight_lbs: weightLbs,
          activity_level: form.activity_level,
          workout_days_per_week: form.preferred_training_days.length,
          training_methods: [],
          preferred_training_days: form.preferred_training_days,
          goal_next_4_weeks: form.goal,
          dietary_restrictions: form.dietary_restrictions,
          disliked_foods: form.disliked_foods
            ? form.disliked_foods.split(",").map((f: string) => f.trim()).filter(Boolean)
            : [],
          weekly_food_budget: form.weekly_food_budget ? parseFloat(form.weekly_food_budget) : null,
          waiver_accepted: true,
          waiver_accepted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Save calculated macros to nutrition profile
      const { data: existingProfile } = await supabase
        .from("client_nutrition_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      const profilePayload = {
        user_id: user.id,
        age,
        height_inches: totalInches,
        weight_lbs: weightLbs,
        activity_level: form.activity_level,
        goals: form.goal,
        dietary_preferences: [form.sex],
        food_restrictions: form.dietary_restrictions,
      };

      if (existingProfile) {
        await supabase.from("client_nutrition_profiles").update(profilePayload).eq("id", existingProfile.id);
      } else {
        await supabase.from("client_nutrition_profiles").insert(profilePayload);
      }

      toast({
        title: "Questionnaire submitted!",
        description: "Your personalized programs are being generated. This may take a minute.",
      });
      navigate("/plan-ready");

      supabase.functions
        .invoke("auto-generate-programs", {
          body: { questionnaireId: questionnaireData.id },
        })
        .then((res) => {
          if (res.error) console.error("Auto-generate error:", res.error);
          else console.log("Auto-generate complete:", res.data);
        })
        .catch((err) => console.error("Auto-generate failed:", err));
    } catch (err: any) {
      console.error("Questionnaire submit error:", err);
      toast({ title: "Error", description: err.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={apolloLogo} alt="Apollo Reborn" className="w-10 h-10 invert" />
            <span className="font-heading text-lg tracking-wider">
              APOLLO <span className="text-primary">NATION</span>
            </span>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="text-center mb-10">
          <h1 className="font-heading text-2xl md:text-3xl tracking-[0.05em] mb-2">
            Client <span className="text-primary">Questionnaire</span>
          </h1>
          <p className="text-muted-foreground text-sm font-light">
            Complete this form so we can build your personalized program.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-10">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <button
                onClick={() => i < step && setStep(i)}
                className={`w-8 h-8 rounded-full text-xs font-medium flex items-center justify-center transition-colors ${
                  i === step
                    ? "bg-primary text-primary-foreground"
                    : i < step
                    ? "bg-primary/20 text-primary cursor-pointer"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </button>
              <span className={`text-xs hidden sm:inline ${i === step ? "text-foreground" : "text-muted-foreground"}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && <div className="w-8 h-px bg-border" />}
            </div>
          ))}
        </div>

        <div className="border border-border/30 bg-card/50 p-6 md:p-10 rounded-2xl">
          {step === 0 && (
            <div className="space-y-6">
              <h2 className="font-heading text-lg tracking-wide mb-4">Personal & Physical Data</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sex</Label>
                  <Select value={form.sex} onValueChange={(v) => updateField("sex", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Age</Label>
                  <Input type="number" placeholder="25" value={form.age} onChange={(e) => updateField("age", e.target.value)} min={13} max={100} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Height (ft)</Label>
                  <Input type="number" placeholder="5" value={form.height_feet} onChange={(e) => updateField("height_feet", e.target.value)} min={3} max={8} />
                </div>
                <div className="space-y-2">
                  <Label>Height (in)</Label>
                  <Input type="number" placeholder="10" value={form.height_inches} onChange={(e) => updateField("height_inches", e.target.value)} min={0} max={11} />
                </div>
                <div className="space-y-2">
                  <Label>Weight (lbs)</Label>
                  <Input type="number" placeholder="175" value={form.weight_lbs} onChange={(e) => updateField("weight_lbs", e.target.value)} min={50} max={600} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Activity Level</Label>
                <Select value={form.activity_level} onValueChange={(v) => updateField("activity_level", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedentary">Sedentary (little or no exercise)</SelectItem>
                    <SelectItem value="light">Lightly Active (1-3 days/week)</SelectItem>
                    <SelectItem value="moderate">Moderately Active (3-5 days/week)</SelectItem>
                    <SelectItem value="active">Very Active (6-7 days/week)</SelectItem>
                    <SelectItem value="extreme">Extremely Active (2x/day)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label>Goal</Label>
                <div className="grid grid-cols-3 gap-3">
                  {GOALS.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => updateField("goal", g.id)}
                      className={`p-3 text-sm border rounded-xl text-center transition-colors ${
                        form.goal === g.id
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border/30 text-muted-foreground hover:border-border/60"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <h2 className="font-heading text-lg tracking-wide mb-4">Training Preferences</h2>
              <div className="space-y-3">
                <Label>Which days do you want to train?</Label>
                <p className="text-[11px] text-muted-foreground">
                  Select your goal training days. We'll send you reminders on these days if you haven't logged in.
                </p>
                <div className="grid grid-cols-7 gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => toggleArrayField("preferred_training_days", day.id)}
                      className={`py-3 text-sm border rounded-xl text-center transition-colors ${
                        form.preferred_training_days.includes(day.id)
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border/30 text-muted-foreground hover:border-border/60"
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
                {form.preferred_training_days.length > 0 && (
                  <p className="text-xs text-primary font-medium">
                    {form.preferred_training_days.length} day{form.preferred_training_days.length !== 1 ? "s" : ""} selected
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="font-heading text-lg tracking-wide mb-4">Nutrition & Agreement</h2>
              <div className="space-y-2">
                <Label>Weekly Food Budget ($)</Label>
                <Input type="number" placeholder="100" value={form.weekly_food_budget} onChange={(e) => updateField("weekly_food_budget", e.target.value)} min={0} />
              </div>
              <div className="space-y-3">
                <Label>Dietary Restrictions / Preferences</Label>
                <div className="flex flex-wrap gap-2">
                  {DIETARY_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleArrayField("dietary_restrictions", opt)}
                      className={`px-3 py-1.5 text-xs border rounded-lg transition-colors ${
                        form.dietary_restrictions.includes(opt)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/30 text-muted-foreground hover:border-border/60"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Foods You Dislike or Want to Avoid</Label>
                <Textarea
                  placeholder="e.g., mushrooms, olives, seafood, cilantro..."
                  value={form.disliked_foods}
                  onChange={(e) => updateField("disliked_foods", e.target.value)}
                  className="min-h-[60px]"
                />
                <p className="text-[11px] text-muted-foreground">Separate items with commas.</p>
              </div>
              <div className="border border-border/50 p-4 bg-muted/20 rounded-xl space-y-3">
                <h3 className="font-heading text-sm tracking-wide text-foreground">Waiver of Release</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  By checking the box below, I acknowledge and agree that I am voluntarily participating in
                  fitness and nutrition programs provided by Apollo Reborn. I understand that physical exercise
                  and dietary changes carry inherent risks, and I release Apollo Reborn, Coach Marcos, and all
                  associated staff from any and all liability for injury, illness, or adverse health effects that
                  may result from following the prescribed training and nutrition programs. I confirm that I have
                  consulted with a physician and am physically fit to participate in exercise programs. I understand
                  that the programs are not a substitute for professional medical advice.
                </p>
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={form.waiver_accepted}
                    onCheckedChange={(checked) => updateField("waiver_accepted", !!checked)}
                    className="mt-0.5"
                  />
                  <span className="text-sm font-medium">
                    I have read, understand, and agree to the Waiver of Release above.
                  </span>
                </label>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-10 pt-6 border-t border-border/20">
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0} className="text-muted-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button variant="apollo" onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button variant="apollo" onClick={handleSubmit} disabled={submitting || !canProceed()}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Submit Questionnaire
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Questionnaire;
