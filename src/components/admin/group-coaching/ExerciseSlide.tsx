import { Timer, Repeat } from "lucide-react";
import type { SlideExercise } from "./types";
import apolloLogo from "@/assets/apollo-logo-sm.png";

interface ExerciseSlideProps {
  exercise: SlideExercise;
  slideNumber: number;
  totalSlides: number;
}

const ExerciseSlide = ({ exercise, slideNumber, totalSlides }: ExerciseSlideProps) => {
  const hasMedia = exercise.thumbnail_url || exercise.video_url;

  return (
    <div className="relative w-full h-full flex bg-background overflow-hidden">
      {/* Background — coach photo with heavy overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(/images/marble-bg.jpeg)` }}
      />
      <div className="absolute inset-0 bg-background/70" />

      {/* Apollo logo */}
      <img src={apolloLogo} alt="Apollo" className="absolute top-6 right-6 w-10 h-10 opacity-80 object-contain z-20 invert" />

      {/* Slide counter */}
      <div className="absolute top-6 left-6 text-xs tracking-[0.2em] text-muted-foreground z-20">
        {slideNumber} / {totalSlides}
      </div>

      {/* Main content — split layout */}
      <div className="relative z-10 flex w-full h-full items-center">
        {/* Left: exercise info */}
        <div className="flex-1 flex flex-col justify-center px-12 md:px-16 gap-6">
          <div className="space-y-2">
            <h2 className="font-heading text-3xl md:text-4xl tracking-[0.1em] text-foreground uppercase leading-tight">
              {exercise.name}
            </h2>
            <div className="w-12 h-px bg-foreground/30" />
          </div>

          <div className="flex flex-wrap items-center gap-6 text-lg">
            {exercise.sets && (
              <div className="flex items-center gap-2">
                <Repeat className="w-5 h-5 text-muted-foreground" />
                <span className="text-foreground font-medium">{exercise.sets} sets</span>
              </div>
            )}
            {exercise.reps && (
              <div className="flex items-center gap-2">
                <span className="text-foreground font-heading text-xl">#</span>
                <span className="text-foreground font-medium">{exercise.reps} reps</span>
              </div>
            )}
            {exercise.rest_seconds && (
              <div className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-muted-foreground" />
                <span className="text-foreground font-medium">{exercise.rest_seconds}s rest</span>
              </div>
            )}
          </div>

          {exercise.notes && (
            <p className="text-sm text-muted-foreground max-w-md">{exercise.notes}</p>
          )}
        </div>

        {/* Right: media */}
        {hasMedia && (
          <div className="hidden md:flex flex-1 items-center justify-center p-8">
            <div className="w-full max-w-md aspect-square rounded-2xl overflow-hidden border border-border/50 shadow-lg">
              {exercise.video_url ? (
                <video
                  src={exercise.video_url}
                  className="w-full h-full object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : exercise.thumbnail_url ? (
                <img
                  src={exercise.thumbnail_url}
                  alt={exercise.name}
                  className="w-full h-full object-cover"
                />
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExerciseSlide;
