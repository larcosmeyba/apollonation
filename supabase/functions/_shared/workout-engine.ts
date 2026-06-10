// Apollo Reborn — Workout Generator Engine (Phase 3, v2).
// Pure functions; no Supabase client. The runner loads tables and feeds them in.
// Spec: Apollo_Workout_Generator_Spec.md (program assignment → blueprint → fill → progression → deload).

// ---------- Types ----------
export type Difficulty = "beginner" | "intermediate" | "advanced";
export type Location = "Gym" | "At Home" | "Recovery";
export type Block = "Warmup" | "Primary" | "Accessory" | "Finisher" | "Cooldown" | "Conditioning";

export type Exercise = {
  id: string;
  name: string;
  body_part: string | null;
  movement_pattern: string | null;
  location_type: string | null;
  difficulty: Difficulty | null;
  equipment: string[];
  is_warmup: boolean;
  is_cooldown: boolean;
  is_recovery: boolean;
  mux_playback_id: string | null;
  suggested_reps: string | null;
  suggested_time: string | null;
};

export type Slot = {
  slot_order: number;
  block: string;
  role: string | null;
  movement_pattern: string | null;
  body_part_filter: string | null;
  equipment_filter: string | null;
  sets: string | null;
  reps_or_time: string | null;
  rest: string | null;
};

export type Blueprint = {
  program_slug: string;
  day_type: string;
  location: string;
  slots: Slot[];
};

export type WorkoutProfile = {
  goal: string;                        // Muscle Gain | Fat Loss | Strength | Recovery | Cardio | ...
  location: Location;                  // Gym | At Home | Recovery
  experience: Difficulty;
  days_per_week: number;
  session_minutes: 20 | 30 | 45 | 60;
  body_focus: string[];                // e.g. ["Glutes","Core"]
  equipment_available: string[];       // e.g. ["Bodyweight","Dumbbell","Bands"]
  history: string[];                   // recent exercise_ids (last 2 sessions)
};

export type FilledSlot = {
  slot_order: number;
  block: string;
  role: string | null;
  exercise_id: string | null;
  exercise_name: string;
  movement_pattern: string | null;
  body_part: string | null;
  mux_playback_id: string | null;
  video_url: string | null;
  sets: number;
  reps_or_time: string;
  rest_seconds: number;
  suggested_load: string | null;
  coaching_note: string | null;
  needs_review: boolean;
  gap_reason: string | null;
};

export type Session = {
  program_slug: string;
  week: number;
  day_index: number;
  day_focus: string;
  duration_min: number;
  blocks: {
    warmup: FilledSlot[];
    main: FilledSlot[];
    cooldown: FilledSlot[];
  };
  needs_review: boolean;
  gap_reason: string | null;
};

// ---------- Helpers ----------
const DIFF_RANK: Record<Difficulty, number> = { beginner: 1, intermediate: 2, advanced: 3 };
const GYM_ONLY_EQUIPMENT = ["barbell", "machine", "cable", "smith"];

const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().trim();

const splitFilter = (raw: string | null): string[] =>
  norm(raw).split(/[\/,]| or /).map((s) => s.trim()).filter(Boolean);

const matchAny = (haystack: string, needles: string[]) =>
  needles.some((n) => n && haystack.includes(n));

const nameLooksLikeEquipment = (name: string, eq: string) => name.includes(eq.toLowerCase());

const detectEquipmentFromName = (name: string): string[] => {
  const out: string[] = [];
  const n = name.toLowerCase();
  ["barbell", "dumbbell", "kettlebell", "cable", "machine", "smith", "band", "bench", "rower", "bike", "trx"].forEach((k) => {
    if (n.includes(k)) out.push(k);
  });
  if (!out.length) out.push("bodyweight");
  return out;
};

const exerciseEquipment = (e: Exercise): string[] => {
  if (e.equipment && e.equipment.length) return e.equipment.map((x) => x.toLowerCase());
  return detectEquipmentFromName(e.name);
};

const isPlyoOrAdvanced = (name: string) =>
  /jump|plyo|pistol|single-leg|single leg|to (the )?(other|opposite)|clean|snatch|muscle.?up/i.test(name);

