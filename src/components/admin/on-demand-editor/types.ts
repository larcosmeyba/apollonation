export interface ExerciseClip {
  id: string;
  name: string;
  videoUrl: string;
  thumbnailUrl?: string;
  durationSeconds: number; // actual clip length (10-15s)
}

export interface WorkoutBlock {
  id: string;
  type: "exercise" | "rest";
  exerciseClip?: ExerciseClip;
  durationSeconds: number; // how long this block plays (clip loops)
  label?: string; // e.g. "Push-ups", "Rest"
}

export interface WorkoutProject {
  id?: string;
  title: string;
  coachedBy: string;
  templateMinutes: number;
  blocks: WorkoutBlock[];
  musicTrack: MusicTrack | null;
  introEnabled: boolean;
  introDurationSeconds: number;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
  genre: string;
}

export const TEMPLATES: { label: string; minutes: number; exerciseSec: number; restSec: number; rounds: number }[] = [
  { label: "15 Min Express", minutes: 15, exerciseSec: 40, restSec: 15, rounds: 16 },
  { label: "30 Min Standard", minutes: 30, exerciseSec: 45, restSec: 15, rounds: 30 },
  { label: "45 Min Extended", minutes: 45, exerciseSec: 45, restSec: 15, rounds: 45 },
];

export const MUSIC_LIBRARY: MusicTrack[] = [
  {
    id: "1",
    title: "Drive Forward",
    artist: "Royalty Free",
    url: "https://cdn.pixabay.com/audio/2024/11/29/audio_37aaab3e2e.mp3",
    genre: "Motivational",
  },
  {
    id: "2",
    title: "Energy Boost",
    artist: "Royalty Free",
    url: "https://cdn.pixabay.com/audio/2024/10/17/audio_59e27c38ae.mp3",
    genre: "Electronic",
  },
  {
    id: "3",
    title: "Unstoppable",
    artist: "Royalty Free",
    url: "https://cdn.pixabay.com/audio/2023/10/18/audio_6986824208.mp3",
    genre: "Hip-Hop",
  },
  {
    id: "4",
    title: "Beast Mode",
    artist: "Royalty Free",
    url: "https://cdn.pixabay.com/audio/2024/09/10/audio_6e4e367e05.mp3",
    genre: "Intense",
  },
  {
    id: "5",
    title: "Chill Grind",
    artist: "Royalty Free",
    url: "https://cdn.pixabay.com/audio/2024/04/15/audio_88e8e38e37.mp3",
    genre: "Lo-Fi",
  },
];
