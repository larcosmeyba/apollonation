export type Orientation = "horizontal" | "vertical";
export type Difficulty = "beginner" | "intermediate" | "advanced";
export type ExerciseCategory =
  | "strength"
  | "sculpt"
  | "stretch"
  | "cardio"
  | "hiit"
  | "recovery"
  | "cycling"
  | "beginner";

export interface AdminExercise {
  id: string;
  name: string;
  mux_playback_id: string | null;
  thumbnail_url: string | null;
  orientation: Orientation;
  muscle_group: string | null;
  equipment: string[];
  difficulty: Difficulty;
  movement_type: string | null;
  alternative_exercise_id: string | null;
  coaching_notes: string | null;
  weight_recommendation: string | null;
  tempo_recommendation: string | null;
  contraindications: string | null;
  loop_in_seconds: number | null;
  loop_out_seconds: number | null;
  tags: string[];
  category: ExerciseCategory | null;
  duration_seconds: number | null;
  body_part: string | null;
  video_object_position?: string | null;
}

export const EXERCISE_CATEGORIES: ExerciseCategory[] = [
  "strength",
  "sculpt",
  "stretch",
  "cardio",
  "hiit",
  "recovery",
  "cycling",
  "beginner",
];

export const MUSCLE_GROUPS = [
  "chest", "back", "shoulders", "arms", "legs", "glutes", "core", "full-body", "cardio",
] as const;

export const EQUIPMENT_OPTIONS = [
  "bodyweight", "dumbbells", "barbell", "kettlebell", "bands", "bench", "mat", "bike", "rower", "machine",
] as const;

export const MOVEMENT_TYPES = [
  "push", "pull", "squat", "hinge", "carry", "rotation", "lunge", "isometric", "plyometric", "cardio",
] as const;

export const muxThumb = (id: string | null | undefined) =>
  id ? `https://image.mux.com/${id}/thumbnail.jpg?width=640&height=360&fit_mode=smartcrop` : "";

export const muxHls = (id: string | null | undefined) =>
  id ? `https://stream.mux.com/${id}.m3u8` : "";

export const muxMp4 = (id: string | null | undefined) =>
  id ? `https://stream.mux.com/${id}/medium.mp4` : "";