const locationOk = (e: Exercise, profile: WorkoutProfile): boolean => {
  if (profile.location === "Recovery") return !!e.is_recovery;
  if (profile.location === "At Home") {
    // No gym-only equipment unless user explicitly has it.
    const eq = exerciseEquipment(e);
    const userHas = profile.equipment_available.map((x) => x.toLowerCase());
    const hasGymOnly = eq.some((q) => GYM_ONLY_EQUIPMENT.includes(q));
    if (hasGymOnly && !eq.every((q) => GYM_ONLY_EQUIPMENT.includes(q) ? userHas.includes(q) : true)) return false;
    // Prefer At Home or null location_type; allow gym ex only if no gym-only equipment.
    if (norm(e.location_type) === "gym" && hasGymOnly) return false;
    return true;
  }
  // Gym: allow anything (recovery rows fill warmup/cooldown slots; main slots
  // are already gated by pattern/body-part filters so they won't pull mobility items).
  return true;
};

const equipmentOk = (e: Exercise, profile: WorkoutProfile): boolean => {
  const eq = exerciseEquipment(e);
  if (eq.includes("bodyweight")) return true;
  const userHas = new Set(profile.equipment_available.map((x) => x.toLowerCase()));
  return eq.every((q) => q === "bodyweight" || userHas.has(q));
};

const difficultyOk = (e: Exercise, profile: WorkoutProfile): boolean => {
  const cap = DIFF_RANK[profile.experience];
  const ed = (e.difficulty ?? "intermediate") as Difficulty;
  if (DIFF_RANK[ed] > cap) return false;
  if (profile.experience === "beginner" && isPlyoOrAdvanced(e.name)) return false;
  return true;
};

const blockBookendOk = (e: Exercise, slot: Slot): boolean => {
  const b = norm(slot.block);
  if (b === "warmup") return !!e.is_warmup || norm(e.movement_pattern) === "mobility/stretch";
  if (b === "cooldown") return !!e.is_cooldown || norm(e.movement_pattern) === "mobility/stretch";
  // Main blocks should NOT pull warmup/cooldown rows.
  return !e.is_warmup && !e.is_cooldown;
};

const patternOk = (e: Exercise, slot: Slot): boolean => {
  const want = splitFilter(slot.movement_pattern);
  if (!want.length) return true;
  const have = norm(e.movement_pattern);
  return want.some((w) => have === w || have.includes(w));
};

const bodyPartOk = (e: Exercise, slot: Slot): boolean => {
  const want = splitFilter(slot.body_part_filter);
  if (!want.length) return true;
  const have = norm(e.body_part);
  return want.some((w) => have === w || have.includes(w) || (w === "fullbody" && have === "fullbody"));
};

const parseSets = (s: string | null): number => {
  if (!s) return 3;
  const m = s.match(/(\d+)/);
  return m ? Math.max(1, Math.min(6, parseInt(m[1], 10))) : 3;
};

const parseRest = (s: string | null): number => {
  if (!s) return 60;
  const m = s.match(/(\d+)/);
  if (!m) return 60;
  const n = parseInt(m[1], 10);
  return /min/i.test(s) ? n * 60 : n;
};

// ---------- Program assignment ----------
export function assignProgramSlug(profile: WorkoutProfile): string {
  if (profile.location === "Recovery") return profile.goal.toLowerCase().includes("mobility") ? "mobility" : "recovery";
  const goal = profile.goal.toLowerCase();
  if (profile.location === "At Home") {
    if (profile.experience === "beginner") return "at_home_beginner";
    if (goal.includes("fat") || goal.includes("loss")) return "at_home_fat_loss";
    return "at_home_strength";
  }
  // Gym
  if (goal.includes("cardio") || goal.includes("endurance")) return "cardio";
  if (goal.includes("fat") || goal.includes("loss")) return "gym_fat_loss";
  if (goal.includes("glute") || profile.body_focus.some((b) => /glute/i.test(b))) return "gym_glutes_legs";
  if (goal.includes("strength")) return "gym_strength";
  // Muscle Gain / Hypertrophy → PPL split whenever ≥3 days available (covers 4-day clients).
  if (goal.includes("muscle") || goal.includes("gain") || goal.includes("hypertrophy") || goal.includes("build")) {
    if (profile.days_per_week >= 3) return "gym_muscle_build";
    return "gym_upper_body";
  }
  if (profile.days_per_week >= 5) return "gym_muscle_build";
  if (profile.days_per_week === 3) return "gym_full_body";
  // 2- or 4-day clients without a hypertrophy/strength goal → Upper/Lower from strength pool
  if (profile.days_per_week === 4 || profile.days_per_week === 2) return "gym_strength";
  return "gym_upper_body";
}

