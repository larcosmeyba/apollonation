import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Music, Play } from "lucide-react";

interface Props {
  open: boolean;
  onCancel: () => void;
  onReady: () => void;
}

/**
 * Pre-workout music prompt. Shown before any on-demand class begins so users
 * know to launch their own music app (no licensed audio bundled in the app).
 */
const PreWorkoutMusicPrompt = ({ open, onCancel, onReady }: Props) => {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Music className="h-7 w-7" />
          </div>
          <DialogTitle className="text-center text-xl font-bold">Before you start</DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground pt-2 space-y-3">
            <span className="block">
              This workout doesn’t include built-in music. Open your favorite playlist on{" "}
              <span className="text-foreground font-semibold">Spotify</span>,{" "}
              <span className="text-foreground font-semibold">Apple Music</span>, or your preferred music app before pressing play.
            </span>
            <span className="block">
              Choose a playlist that matches your energy today, then come back here and start your workout.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex flex-col gap-2">
          <Button variant="apollo" size="lg" className="w-full gap-2" onClick={onReady}>
            <Play className="h-4 w-4 fill-current" />
            I’m Ready — Start Workout
          </Button>
          <Button variant="ghost" size="sm" className="w-full" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PreWorkoutMusicPrompt;
