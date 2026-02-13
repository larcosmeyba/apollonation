import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Play } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const getYouTubeEmbedUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    let videoId: string | null = null;
    if (parsed.hostname.includes("youtube.com")) {
      videoId = parsed.searchParams.get("v");
    } else if (parsed.hostname === "youtu.be") {
      videoId = parsed.pathname.slice(1);
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : null;
  } catch {
    return null;
  }
};

interface ExerciseVideoButtonProps {
  exerciseName: string;
}

const ExerciseVideoButton = ({ exerciseName }: ExerciseVideoButtonProps) => {
  const [open, setOpen] = useState(false);

  const { data: exercise } = useQuery({
    queryKey: ["exercise-video", exerciseName],
    queryFn: async () => {
      const { data } = await supabase
        .from("exercises")
        .select("title, video_url, description")
        .ilike("title", exerciseName)
        .maybeSingle();
      return data;
    },
    staleTime: 1000 * 60 * 30,
  });

  if (!exercise?.video_url) return null;

  const embedUrl = getYouTubeEmbedUrl(exercise.video_url);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex-shrink-0 w-7 h-7 rounded-full bg-apollo-gold/10 hover:bg-apollo-gold/20 flex items-center justify-center transition-colors"
        title={`Watch: ${exerciseName}`}
      >
        <Play className="w-3 h-3 text-apollo-gold ml-0.5" fill="currentColor" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="text-base">{exercise.title}</DialogTitle>
            {exercise.description && (
              <p className="text-xs text-muted-foreground mt-1">{exercise.description}</p>
            )}
          </DialogHeader>
          <div className="aspect-video w-full">
            {embedUrl ? (
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title={exercise.title}
              />
            ) : (
              <video src={exercise.video_url} controls autoPlay className="w-full h-full" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ExerciseVideoButton;
