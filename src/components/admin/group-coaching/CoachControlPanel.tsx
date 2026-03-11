import { ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CoachControlPanelProps {
  currentSlide: number;
  totalSlides: number;
  isPaused: boolean;
  onPrev: () => void;
  onNext: () => void;
  onTogglePause: () => void;
  onExit: () => void;
}

const CoachControlPanel = ({
  currentSlide,
  totalSlides,
  isPaused,
  onPrev,
  onNext,
  onTogglePause,
  onExit,
}: CoachControlPanelProps) => {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-50">
      <div className="flex items-center justify-center gap-3 p-4 bg-gradient-to-t from-background/95 to-transparent pt-12">
        <Button
          variant="outline"
          size="icon"
          disabled={currentSlide === 0}
          onClick={onPrev}
          className="h-12 w-12 rounded-full border-border/50 bg-card/80 backdrop-blur-sm"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={onTogglePause}
          className="h-12 w-12 rounded-full border-border/50 bg-card/80 backdrop-blur-sm"
        >
          {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
        </Button>

        <Button
          variant="outline"
          size="icon"
          disabled={currentSlide >= totalSlides - 1}
          onClick={onNext}
          className="h-12 w-12 rounded-full border-border/50 bg-card/80 backdrop-blur-sm"
        >
          <ChevronRight className="w-6 h-6" />
        </Button>

        <div className="ml-4 px-3 py-1.5 rounded-full bg-card/80 backdrop-blur-sm border border-border/50 text-xs text-muted-foreground tracking-wider">
          {currentSlide + 1} / {totalSlides}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onExit}
          className="ml-2 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4 mr-1" /> Exit
        </Button>
      </div>
    </div>
  );
};

export default CoachControlPanel;
