// Apollo Reborn — bridge between Supabase and the pure v2 workout engine.
// Used by generate-training-plan (and later other workout generators) when
// PROGRAM_ENGINE_V2=true. Loads admin_exercises + blueprints, runs the
// engine, and produces a flat shape that the function persists into
// client_training_plans / training_plan_days / training_plan_exercises.

import {
  generateProgram,
  type Blueprint,
  type Exercise,
  type WorkoutProfile,
  type Session,
  type Difficulty,
  type Location,
} from "./workout-engine.ts";

export const isV2Enabled = (): boolean =>
  (Deno.env.get("PROGRAM_ENGINE_V2") ?? "false").toLowerCase() === "true";

export const isV2ForcedForTest = (req: Request): boolean =>
  (req.headers.get("x-program-generator") ?? "").toLowerCase() === "v2";

const toEx = (r: any): Exercise => ({
  id: r.id,
  name: r.name ?? "",
  body_part: r.body_part ?? null,
  movement_pattern: r.movement_pattern ?? null,
  location_type: r.location_type ?? null,
  difficulty: (r.difficulty ?? "intermediate") as Difficulty,
  equipment: Array.isArray(r.equipment) ? r.equipment : [],
  is_warmup: !!r.is_warmup,
  is_cooldown: !!r.is_cooldown,
  is_recovery: !!r.is_recovery,
  mux_playback_id: r.mux_playback_id ?? null,
  suggested_reps: r.suggested_reps ?? null,
  suggested_time: r.suggested_time ?? null,
});

export async function fetchExerciseLibrary(supabaseAdmin: any): Promise<Exercise[]> {
  const { data, error } = await supabaseAdmin
    .from("admin_exercises")
    .select("id,name,body_part,movement_pattern,location_type,difficulty,equipment,is_warmup,is_cooldown,is_recovery,mux_playback_id,suggested_reps,suggested_time");
  if (error) throw new Error(`admin_exercises fetch failed: ${error.message}`);
  return (data ?? []).map(toEx);
}

export async function fetchBlueprints(supabaseAdmin: any): Promise<Blueprint[]> {
  const { data: bps, error: bpErr } = await supabaseAdmin
    .from("session_blueprints")
    .select("id,program_slug,day_type,location,sort_order");
  if (bpErr) throw new Error(`session_blueprints fetch failed: ${bpErr.message}`);

  const { data: slots, error: slErr } = await supabaseAdmin
    .from("session_blueprint_slots")
    .select("blueprint_id,slot_order,block,role,movement_pattern,body_part_filter,equipment_filter,sets,reps_or_time,rest");
  if (slErr) throw new Error(`session_blueprint_slots fetch failed: ${slErr.message}`);

  const byBp = new Map<string, any[]>();
  (slots ?? []).forEach((s: any) => {
    const arr = byBp.get(s.blueprint_id) ?? [];
    arr.push(s);
    byBp.set(s.blueprint_id, arr);
  });

  return (bps ?? []).map((b: any) => ({
    program_slug: b.program_slug,
    day_type: b.day_type,
    location: b.location,
    slots: (byBp.get(b.id) ?? []).sort((a, b) => a.slot_order - b.slot_order),
  }));
}

export function buildWorkoutProfileFromQuestionnaire(q: any): WorkoutProfile {
  const env = String(q.workout_environment ?? "").toLowerCase();
  const location: Location = env.includes("home") ? "At Home" : env.includes("recover") ? "Recovery" : "Gym";
  const exp = String(q.fitness_experience ?? q.training_experience ?? "intermediate").toLowerCase();
  const experience: Difficulty = exp.startsWith("beg") ? "beginner" : exp.startsWith("adv") ? "advanced" : "intermediate";
  const dur = Number(q.workout_duration_minutes ?? 45);
  const session_minutes: 20 | 30 | 45 | 60 = dur <= 22 ? 20 : dur <= 32 ? 30 : dur <= 50 ? 45 : 60;
  return {
    goal: q.goal_next_4_weeks ?? q.primary_goal ?? "Muscle Gain",
    location,
    experience,
    days_per_week: Math.max(2, Math.min(6, Number(q.workout_days_per_week ?? q.training_days_per_week ?? 4))),
    session_minutes,
    body_focus: Array.isArray(q.body_focus) ? q.body_focus : [],
    equipment_available: Array.isArray(q.training_methods) ? q.training_methods : [],
    history: [],
  };
}

export type V2WorkoutResult = ReturnType<typeof generateProgram>;

export function runV2Workout(profile: WorkoutProfile, blueprints: Blueprint[], library: Exercise[]): V2WorkoutResult {
  return generateProgram(profile, blueprints, library);
}

// Flatten an engine session → rows we can insert into training_plan_exercises.
export function sessionToRows(s: Session) {
  const all = [...s.blocks.warmup, ...s.blocks.main, ...s.blocks.cooldown];
  return all.map((slot, i) => ({
    sort_order: i,
    block: slot.block,
    exercise_id: slot.exercise_id,
    exercise_name: slot.exercise_name,
    muscle_group: slot.body_part,
    sets: slot.sets,
    reps: String(slot.reps_or_time),
    rest_seconds: slot.rest_seconds,
    notes: slot.coaching_note,
    suggested_load: slot.suggested_load ?? null,
    mux_playback_id: slot.mux_playback_id,
    video_url: slot.video_url,
  }));
}
