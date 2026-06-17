// 7-Day Recovery Reset — deterministic curation built from admin_exercises
// rows where is_recovery=true AND mux_playback_id IS NOT NULL.
// Each day's exercise list is resolved at runtime by name keyword match
// against the live mux-only recovery pool, so it always plays an in-house
// video — no outsourced clips.

export type RecoveryDay = {
  day: number;
  title: string;
  subtitle: string;
  /** Target minutes — informational, not used to gate playback. */
  durationMinutes: number;
  /** Keywords matched (case-insensitive substring) against exercise name. */
  include: string[];
  /** Keywords that disqualify an exercise. */
  exclude?: string[];
  /** Cap on how many exercises to surface (post de-dupe). */
  cap: number;
};

export const RECOVERY_PROGRAM: RecoveryDay[] = [
  {
    day: 2,
    title: "Hip & Lower Back Mobility",
    subtitle: "Open the hips, decompress the lumbar spine.",
    durationMinutes: 15,
    include: ["hip", "pigeon", "low back", "lumbar", "childs pose", "happy baby", "figure four", "90 90"],
    cap: 6,
  },
  {
    day: 3,
    title: "Upper Back & Shoulder Openers",
    subtitle: "Thoracic rotations, scap CARs, lat decompression.",
    durationMinutes: 12,
    include: ["thoracic", "shoulder", "scap", "lat stretch", "chest opener", "thread the needle"],
    cap: 6,
  },
  {
    day: 4,
    title: "Deep Stretch — Hamstrings & Calves",
    subtitle: "Long holds for the posterior chain.",
    durationMinutes: 20,
    include: ["hamstring", "calf", "downward dog", "runners lunge", "good morning"],
    cap: 6,
  },
  {
    day: 5,
    title: "Thoracic & Chest Mobility",
    subtitle: "Undo the desk posture. Open the front line.",
    durationMinutes: 12,
    include: ["chest", "pec", "thoracic", "cat", "cow", "cobra", "sphinx"],
    cap: 6,
  },
  {
    day: 6,
    title: "Glute & Hip Activation Flow",
    subtitle: "Wake the glutes — light, intentional reps.",
    durationMinutes: 15,
    include: ["glute", "bridge", "clam", "abduction", "monster walk", "band"],
    exclude: ["barbell", "dumbbell"],
    cap: 6,
  },
  {
    day: 7,
    title: "Full-Body Wind-Down",
    subtitle: "Long stretches, slow breath. Close the week.",
    durationMinutes: 20,
    include: ["stretch", "worlds greatest", "90 90", "butterfly", "pigeon", "childs pose", "neck"],
    cap: 7,
  },
];
