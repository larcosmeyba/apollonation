import { useEffect } from "react";
import confetti from "canvas-confetti";
import { Trophy, Share2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { generateShareImage, shareImage } from "@/lib/shareCard";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  achievements: { id: string; title: string }[];
  onClose: () => void;
}

const AchievementUnlockModal = ({ open, achievements, onClose }: Props) => {
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    const duration = 2500;
    const end = Date.now() + duration;
    const interval = setInterval(() => {
      if (Date.now() > end) return clearInterval(interval);
      confetti({
        particleCount: 40,
        spread: 70,
        origin: { x: Math.random(), y: 0.3 },
        colors: ["#ffffff", "#fbbf24", "#f59e0b"],
      });
    }, 250);
    return () => clearInterval(interval);
  }, [open]);

  if (achievements.length === 0) return null;
  const headline = achievements[0];

  const handleShare = async () => {
    try {
      const blob = await generateShareImage({
        title: "Achievement Unlocked",
        headline: headline.title,
        subline: achievements.length > 1 ? `+${achievements.length - 1} more` : "Apollo Reborn",
      });
      await shareImage(blob, `${headline.title}.png`);
    } catch (e) {
      toast({ title: "Couldn't share", description: "Try again from Profile." });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm text-center border-border">
        <div className="py-6 space-y-5">
          <div className="mx-auto w-24 h-24 rounded-full bg-primary/15 flex items-center justify-center animate-[bounce_1s_ease-in-out_2]">
            <Trophy className="w-12 h-12 text-primary" />
          </div>
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Achievement Unlocked</p>
            <h2 className="font-heading text-3xl tracking-wide">{headline.title}</h2>
            {achievements.length > 1 && (
              <p className="text-sm text-muted-foreground">+ {achievements.length - 1} more milestone{achievements.length - 1 > 1 ? "s" : ""}</p>
            )}
          </div>
          <div className="flex gap-3 justify-center px-4">
            <Button variant="apollo" className="flex-1" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" /> Share
            </Button>
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Continue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AchievementUnlockModal;
