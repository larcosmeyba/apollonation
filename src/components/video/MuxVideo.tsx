import { forwardRef, useEffect, useMemo, useState } from "react";
import MuxPlayer from "@mux/mux-player-react";
import type MuxPlayerElement from "@mux/mux-player";
import { Capacitor } from "@capacitor/core";
import { useMuxEnvKey } from "@/hooks/useMuxEnvKey";
import { supabase } from "@/integrations/supabase/client";

// iOS WKWebView (Capacitor) intermittently shows mux-player's
// "A network error caused the media download to fail" overlay when its
// web component drives HLS playback. WKWebView plays HLS reliably via AVPlayer
// when handed a plain <video> with the .m3u8 URL and no crossorigin attribute,
// so on native iOS we bypass mux-player entirely.
const IS_NATIVE_IOS =
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";


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
  /** Optional inline style overrides (e.g. objectPosition for reframing). */
  style?: React.CSSProperties;
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
    style,
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

  // iOS WKWebView: render a native <video> using Mux's HLS URL. AVPlayer plays
  // it natively without the mux-player web component's HLS pipeline.
  if (IS_NATIVE_IOS) {
    const src = `https://stream.mux.com/${playbackId}.m3u8`;
    return (
      <video
        ref={ref as unknown as React.Ref<HTMLVideoElement>}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        playsInline={playsInline}
        controls={controls}
        preload="metadata"
        className={className}
        style={{ aspectRatio: "16 / 9", width: "100%", height: "100%", backgroundColor: "#000", ...style }}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onError={(e) => {
          const v = e.currentTarget;
          // eslint-disable-next-line no-console
          console.error("[MuxVideo:native-ios] error", {
            playbackId,
            title,
            code: v.error?.code,
            message: v.error?.message,
            networkState: v.networkState,
            readyState: v.readyState,
            src,
          });
        }}
      />
    );
  }




  return (
    <MuxPlayer
      ref={ref}
      playbackId={playbackId}
      streamType={streamType}
      // Force the highest available rendition so small containers don't
      // pin playback to 360p/480p (which looks grainy when scaled up or
      // pushed to fullscreen on retina displays).
      maxResolution="2160p"
      minResolution="1080p"
      renditionOrder="desc"
      autoPlay={autoPlay}
      muted={muted}
      loop={loop}
      playsInline={playsInline}
      poster={poster}
      metadata={metadata}
      envKey={envKey || undefined}
      className={className}
      style={{ aspectRatio: "16 / 9", width: "100%", height: "100%", ...style }}
      // Hide controls when caller asks for an autoplay/loop background
      // (mux-player exposes the `nohotkeys` + `--controls=none` knobs)
      {...(controls ? {} : { nohotkeys: true, "--controls": "none" })}
      onTimeUpdate={onTimeUpdate as unknown as never}
      onLoadedMetadata={onLoadedMetadata as unknown as never}
      onError={((e: Event) => {
        const detail = (e as unknown as { detail?: {
          code?: number; message?: string; fatal?: boolean; errorCategory?: string;
          mediaError?: { code?: number; message?: string };
        } }).detail;
        // eslint-disable-next-line no-console
        console.error("[MuxVideo] error", {
          playbackId,
          title,
          code: detail?.code,
          message: detail?.message,
          fatal: detail?.fatal,
          errorCategory: detail?.errorCategory,
          mediaError: detail?.mediaError && {
            code: detail.mediaError.code,
            message: detail.mediaError.message,
          },
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        });
      }) as unknown as never}
    />

  );
});

export default MuxVideo;