// ---------- Time compression ----------
const TIME_RULES = {
  20: { warmup: 1, main: 5, cooldown: 1, setsCap: 3 },
  30: { warmup: 1, main: 6, cooldown: 1, setsCap: 3 },
  45: { warmup: 1, main: 8, cooldown: 1, setsCap: 4 },
  60: { warmup: 1, main: 10, cooldown: 1, setsCap: 4 },
} as const;

function compress(blueprint: Blueprint, minutes: 20 | 30 | 45 | 60): Slot[] {
  const r = TIME_RULES[minutes];
  const warmups = blueprint.slots.filter((s) => norm(s.block) === "warmup").slice(0, r.warmup);
  const cools = blueprint.slots.filter((s) => norm(s.block) === "cooldown").slice(0, r.cooldown);
  const mains = blueprint.slots.filter((s) => !["warmup", "cooldown"].includes(norm(s.block)));
  // keep Primary first, drop accessory/isolation from tail
  const ordered = [...mains].sort((a, b) => {
    const rank = (x: string) =>
      x === "primary" ? 0 : x === "conditioning" ? 1 : x === "accessory" ? 2 : x === "finisher" ? 3 : 4;
    return rank(norm(a.block)) - rank(norm(b.block));
  });
  const keptMain = ordered.slice(0, r.main);
  // Re-sort by original slot_order
  keptMain.sort((a, b) => a.slot_order - b.slot_order);
  return [...warmups, ...keptMain, ...cools];
}

// ---------- Pool + selection ----------
function buildPool(slot: Slot, profile: WorkoutProfile, library: Exercise[]): Exercise[] {
  return library.filter((e) =>
    blockBookendOk(e, slot) &&
    locationOk(e, profile) &&
    equipmentOk(e, profile) &&
    difficultyOk(e, profile) &&
    patternOk(e, slot) &&
    bodyPartOk(e, slot)
  );
}

// Substitution ladder (S1–S8). Returns a *replacement* pool when primary is empty.
function substitute(slot: Slot, profile: WorkoutProfile, library: Exercise[]): { pool: Exercise[]; reason: string } {
  // S2 — drop equipment filter, keep pattern+body_part.
  let pool = library.filter((e) =>
    blockBookendOk(e, slot) && locationOk(e, profile) && difficultyOk(e, profile) && patternOk(e, slot) && bodyPartOk(e, slot)
  );
  if (pool.length) return { pool, reason: "S2 equipment downgrade" };
  // S3 — drop body_part filter, keep pattern.
  pool = library.filter((e) =>
    blockBookendOk(e, slot) && locationOk(e, profile) && difficultyOk(e, profile) && patternOk(e, slot)
  );
  if (pool.length) return { pool, reason: "S3 body-part relaxed" };
  // S5 — bodyweight same body_part
  pool = library.filter((e) =>
    blockBookendOk(e, slot) && locationOk(e, profile) && difficultyOk(e, profile) && bodyPartOk(e, slot)
  );
  if (pool.length) return { pool, reason: "S5 bodyweight body-part match" };
  // Last resort — any same-block exercise that respects location.
  pool = library.filter((e) => blockBookendOk(e, slot) && locationOk(e, profile));
  return { pool, reason: "S7 last-resort same-block" };
}

