import { useState } from "react";
import { Play } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const COACH_VIDEO_URL = "";

const getYouTubeVideoId = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) return parsed.searchParams.get("v");
    if (parsed.hostname === "youtu.be") return parsed.pathname.slice(1);
    const shorts = url.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
    if (shorts) return shorts[1];
    return null;
  } catch {
    return null;
  }
};

const CoachIntroVideo = () => {
  const [playing, setPlaying] = useState(false);

  const videoUrl = COACH_VIDEO_URL;
  if (!videoUrl) return null;

  const youtubeId = getYouTubeVideoId(videoUrl);
  const embedUrl = youtubeId
    ? `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&fs=1`
    : null;
  const isDirectVideo = !youtubeId;

  return (
    <>
      <div className="card-apollo overflow-hidden">
        <button
          onClick={() => setPlaying(true)}
          className="relative w-full aspect-video bg-gradient-to-br from-primary/20 via-background to-primary/10 overflow-hidden group"
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary/30 transition-all duration-300">
              <Play className="w-7 h-7 text-primary ml-1" fill="currentColor" />
            </div>
            <p className="font-heading text-lg tracking-wide mb-1">
              A Message From <span className="text-primary">Coach Marcos</span>
            </p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Tap to watch your personal welcome message
            </p>
          </div>

          <div className="absolute top-3 left-3">
            <span className="text-[10px] uppercase tracking-[0.15em] text-primary/60 font-medium">
              Coach's Corner
            </span>
          </div>
        </button>
      </div>

      <Dialog open={playing} onOpenChange={setPlaying}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-black border-border/30">
          <div className="aspect-video w-full bg-black">
            {embedUrl && playing ? (
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
                title="Coach Marcos - Welcome Message"
                style={{ border: 0 }}
              />
            ) : isDirectVideo && playing ? (
              <video
                src={videoUrl}
                controls
                autoPlay
                className="w-full h-full"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CoachIntroVideo;
