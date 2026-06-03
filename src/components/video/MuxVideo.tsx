import { forwardRef, useEffect, useMemo, useState } from "react";
import MuxPlayer from "@mux/mux-player-react";
import type MuxPlayerElement from "@mux/mux-player";
import { useMuxEnvKey } from "@/hooks/useMuxEnvKey";
import { supabase } from "@/integrations/supabase/client";

export interface MuxVideoProps {
  playbackId: string;
  /** Display title (Mux Data: video_title) */
  title: string;
  /** Stable ID for the video (Mux Data: video_id) — usually the exercise/class id */
  videoId?: string;
  /** Category surfaced as a Mux Data custom dimension */
  category?: string | null;
  /** Class context when an exercise is played inside a class */
  classId?: string | null;
  classTitle?: string | null;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  playsInline?: boolean;
  controls?: boolean;
  poster?: string;
  className?: string;
  /** Player streamType — "on-demand" is default. */
  streamType?: "on-demand" | "live";
  onTimeUpdate?: React.ReactEventHandler<HTMLVideoElement>;
  onLoadedMetadata?: React.ReactEventHandler<HTMLVideoElement>;
}

/**
 * Mux Player wrapper that injects Mux Data analytics automatically.
 * Tracks watch time, buffering, playback failures and engagement, and
 * tags each view with viewer_user_id + category + class context so the
 * Mux dashboard can rank most-watched exercises/classes.
 */
const MuxVideo = forwardRef<MuxPlayerElement, MuxVideoProps>(function MuxVideo(
  {
    playbackId,
    title,
    videoId,
    category,
    classId,
    classTitle,
    autoPlay,
    muted,
    loop,
    playsInline = true,
    controls = true,
    poster,
    className,
    streamType = "on-demand",
    onTimeUpdate,
    onLoadedMetadata,
  },
  ref,
) {
  const envKey = useMuxEnvKey();
  const [viewerId, setViewerId] = useState<string | undefined>(undefined);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setViewerId(data.session?.user?.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setViewerId(session?.user?.id);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const metadata = useMemo(
    () => ({
      env_key: envKey || undefined,
      video_id: videoId || playbackId,
      video_title: title,
      video_series: classTitle || category || "Apollo Reborn",
      viewer_user_id: viewerId,
      player_name: "Apollo Reborn Player",
      custom_1: category || "",
      custom_2: classId || "",
      custom_3: classTitle || "",
    }),
    [envKey, videoId, playbackId, title, category, classId, classTitle, viewerId],
  );

  // Don't render the player until we know the env key result (success or
  // empty). When empty, the player still works — analytics just won't ship.
  if (envKey === null) {
    return <div className={className} style={{ background: "#000" }} />;
  }

  return (
    <MuxPlayer
      ref={ref}
      playbackId={playbackId}
      streamType={streamType}
      autoPlay={autoPlay}
      muted={muted}
      loop={loop}
      playsInline={playsInline}
      poster={poster}
      metadata={metadata}
      envKey={envKey || undefined}
      className={className}
      style={{ aspectRatio: "16 / 9", width: "100%", height: "100%" }}
      // Hide controls when caller asks for an autoplay/loop background
      // (mux-player exposes the `nohotkeys` + `--controls=none` knobs)
      {...(controls ? {} : { nohotkeys: true, "--controls": "none" })}
      onTimeUpdate={onTimeUpdate as unknown as never}
      onLoadedMetadata={onLoadedMetadata as unknown as never}
    />
  );
});

export default MuxVideo;
