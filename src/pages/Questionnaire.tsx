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
import apolloLogo from "@/assets/apollo-logo.png";

const TRAINING_METHODS = [
  { id: "dumbbells", label: "Dumbbells" },
  { id: "bodyweight", label: "Bodyweight" },
  { id: "mini_bands", label: "Mini Bands" },
  { id: "full_gym", label: "Full Gym Access" },
];

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

const STEPS = ["Personal Info", "Training", "Nutrition"];

const Questionnaire = () => {
  const { user, loading, subscriptionLoading, profile } = useAuth();
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
    workout_days_per_week: "3",
    training_methods: [] as string[],
    current_workout_days: [] as string[],
    preferred_training_days: [] as string[],
    workout_duration_minutes: "60",
    has_other_activities: false,
    other_activities: [] as { day: string; activity_type: string }[],
    goal_next_4_weeks: "",
    goal_weight: "",
    weekly_food_budget: "",
    grocery_store: "",
    dietary_restrictions: [] as string[],
    disliked_foods: "",
    waiver_accepted: false,
  });

  if (loading || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  // Only pro/elite need the questionnaire
  const tier = profile?.subscription_tier;
  if (tier === "basic") return <Navigate to="/dashboard" replace />;

  const updateField = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayField = (
    field: "training_methods" | "dietary_restrictions" | "preferred_training_days" | "current_workout_days",
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

  const addOtherActivity = () => {
    setForm((prev) => ({
      ...prev,
      other_activities: [...prev.other_activities, { day: "", activity_type: "" }],
    }));
  };

  const updateOtherActivity = (index: number, field: "day" | "activity_type", value: string) => {
    setForm((prev) => {
      const updated = [...prev.other_activities];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, other_activities: updated };
    });
  };

  const removeOtherActivity = (index: number) => {
    setForm((prev) => ({
      ...prev,
      other_activities: prev.other_activities.filter((_, i) => i !== index),
    }));
  };

  const canProceed = () => {
    if (step === 0) {
      return form.sex && form.age && form.height_feet && form.weight_lbs;
    }
    if (step === 1) {
      const activitiesValid =
        !form.has_other_activities ||
        form.other_activities.every((a) => a.day && a.activity_type);
      return (
        form.training_methods.length > 0 &&
        form.preferred_training_days.length > 0 &&
        form.workout_duration_minutes &&
        activitiesValid
      );
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

    try {
      const { data: questionnaireData, error } = await (supabase as any)
        .from("client_questionnaires")
        .insert({
          user_id: user.id,
          sex: form.sex,
          age: parseInt(form.age),
          height_inches: totalInches,
          weight_lbs: parseFloat(form.weight_lbs),
          activity_level: form.activity_level,
          workout_days_per_week: parseInt(form.workout_days_per_week),
          training_methods: form.training_methods,
          current_workout_days: form.current_workout_days,
          preferred_training_days: form.preferred_training_days,
          workout_duration_minutes: parseInt(form.workout_duration_minutes),
          has_other_activities: form.has_other_activities,
          other_activities: form.has_other_activities ? form.other_activities : [],
          goal_next_4_weeks: form.goal_next_4_weeks || null,
          goal_weight: form.goal_weight ? parseFloat(form.goal_weight) : null,
          weekly_food_budget: form.weekly_food_budget ? parseFloat(form.weekly_food_budget) : null,
          grocery_store: form.grocery_store || null,
          dietary_restrictions: form.dietary_restrictions,
          disliked_foods: form.disliked_foods
            ? form.disliked_foods.split(",").map((f) => f.trim()).filter(Boolean)
            : [],
          waiver_accepted: true,
          waiver_accepted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Questionnaire submitted!",
        description: "Your personalized programs are being generated. This may take a minute.",
      });
      navigate("/plan-ready");

      // Fire-and-forget: generate training + nutrition plans in background
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
      {/* Header */}
      <div className="border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={apolloLogo} alt="Apollo Nation" className="w-10 h-10 invert" />
            <span className="font-heading text-lg tracking-wider">
              APOLLO <span className="text-primary">NATION</span>
            </span>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-2xl">
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="font-heading text-2xl md:text-3xl tracking-[0.05em] mb-2">
            Client <span className="text-primary">Questionnaire</span>
          </h1>
          <p className="text-muted-foreground text-sm font-light">
            Complete this form so we can build your personalized program.
          </p>
        </div>

        {/* Step Indicator */}
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
              <span
                className={`text-xs hidden sm:inline ${i === step ? "text-foreground" : "text-muted-foreground"}`}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && <div className="w-8 h-px bg-border" />}
            </div>
          ))}
        </div>

        {/* Form Steps */}
        <div className="border border-border/30 bg-card/50 p-6 md:p-10">
          {/* Step 0: Personal Info */}
          {step === 0 && (
            <div className="space-y-6">
              <h2 className="font-heading text-lg tracking-wide mb-4">Personal & Physical Data</h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sex</Label>
                  <Select value={form.sex} onValueChange={(v) => updateField("sex", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Age</Label>
                  <Input
                    type="number"
                    placeholder="25"
                    value={form.age}
                    onChange={(e) => updateField("age", e.target.value)}
                    min={13}
                    max={100}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Height (ft)</Label>
                  <Input
                    type="number"
                    placeholder="5"
                    value={form.height_feet}
                    onChange={(e) => updateField("height_feet", e.target.value)}
                    min={3}
                    max={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Height (in)</Label>
                  <Input
                    type="number"
                    placeholder="10"
                    value={form.height_inches}
                    onChange={(e) => updateField("height_inches", e.target.value)}
                    min={0}
                    max={11}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Weight (lbs)</Label>
                  <Input
                    type="number"
                    placeholder="175"
                    value={form.weight_lbs}
                    onChange={(e) => updateField("weight_lbs", e.target.value)}
                    min={50}
                    max={600}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Activity Level</Label>
                <Select value={form.activity_level} onValueChange={(v) => updateField("activity_level", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedentary">Sedentary (little or no exercise)</SelectItem>
                    <SelectItem value="light">Lightly Active (1-3 days/week)</SelectItem>
                    <SelectItem value="moderate">Moderately Active (3-5 days/week)</SelectItem>
                    <SelectItem value="active">Very Active (6-7 days/week)</SelectItem>
                    <SelectItem value="extreme">Extremely Active (2x/day)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 1: Training */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="font-heading text-lg tracking-wide mb-4">Training Preferences</h2>

              <div className="space-y-2">
                <Label>Preferred Workout Days Per Week</Label>
                <Select
                  value={form.workout_days_per_week}
                  onValueChange={(v) => updateField("workout_days_per_week", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6, 7].map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d} days
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Training Methods (select all that apply)</Label>
                <div className="grid grid-cols-2 gap-3">
                  {TRAINING_METHODS.map((method) => (
                    <label
                      key={method.id}
                      className={`flex items-center gap-3 p-3 border cursor-pointer transition-colors ${
                        form.training_methods.includes(method.id)
                          ? "border-primary/50 bg-primary/5"
                          : "border-border/30 hover:border-border/60"
                      }`}
                    >
                      <Checkbox
                        checked={form.training_methods.includes(method.id)}
                        onCheckedChange={() => toggleArrayField("training_methods", method.id)}
                      />
                      <span className="text-sm">{method.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Current workout routine */}
              <div className="space-y-3">
                <Label>What is your current workout routine?</Label>
                <p className="text-[11px] text-muted-foreground">
                  Select all days you currently exercise.
                </p>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => toggleArrayField("current_workout_days", day.id)}
                      className={`px-4 py-2 text-sm border transition-colors ${
                        form.current_workout_days.includes(day.id)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/30 text-muted-foreground hover:border-border/60"
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preferred training days */}
              <div className="space-y-3">
                <Label>Which days do you plan on training?</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => toggleArrayField("preferred_training_days", day.id)}
                      className={`px-4 py-2 text-sm border transition-colors ${
                        form.preferred_training_days.includes(day.id)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/30 text-muted-foreground hover:border-border/60"
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>How long can you work out? (minutes)</Label>
                <Select
                  value={form.workout_duration_minutes}
                  onValueChange={(v) => updateField("workout_duration_minutes", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                    <SelectItem value="75">75 minutes</SelectItem>
                    <SelectItem value="90">90 minutes</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Group classes / other activities */}
              <div className="space-y-3">
                <Label>
                  Are there days where you do group classes or any other physical activity?
                </Label>
                <div className="flex gap-3">
                  {["Yes", "No"].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        updateField("has_other_activities", opt === "Yes");
                        if (opt === "No") updateField("other_activities", []);
                      }}
                      className={`px-5 py-2 text-sm border transition-colors ${
                        (opt === "Yes" ? form.has_other_activities : !form.has_other_activities)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/30 text-muted-foreground hover:border-border/60"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                {form.has_other_activities && (
                  <div className="space-y-3 pt-1">
                    <p className="text-[11px] text-muted-foreground">
                      Add each activity so we can schedule it as part of your fitness routine.
                    </p>
                    {form.other_activities.map((activity, idx) => (
                      <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                        <div className="space-y-1">
                          <Label className="text-xs">Day</Label>
                          <Select
                            value={activity.day}
                            onValueChange={(v) => updateOtherActivity(idx, "day", v)}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Select day" />
                            </SelectTrigger>
                            <SelectContent>
                              {DAYS_OF_WEEK.map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                  {d.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Activity Type</Label>
                          <Input
                            className="h-9 text-sm"
                            placeholder="e.g., Yoga, Spin class"
                            value={activity.activity_type}
                            onChange={(e) => updateOtherActivity(idx, "activity_type", e.target.value)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeOtherActivity(idx)}
                          className="h-9 text-muted-foreground hover:text-destructive text-xs border border-border/30 px-2"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addOtherActivity}
                      className="text-xs text-primary border border-primary/30 px-3 py-1.5 hover:bg-primary/5 transition-colors"
                    >
                      + Add Activity
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Nutrition & Agreement */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="font-heading text-lg tracking-wide mb-4">Nutrition & Agreement</h2>

              <div className="space-y-2">
                <Label>Goal for the Next 4 Weeks</Label>
                <Textarea
                  placeholder="e.g., Lose 5 lbs, build muscle, improve energy..."
                  value={form.goal_next_4_weeks}
                  onChange={(e) => updateField("goal_next_4_weeks", e.target.value)}
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Goal Weight (lbs)</Label>
                <Input
                  type="number"
                  placeholder="e.g., 160"
                  value={form.goal_weight}
                  onChange={(e) => updateField("goal_weight", e.target.value)}
                  min={50}
                  max={600}
                />
                <p className="text-[11px] text-muted-foreground">
                  Your target weight helps us tailor your training and nutrition plan.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Weekly Food Budget ($)</Label>
                  <Input
                    type="number"
                    placeholder="100"
                    value={form.weekly_food_budget}
                    onChange={(e) => updateField("weekly_food_budget", e.target.value)}
                    min={0}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Grocery Store</Label>
                  <Input
                    placeholder="e.g., Walmart, Trader Joe's"
                    value={form.grocery_store}
                    onChange={(e) => updateField("grocery_store", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Dietary Restrictions / Preferences</Label>
                <div className="flex flex-wrap gap-2">
                  {DIETARY_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleArrayField("dietary_restrictions", opt)}
                      className={`px-3 py-1.5 text-xs border transition-colors ${
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
                <p className="text-[11px] text-muted-foreground">
                  Separate items with commas. These will be excluded from your meal plan.
                </p>
              </div>

              {/* Waiver of Release */}
              <div className="border border-border/50 p-4 bg-muted/20 space-y-3">
                <h3 className="font-heading text-sm tracking-wide text-foreground">Waiver of Release</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  By checking the box below, I acknowledge and agree that I am voluntarily participating in
                  fitness and nutrition programs provided by Apollo Nation. I understand that physical exercise
                  and dietary changes carry inherent risks, and I release Apollo Nation, Coach Marcos, and all
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

          {/* Navigation */}
          <div className="flex items-center justify-between mt-10 pt-6 border-t border-border/20">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
              className="text-muted-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {step < STEPS.length - 1 ? (
              <Button variant="apollo" onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button variant="apollo" onClick={handleSubmit} disabled={submitting}>
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
