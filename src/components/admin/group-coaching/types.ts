export type ClassType = "sculpt" | "strength" | "stretch";

export interface SlideExercise {
  name: string;
  thumbnail_url: string | null;
  video_url: string | null;
  sets: number | null;
  reps: string | null;
  rest_seconds: number | null;
  notes: string | null;
}

export interface SlideshowState {
  classType: ClassType;
  equipment: string[];
  currentSlide: number; // 0 = welcome, 1+ = exercises
  isPaused: boolean;
}
