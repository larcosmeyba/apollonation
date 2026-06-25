import { useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuestionnaire } from "@/hooks/useQuestionnaire";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, Loader2, Check } from "lucide-react";
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

const GOALS = [
  { id: "gain_muscle", label: "Build Muscle" },
  { id: "lose_fat", label: "Lose Fat" },
  { id: "reduce_bf", label: "Recomposition" },
  { id: "performance", label: "Performance" },
];

const EXPERIENCE_LEVELS = [
  { id: "beginner", label: "Beginner", desc: "New to structured training" },
  { id: "intermediate", label: "Intermediate", desc: "1–3 years consistent" },
  { id: "advanced", label: "Advanced", desc: "3+ years, well-trained" },
];

const TRAINING_STYLES = [
  "Strength",
  "Hypertrophy",
  "Powerlifting",
  "Bodybuilding",
  "HIIT",
  "Conditioning",
  "Functional",
  "Athletic",
];

const ENVIRONMENTS = [
  { id: "full_gym", label: "Full Gym" },
  { id: "home_gym", label: "Home Gym" },
  { id: "minimal_equipment", label: "Minimal Equipment" },
  { id: "bodyweight", label: "Bodyweight Only" },
];

const STEPS = ["You", "Body", "Goals", "Training", "Finish"];