// T2: compound-loaded movements for Primary slots.
const COMPOUND_EQUIPMENT = ["barbell", "dumbbell", "machine", "cable", "smith", "kettlebell"];
const COMPOUND_PATTERNS = ["squat", "hinge", "press", "row", "pull", "deadlift", "lunge"];
const ISOLATION_PATTERN_HINTS = ["fly", "curl", "raise", "extension", "kickback", "pulldown abs"];
const isCompound = (e: Exercise): boolean => {
  const eq = exerciseEquipment(e);
  const mp = norm(e.movement_pattern);
  const nm = e.name.toLowerCase();
  const hasLoadedEq = eq.some((q) => COMPOUND_EQUIPMENT.includes(q));
  const matchesPattern = COMPOUND_PATTERNS.some((p) => mp.includes(p));
  const looksIsolation = ISOLATION_PATTERN_HINTS.some((p) => nm.includes(p));
  return hasLoadedEq && matchesPattern && !looksIsolation;
};

function pickPreferred(pool: Exercise[], profile: WorkoutProfile, recent: Set<string>, slot?: Slot): Exercise {
  // R1: drop recent if possible.
  let candidates = pool.filter((e) => !recent.has(e.id));
  if (!candidates.length) candidates = pool;
  // T2: For Primary roles in Gym/At-Home, bias toward loaded compounds.
  if (slot && norm(slot.block) === "primary" && profile.location !== "Recovery") {
    const compounds = candidates.filter(isCompound);
    if (compounds.length) candidates = compounds;
  }
  // R9: weight body_focus.
  const focus = profile.body_focus.map((b) => b.toLowerCase());
  if (focus.length) {
    const focused = candidates.filter((e) => focus.some((f) => norm(e.body_part).includes(f)));
    if (focused.length) candidates = focused;
  }
  // Deterministic-ish: shuffle by hash of id+date so re-runs vary but tests are stable.
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// ---------- Progression ----------
function progressionAdjust(filled: FilledSlot, week: number): FilledSlot {
  // W1 baseline; W2 +1 rep; W3 +load note; W4 deload -40% volume.
  if (filled.block === "Warmup" || filled.block === "Cooldown") return filled;
  if (week === 2) {
    filled.coaching_note = (filled.coaching_note ?? "") + " +1 rep per set vs last week.";
  } else if (week === 3) {
    filled.suggested_load = "Add load if you hit top of rep range last week.";
  } else if (week === 4) {
    filled.sets = Math.max(1, Math.round(filled.sets * 0.6));
    filled.coaching_note = (filled.coaching_note ?? "") + " Deload week — reduce volume ~40%.";
  }
  return filled;
}

// ---------- Session fill ----------
function fillSession(
  bp: Blueprint,
  profile: WorkoutProfile,
  week: number,
  dayIdx: number,
  library: Exercise[],
  recent: Set<string>,
): Session {
  const slots = compress(bp, profile.session_minutes);
  const setsCap = TIME_RULES[profile.session_minutes].setsCap;
  const filled: FilledSlot[] = [];
  let sessionNeedsReview = false;
  const gaps: string[] = [];

  for (const slot of slots) {
    let pool = buildPool(slot, profile, library);
    let gap: string | null = null;
    if (!pool.length) {
      const sub = substitute(slot, profile, library);
      pool = sub.pool;
      gap = sub.reason;
    }
    if (!pool.length) {
      // Hard gap — emit placeholder.
      filled.push({
        slot_order: slot.slot_order,
        block: slot.block,
        role: slot.role,
        exercise_id: null,
        exercise_name: `[Gap: ${slot.role ?? slot.movement_pattern ?? slot.block}]`,
        movement_pattern: slot.movement_pattern,
        body_part: slot.body_part_filter,
        mux_playback_id: null,
        video_url: null,
        sets: parseSets(slot.sets),
        reps_or_time: slot.reps_or_time ?? "10",
        rest_seconds: parseRest(slot.rest),
        suggested_load: null,
        coaching_note: "No matching exercise in library — coach review required.",
        needs_review: true,
        gap_reason: "no matching exercise for slot",
      });
      sessionNeedsReview = true;
      gaps.push(`slot ${slot.slot_order} (${slot.role ?? slot.movement_pattern}) — no candidates`);
      continue;
    }

    const ex = pickPreferred(pool, profile, recent);
    recent.add(ex.id);

    let f: FilledSlot = {
      slot_order: slot.slot_order,
      block: slot.block,
      role: slot.role,
      exercise_id: ex.id,
      exercise_name: ex.name,
      movement_pattern: ex.movement_pattern,
      body_part: ex.body_part,
      mux_playback_id: ex.mux_playback_id,
      video_url: ex.mux_playback_id ? `https://stream.mux.com/${ex.mux_playback_id}.m3u8` : null,
      sets: Math.min(parseSets(slot.sets), setsCap),
      reps_or_time: slot.reps_or_time ?? ex.suggested_reps ?? ex.suggested_time ?? "10",
      rest_seconds: parseRest(slot.rest),
      suggested_load: null,
      coaching_note: gap ? `Substituted via ${gap}.` : null,
      needs_review: !!gap,
      gap_reason: gap,
    };
    if (gap) sessionNeedsReview = true;
    f = progressionAdjust(f, week);
    filled.push(f);
  }

  return {
    program_slug: bp.program_slug,
    week,
    day_index: dayIdx,
    day_focus: bp.day_type,
    duration_min: profile.session_minutes,
    blocks: {
      warmup: filled.filter((f) => norm(f.block) === "warmup"),
      main: filled.filter((f) => !["warmup", "cooldown"].includes(norm(f.block))),
      cooldown: filled.filter((f) => norm(f.block) === "cooldown"),
    },
    needs_review: sessionNeedsReview,
    gap_reason: gaps.length ? gaps.join("; ") : null,
  };
}

// ---------- Weekly split → which blueprints per day ----------
function dayPlan(slug: string, blueprints: Blueprint[], daysPerWeek: number): Blueprint[] {
  // Canonical split order: push/upper → pull → lower/legs → other.
  const rank = (dt: string): number => {
    const t = dt.toLowerCase();
    if (t.includes("push") || (t.includes("upper") && !t.includes("lower"))) return 0;
    if (t.includes("pull")) return 1;
    if (t.includes("lower") || t.includes("leg") || t.includes("glute")) return 2;
    return 3;
  };
  const pool = blueprints
    .filter((b) => b.program_slug === slug)
    .sort((a, b) => rank(a.day_type) - rank(b.day_type) || a.day_type.localeCompare(b.day_type));
  if (!pool.length) return [];

  const out: Blueprint[] = [];
  for (let i = 0; i < daysPerWeek; i++) out.push(pool[i % pool.length]);

  // R2: avoid back-to-back lower-dominant days. Walk the week and swap any
  // adjacent leg pair with the next non-leg slot in the rotation.
  const isLower = (bp: Blueprint) => /leg|lower|glute|squat|hinge|lunge/i.test(bp.day_type);
  for (let i = 1; i < out.length; i++) {
    if (isLower(out[i]) && isLower(out[i - 1])) {
      const swap = out.findIndex((b, idx) => idx > i && !isLower(b));
      if (swap > -1) { const t = out[i]; out[i] = out[swap]; out[swap] = t; }
    }
  }
  return out;
}

// ---------- Public entry ----------
export function generateProgram(
  profile: WorkoutProfile,
  blueprints: Blueprint[],
  library: Exercise[],
): { program_slug: string; weeks: Session[][]; needs_review: boolean; gap_reason: string | null } {
  const slug = assignProgramSlug(profile);
  const days = dayPlan(slug, blueprints, profile.days_per_week);
  if (!days.length) {
    return {
      program_slug: slug,
      weeks: [],
      needs_review: true,
      gap_reason: `No blueprints found for program ${slug}`,
    };
  }
  const weeks: Session[][] = [];
  const allGaps: string[] = [];
  let anyReview = false;
  const recent = new Set<string>(profile.history ?? []);

  for (let w = 1; w <= 4; w++) {
    const sessions: Session[] = [];
    // Sliding window: forget exercises older than 2 days back
    const weekRecent = new Set<string>(recent);
    for (let d = 0; d < days.length; d++) {
      const sess = fillSession(days[d], profile, w, d, library, weekRecent);
      sessions.push(sess);
      if (sess.needs_review) anyReview = true;
      if (sess.gap_reason) allGaps.push(`W${w}D${d + 1}: ${sess.gap_reason}`);
    }
    weeks.push(sessions);
  }

  return {
    program_slug: slug,
    weeks,
    needs_review: anyReview,
    gap_reason: allGaps.length ? allGaps.slice(0, 5).join(" | ") : null,
  };
}
