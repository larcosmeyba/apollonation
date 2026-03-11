import { useState, useCallback, useEffect, useMemo } from "react";
import type { ClassType, SlideExercise, BlockData } from "./types";
import WelcomeSlide from "./WelcomeSlide";
import WarmUpSlide from "./WarmUpSlide";
import BlockSlide from "./BlockSlide";
import CoolDownSlide from "./CoolDownSlide";
import ExerciseSlide from "./ExerciseSlide";
import CoachControlPanel from "./CoachControlPanel";

interface SlideshowPresenterProps {
  classType: ClassType;
  exercises: SlideExercise[];
  blocks: BlockData[];
  initialEquipment?: string[];
  onExit: () => void;
}

const SlideshowPresenter = ({ classType, exercises, blocks, initialEquipment, onExit }: SlideshowPresenterProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [equipment, setEquipment] = useState<string[]>(initialEquipment || ["Dumbbells", "Yoga Mat"]);

  // Build slide sequence: Welcome, Warm-Up, Blocks (or individual exercises), Cool Down
  const slideSequence = useMemo(() => {
    const seq: { type: "welcome" | "warmup" | "block" | "exercise" | "cooldown"; data?: any }[] = [];
    seq.push({ type: "welcome" });
    seq.push({ type: "warmup" });

    if (blocks.length > 0) {
      blocks.forEach((block) => {
        seq.push({ type: "block", data: block });
      });
    } else {
      // Fallback: each exercise as its own slide
      exercises.forEach((ex, i) => {
        seq.push({ type: "exercise", data: { exercise: ex, index: i } });
      });
    }

    seq.push({ type: "cooldown" });
    return seq;
  }, [blocks, exercises]);

  const totalSlides = slideSequence.length;

  const goNext = useCallback(() => {
    setCurrentSlide((s) => Math.min(s + 1, totalSlides - 1));
  }, [totalSlides]);

  const goPrev = useCallback(() => {
    setCurrentSlide((s) => Math.max(s - 1, 0));
  }, []);

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

  const current = slideSequence[currentSlide];
  // Count only block/exercise slides for numbering
  const contentSlides = slideSequence.filter((s) => s.type === "block" || s.type === "exercise");
  const contentIndex = contentSlides.indexOf(current);

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="w-full h-full">
        {current.type === "welcome" && (
          <WelcomeSlide
            classType={classType}
            equipment={equipment}
            onEquipmentChange={setEquipment}
            isEditing={true}
          />
        )}
        {current.type === "warmup" && <WarmUpSlide />}
        {current.type === "block" && (
          <BlockSlide
            blockLabel={current.data.label}
            exercises={current.data.exercises}
            slideNumber={contentIndex + 1}
            totalSlides={contentSlides.length}
          />
        )}
        {current.type === "exercise" && (
          <ExerciseSlide
            exercise={current.data.exercise}
            slideNumber={contentIndex + 1}
            totalSlides={contentSlides.length}
          />
        )}
        {current.type === "cooldown" && <CoolDownSlide />}
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
