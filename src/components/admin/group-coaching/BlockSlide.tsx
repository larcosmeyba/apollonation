import { Timer, Repeat } from "lucide-react";
import type { SlideExercise } from "./types";
import apolloLogo from "@/assets/apollo-logo.png";

interface BlockSlideProps {
  blockLabel: string;
  exercises: SlideExercise[];
  slideNumber: number;
  totalSlides: number;
}

const BlockSlide = ({ blockLabel, exercises, slideNumber, totalSlides }: BlockSlideProps) => {
  const isSingle = exercises.length === 1;

  return (
    <div className="relative w-full h-full flex flex-col bg-background overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-10"
        style={{ backgroundImage: `url(/images/marble-bg.jpeg)` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background/90" />

      {/* Logo */}
      <img src={apolloLogo} alt="Apollo Nation" className="absolute top-6 right-6 w-10 h-10 opacity-60 object-contain z-20" />

      {/* Slide counter */}
      <div className="absolute top-6 left-6 text-xs tracking-[0.2em] text-muted-foreground z-20">
        {slideNumber} / {totalSlides}
      </div>

      {/* Block header */}
      <div className="relative z-10 pt-16 pb-4 px-12 text-center">
        <p className="text-xs tracking-[0.3em] text-muted-foreground uppercase mb-1">Workout</p>
        <h2 className="font-heading text-2xl md:text-3xl tracking-[0.15em] text-foreground uppercase">
          {blockLabel}
        </h2>
        <div className="w-12 h-px bg-foreground/30 mx-auto mt-3" />
      </div>

      {/* Exercises grid */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-8 pb-20">
        <div className={`grid gap-6 w-full max-w-5xl ${
          isSingle ? "grid-cols-1 max-w-2xl" :
          exercises.length === 2 ? "grid-cols-2" :
          exercises.length === 3 ? "grid-cols-3" :
          "grid-cols-2 lg:grid-cols-4"
        }`}>
          {exercises.map((exercise, i) => (
            <div
              key={i}
              className="flex flex-col rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden"
            >
              {/* Media */}
              {(exercise.video_url || exercise.thumbnail_url) && (
                <div className="aspect-video w-full overflow-hidden bg-muted">
                  {exercise.video_url ? (
                    <video
                      src={exercise.video_url}
                      className="w-full h-full object-cover"
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={exercise.thumbnail_url!}
                      alt={exercise.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              )}

              {/* Info */}
              <div className="p-4 flex-1 flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-foreground/10 flex items-center justify-center text-xs font-medium text-foreground">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <h3 className="font-heading text-sm md:text-base tracking-wider text-foreground uppercase leading-tight">
                    {exercise.name}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-auto">
                  {exercise.sets && (
                    <div className="flex items-center gap-1">
                      <Repeat className="w-3 h-3" />
                      <span>{exercise.sets} sets</span>
                    </div>
                  )}
                  {exercise.reps && (
                    <span className="font-medium text-foreground/70">{exercise.reps} reps</span>
                  )}
                  {exercise.rest_seconds && (
                    <div className="flex items-center gap-1">
                      <Timer className="w-3 h-3" />
                      <span>{exercise.rest_seconds}s</span>
                    </div>
                  )}
                </div>

                {exercise.notes && (
                  <p className="text-[11px] text-muted-foreground italic mt-1">"{exercise.notes}"</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BlockSlide;
