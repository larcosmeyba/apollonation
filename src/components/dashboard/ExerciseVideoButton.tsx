import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Play, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const getYouTubeVideoId = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) {
      return parsed.searchParams.get("v");
    } else if (parsed.hostname === "youtu.be") {
      return parsed.pathname.slice(1);
    }
    return null;
  } catch {
    return null;
  }
};

const getYouTubeThumbnail = (url: string): string | null => {
  const videoId = getYouTubeVideoId(url);
  return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;
};

const getYouTubeEmbedUrl = (url: string): string | null => {
  const videoId = getYouTubeVideoId(url);
  return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0&showinfo=0&controls=1&iv_load_policy=3&disablekb=0&fs=1` : null;
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

  const isStorage = exercise.video_url.startsWith("storage:");
  const thumbnail = !isStorage ? getYouTubeThumbnail(exercise.video_url) : null;
  const embedUrl = !isStorage ? getYouTubeEmbedUrl(exercise.video_url) : null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden group border border-border/50 hover:border-primary/50 transition-colors"
        title={`Watch: ${exerciseName}`}
      >
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={exerciseName}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <Play className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <Play className="w-3 h-3 text-primary-foreground ml-0.5" fill="currentColor" />
          </div>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-black border-border/30">
          <DialogHeader className="p-4 pb-2 bg-background">
            <DialogTitle className="font-heading text-base tracking-wide">{exercise.title}</DialogTitle>
            {exercise.description && (
              <p className="text-xs text-muted-foreground mt-1">{exercise.description}</p>
            )}
          </DialogHeader>
          <div className="aspect-video w-full bg-black">
            {open && isStorage ? (
              <StorageVideoPlayer storagePath={exercise.video_url.replace("storage:", "")} />
            ) : embedUrl && open ? (
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
                title={exercise.title}
                style={{ border: 0 }}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

/** Plays a video from private storage using a signed URL */
const StorageVideoPlayer = ({ storagePath }: { storagePath: string }) => {
  const [bucket, ...pathParts] = storagePath.split("/");
  const filePath = pathParts.join("/");

  const { data: signedUrl, isLoading } = useQuery({
    queryKey: ["signed-video", storagePath],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
    staleTime: 1000 * 60 * 30,
  });

  if (isLoading || !signedUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <video src={signedUrl} controls autoPlay className="w-full h-full" />;
};

export default ExerciseVideoButton;
