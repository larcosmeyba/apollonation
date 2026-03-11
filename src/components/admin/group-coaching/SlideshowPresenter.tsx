import { useState, useCallback, useEffect } from "react";
import type { ClassType, SlideExercise } from "./types";
import WelcomeSlide from "./WelcomeSlide";
import ExerciseSlide from "./ExerciseSlide";
import CoachControlPanel from "./CoachControlPanel";

interface SlideshowPresenterProps {
  classType: ClassType;
  exercises: SlideExercise[];
  onExit: () => void;
}

const SlideshowPresenter = ({ classType, exercises, onExit }: SlideshowPresenterProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [equipment, setEquipment] = useState<string[]>(["Dumbbells", "Yoga Mat"]);

  const totalSlides = 1 + exercises.length; // welcome + exercises

  const goNext = useCallback(() => {
    setCurrentSlide((s) => Math.min(s + 1, totalSlides - 1));
  }, [totalSlides]);

  const goPrev = useCallback(() => {
    setCurrentSlide((s) => Math.max(s - 1, 0));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "Escape") {
        onExit();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, onExit]);

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="w-full h-full">
        {currentSlide === 0 ? (
          <WelcomeSlide
            classType={classType}
            equipment={equipment}
            onEquipmentChange={setEquipment}
            isEditing={true}
          />
        ) : (
          <ExerciseSlide
            exercise={exercises[currentSlide - 1]}
            slideNumber={currentSlide}
            totalSlides={exercises.length}
          />
        )}
      </div>

      <CoachControlPanel
        currentSlide={currentSlide}
        totalSlides={totalSlides}
        isPaused={isPaused}
        onPrev={goPrev}
        onNext={goNext}
        onTogglePause={() => setIsPaused((p) => !p)}
        onExit={onExit}
      />

      {/* Pause overlay */}
      {isPaused && (
        <div className="absolute inset-0 z-40 bg-background/60 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="text-center space-y-2">
            <p className="font-heading text-2xl tracking-[0.2em] text-foreground">PAUSED</p>
            <p className="text-xs text-muted-foreground">Press play or spacebar to continue</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SlideshowPresenter;