const Questionnaire = () => {
  const { user, loading } = useAuth();
  const { hasQuestionnaire, loading: qLoading } = useQuestionnaire(user?.id);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    // About you
    full_name: "",
    email: user?.email || "",
    phone: "",
    date_of_birth: "",
    sex: "",
    // Body
    height_feet: "",
    height_inches: "",
    weight_lbs: "",
    // Goals
    fitness_experience: "",
    activity_level: "moderate",
    goals: [] as string[],
    // Training
    preferred_training_styles: [] as string[],
    preferred_training_days: [] as string[],
    workout_environment: "",
    // Finish
    additional_notes: "",
    waiver_accepted: false,
  });

  if (loading || (user && qLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (hasQuestionnaire) return <Navigate to="/dashboard" replace />;

  const updateField = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayField = (
    field: "preferred_training_days" | "goals" | "preferred_training_styles",
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
      const phoneDigits = form.phone.replace(/\D/g, "");
      return form.full_name.trim() && form.email.trim() && phoneDigits.length >= 10 && form.date_of_birth && form.sex;
    }
    if (step === 1) {
      return form.height_feet && form.weight_lbs;
    }
    if (step === 2) {
      return form.fitness_experience && form.goals.length > 0;
    }
    if (step === 3) {
      return form.preferred_training_styles.length > 0 && form.preferred_training_days.length > 0 && form.workout_environment;
    }
    if (step === 4) return form.waiver_accepted;
    return true;
  };

  const ageFromDob = (dob: string) => {
    if (!dob) return 25;
    const d = new Date(dob);
    const diff = Date.now() - d.getTime();
    return Math.max(13, Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)));
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);

    const totalInches = (parseInt(form.height_feet) || 0) * 12 + (parseInt(form.height_inches) || 0);
    const weightLbs = parseFloat(form.weight_lbs) || 150;
    const age = ageFromDob(form.date_of_birth);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
        if (refreshErr || !refreshed?.session) {
          toast({
            title: "Session expired",
            description: "Please sign in again to submit your questionnaire.",
            variant: "destructive",
          });
          setSubmitting(false);
          navigate("/auth");
          return;
        }
      }

      const payload: any = {
        user_id: user.id,
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        date_of_birth: form.date_of_birth || null,
        sex: form.sex,
        age,
        height_inches: totalInches,
        weight_lbs: weightLbs,
        activity_level: form.activity_level,
        fitness_experience: form.fitness_experience,
        workout_days_per_week: form.preferred_training_days.length,
        training_methods: form.preferred_training_style ? [form.preferred_training_style] : [],
        preferred_training_style: form.preferred_training_style,
        preferred_training_days: form.preferred_training_days,
        workout_environment: form.workout_environment,
        goal_next_4_weeks: form.goal,
        injuries_limitations: form.injuries_limitations.trim() || null,
        current_medications: form.current_medications.trim() || null,
        additional_notes: form.additional_notes.trim() || null,
        waiver_accepted: true,
        waiver_accepted_at: new Date().toISOString(),
        is_active: true,
      };

      const { data: existingQ } = await (supabase as any)
        .from("client_questionnaires")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let questionnaireData: any;
      let error: any;
      if (existingQ?.id) {
        const res = await (supabase as any)
          .from("client_questionnaires")
          .update(payload)
          .eq("id", existingQ.id)
          .select()
          .single();
        questionnaireData = res.data;
        error = res.error;
      } else {
        const res = await (supabase as any)
          .from("client_questionnaires")
          .insert(payload)
          .select()
          .single();
        questionnaireData = res.data;
        error = res.error;
      }
      if (error) throw error;

      // Mirror to master profile (sets onboarding_completed; trigger keeps legacy tables in sync)
      await (supabase as any)
        .from("user_fitness_profile")
        .upsert(
          {
            user_id: user.id,
            sex: form.sex === "male" || form.sex === "female" ? form.sex : null,
            age,
            height_inches: totalInches,
            weight_lbs: weightLbs,
            activity_level: form.activity_level,
            primary_goal: form.goal,
            training_experience: form.fitness_experience,
            training_days_per_week: form.preferred_training_days.length,
            preferred_training_days: form.preferred_training_days,
            workout_environment: form.workout_environment,
            injuries: form.injuries_limitations.trim() || null,
            onboarding_completed: true,
            updated_at: new Date().toISOString(),

          },
          { onConflict: "user_id" }
        );

      // Sync display name + birthday to profile
      await supabase
        .from("profiles")
        .update({
          display_name: form.full_name.trim(),
          birthday: form.date_of_birth || null,
        } as any)
        .eq("user_id", user.id);



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
        food_restrictions: [] as string[],
      };

      if (existingProfile) {
        await supabase.from("client_nutrition_profiles").update(profilePayload).eq("id", existingProfile.id);
      } else {
        await supabase.from("client_nutrition_profiles").insert(profilePayload);
      }

      toast({
        title: "You're all set",
        description: "Your personalized program is being prepared.",
      });
      navigate("/plan-ready");

      supabase.functions
        .invoke("auto-generate-programs", {
          body: { questionnaireId: questionnaireData.id },
        })
        .then((res) => {
          if (res.error) console.error("Auto-generate error:", res.error);
        })
        .catch((err) => console.error("Auto-generate failed:", err));
    } catch (err: any) {
      console.error("Questionnaire submit error:", err);
      toast({ title: "Error", description: err.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/30 sticky top-0 z-20 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={apolloLogo} alt="Apollo Reborn" className="w-8 h-8 invert" />
            <span className="font-heading text-sm tracking-[0.2em]">
              APOLLO <span className="text-primary">REBORN</span>
            </span>
          </Link>
          <span className="text-[11px] tracking-widest text-muted-foreground uppercase">
            Step {step + 1} / {STEPS.length}
          </span>
        </div>
        <div className="h-[2px] bg-muted/30">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 md:py-16 max-w-xl">
        <div className="mb-10">
          <p className="text-[11px] tracking-[0.25em] text-primary uppercase mb-3">
            {STEPS[step]}
          </p>
          <h1 className="font-heading text-3xl md:text-4xl tracking-tight leading-tight">
            {step === 0 && <>Let's get to <span className="text-primary">know you</span>.</>}
            {step === 1 && <>Your <span className="text-primary">measurements</span>.</>}
            {step === 2 && <>What are you <span className="text-primary">working toward?</span></>}
            {step === 3 && <>How you like to <span className="text-primary">train</span>.</>}
            {step === 4 && <>A quick <span className="text-primary">health check</span>.</>}
            {step === 5 && <>Almost <span className="text-primary">there</span>.</>}
          </h1>
          <p className="text-sm text-muted-foreground font-light mt-3">
            {step === 0 && "Just the basics so your coach can reach you."}
            {step === 1 && "We use these to dial in your nutrition and training."}
            {step === 2 && "Pick the goal that matters most right now."}
            {step === 3 && "Your style, your schedule, your space."}
            {step === 4 && "Optional, but helpful for keeping you safe."}
            {step === 5 && "Anything else you want your coach to know?"}
          </p>
        </div>

        <div className="space-y-7">
          {step === 0 && (
            <>
              <Field label="Full name">
                <Input
                  value={form.full_name}
                  onChange={(e) => updateField("full_name", e.target.value)}
                  placeholder="Alex Johnson"
                  autoFocus
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="you@email.com"
                />
              </Field>
              <Field label="Phone">
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  required
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Date of birth">
                  <Input
                    type="date"
                    value={form.date_of_birth}
                    onChange={(e) => updateField("date_of_birth", e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                  />
                </Field>
                <Field label="Gender">
                  <Select value={form.sex} onValueChange={(v) => updateField("sex", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="unspecified">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <Field label="Height">
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <Input
                      type="number"
                      value={form.height_feet}
                      onChange={(e) => updateField("height_feet", e.target.value)}
                      placeholder=""
                      min={3}
                      max={8}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">ft</span>
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      value={form.height_inches}
                      onChange={(e) => updateField("height_inches", e.target.value)}
                      placeholder=""
                      min={0}
                      max={11}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">in</span>
                  </div>
                </div>
              </Field>
              <Field label="Weight">
                <div className="relative">
                  <Input
                    type="number"
                    value={form.weight_lbs}
                    onChange={(e) => updateField("weight_lbs", e.target.value)}
                    placeholder=""
                    min={50}
                    max={600}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">lbs</span>
                </div>
              </Field>
              <Field label="Current activity level">
                <Select value={form.activity_level} onValueChange={(v) => updateField("activity_level", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedentary">Sedentary — desk job, little movement</SelectItem>
                    <SelectItem value="light">Light — 1–3 active days a week</SelectItem>
                    <SelectItem value="moderate">Moderate — 3–5 active days a week</SelectItem>
                    <SelectItem value="active">Very active — 6–7 active days a week</SelectItem>
                    <SelectItem value="extreme">Athlete — daily intense training</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <Field label="Fitness experience">
                <div className="space-y-2">
                  {EXPERIENCE_LEVELS.map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => updateField("fitness_experience", lvl.id)}
                      className={`w-full p-4 rounded-2xl border text-left transition-all ${
                        form.fitness_experience === lvl.id
                          ? "border-primary bg-primary/5"
                          : "border-border/30 hover:border-border/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{lvl.label}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{lvl.desc}</div>
                        </div>
                        {form.fitness_experience === lvl.id && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Main goal">
                <div className="grid grid-cols-2 gap-2">
                  {GOALS.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => updateField("goal", g.id)}
                      className={`p-4 text-sm rounded-2xl border transition-all ${
                        form.goal === g.id
                          ? "border-primary bg-primary/5 text-primary font-medium"
                          : "border-border/30 text-muted-foreground hover:border-border/60"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </Field>
            </>
          )}

          {step === 3 && (
            <>
              <Field label="Preferred training style">
                <div className="flex flex-wrap gap-2">
                  {TRAINING_STYLES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => updateField("preferred_training_style", s)}
                      className={`px-4 py-2 text-xs rounded-full border transition-all ${
                        form.preferred_training_style === s
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/30 text-muted-foreground hover:border-border/60"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Days per week">
                <div className="grid grid-cols-7 gap-1.5">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => toggleArrayField("preferred_training_days", day.id)}
                      className={`py-3 text-xs rounded-xl border transition-all ${
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
                  <p className="text-[11px] text-primary mt-2">
                    {form.preferred_training_days.length} day{form.preferred_training_days.length !== 1 ? "s" : ""} per week
                  </p>
                )}
              </Field>
              <Field label="Where do you train?">
                <div className="grid grid-cols-2 gap-2">
                  {ENVIRONMENTS.map((env) => (
                    <button
                      key={env.id}
                      type="button"
                      onClick={() => updateField("workout_environment", env.id)}
                      className={`p-4 text-sm rounded-2xl border transition-all ${
                        form.workout_environment === env.id
                          ? "border-primary bg-primary/5 text-primary font-medium"
                          : "border-border/30 text-muted-foreground hover:border-border/60"
                      }`}
                    >
                      {env.label}
                    </button>
                  ))}
                </div>
              </Field>
            </>
          )}

          {step === 4 && (
            <>
              <Field label="Injuries or limitations" optional>
                <Textarea
                  value={form.injuries_limitations}
                  onChange={(e) => updateField("injuries_limitations", e.target.value)}
                  placeholder="e.g. lower back stiffness, prior knee surgery..."
                  className="min-h-[90px] rounded-2xl"
                />
              </Field>
              <Field label="Current medications" optional>
                <Textarea
                  value={form.current_medications}
                  onChange={(e) => updateField("current_medications", e.target.value)}
                  placeholder="Anything that may affect training (blood pressure, beta blockers, etc.)"
                  className="min-h-[90px] rounded-2xl"
                />
                <p className="text-[11px] text-muted-foreground mt-2">
                  Shared only with your coach. Leave blank if none.
                </p>
              </Field>
            </>
          )}

          {step === 5 && (
            <>
              <Field label="Anything else for your coach?" optional>
                <Textarea
                  value={form.additional_notes}
                  onChange={(e) => updateField("additional_notes", e.target.value)}
                  placeholder="Schedule quirks, prior programs, what you loved or hated..."
                  className="min-h-[110px] rounded-2xl"
                />
              </Field>
              <div className="border border-border/40 p-5 bg-muted/10 rounded-2xl space-y-3">
                <h3 className="font-heading text-sm tracking-wide">Waiver of Release</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  I'm voluntarily participating in fitness and nutrition programming from Apollo Reborn.
                  I understand exercise carries inherent risk, I've consulted a physician where needed,
                  and I release Apollo Reborn and its coaches from liability for resulting injury or illness.
                  These programs do not replace medical advice.
                </p>
                <label className="flex items-start gap-3 cursor-pointer pt-1">
                  <Checkbox
                    checked={form.waiver_accepted}
                    onCheckedChange={(checked) => updateField("waiver_accepted", !!checked)}
                    className="mt-0.5"
                  />
                  <span className="text-sm font-medium">
                    I've read and agree to the waiver above.
                  </span>
                </label>
              </div>
            </>
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
            <Button variant="apollo" onClick={handleSubmit} disabled={submitting || !canProceed()}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Finish
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

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
      {optional && <span className="ml-2 text-muted-foreground/60 normal-case tracking-normal">· optional</span>}
    </Label>
    {children}
  </div>
);

export default Questionnaire;
