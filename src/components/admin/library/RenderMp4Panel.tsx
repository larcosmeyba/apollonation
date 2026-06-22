import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, Clipboard, Download, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

interface RenderMp4PanelProps {
  classId: string | null;
  workoutId?: string | null;
  hasBlocks: boolean;
  onMuxReady?: (data: { videoUrl: string; thumbnailUrl: string | null; playbackId: string }) => void;
}

const publicUrl = (playbackId: string) => `https://stream.mux.com/${playbackId}`;
const mp4Url = (playbackId: string) => `https://stream.mux.com/${playbackId}/capped-1080p.mp4`;
const playbackUrl = (playbackId: string) => `https://stream.mux.com/${playbackId}.m3u8`;
const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const functionErrorMessage = async (error: unknown, data: any, fallback: string) => {
  if (data?.error) return data.error as string;
  const maybeResponse = (error as { context?: unknown } | null)?.context;
  if (maybeResponse instanceof Response) {
    const payload = await maybeResponse.clone().json().catch(async () => ({ error: await maybeResponse.clone().text() }));
    if (payload?.error) return payload.error as string;
  }
  return (error as Error | null)?.message || fallback;
};

type MuxVideoRecord = {
  id: string;
  title: string | null;
  mux_playback_id: string | null;
  mux_asset_id: string | null;
  mux_status: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
};



const extractMuxPlaybackId = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^[a-zA-Z0-9_-]{12,}$/.test(trimmed) && !trimmed.includes(".")) return trimmed;
  try {
    const url = new URL(trimmed);
    if (!url.hostname.includes("mux.com")) return "";
    const first = url.pathname.split("/").filter(Boolean)[0] || "";
    return first.replace(/\.m3u8$/i, "");
  } catch {
    return "";
  }
};

const RenderMp4Panel = ({ classId, workoutId, hasBlocks, onMuxReady }: RenderMp4PanelProps) => {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const notifiedPlaybackRef = useRef("");
  const [uploading, setUploading] = useState(false);
  const [creatingFromClips, setCreatingFromClips] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const [savingManualUrl, setSavingManualUrl] = useState(false);
  const [progress, setProgress] = useState(0);
  const targetId = classId || workoutId || null;
  const targetTable = classId ? "admin_classes" : "workouts";

  const { data: currentClass, refetch } = useQuery({
    queryKey: ["admin-mux-video", targetTable, targetId],
    enabled: !!targetId,
    queryFn: async () => {
      if (!targetId) return null;
      const { data, error } = await supabase
        .from(targetTable as "admin_classes" | "workouts")
        .select("id,title,mux_playback_id,mux_asset_id,mux_status,video_url,thumbnail_url")
        .eq("id", targetId)
        .maybeSingle();
      if (error) throw error;
      return data as MuxVideoRecord | null;
    },
    refetchInterval: (query) =>
      uploading || (query.state.data as { mux_status?: string } | null | undefined)?.mux_status === "processing"
        ? 5000
        : false,
  });

  useEffect(() => {
    if (uploading && currentClass?.mux_playback_id) {
      setUploading(false);
      setProgress(100);
      toast.success("Mux finished processing this class");
    }
    if (currentClass?.mux_playback_id && notifiedPlaybackRef.current !== currentClass.mux_playback_id) {
      notifiedPlaybackRef.current = currentClass.mux_playback_id;
      onMuxReady?.({
        playbackId: currentClass.mux_playback_id,
        videoUrl: currentClass.video_url || playbackUrl(currentClass.mux_playback_id),
        thumbnailUrl: currentClass.thumbnail_url || null,
      });
    }
  }, [currentClass?.mux_playback_id, currentClass?.thumbnail_url, currentClass?.video_url, uploading]);

  const uploadToMux = async (file: File) => {
    if (!targetId) return toast.error("Save the class first");
    setUploading(true);
    setProgress(1);

    const { data, error } = await supabase.functions.invoke("create-mux-upload", {
      body: classId ? { class_id: classId } : { workout_id: workoutId },
    });

    if (error || data?.error || !data?.upload_url) {
      setUploading(false);
      setProgress(0);
      return toast.error(await functionErrorMessage(error, data, "Could not create Mux upload"));
    }

    const uploaded = await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", data.upload_url);
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setProgress(Math.max(1, Math.round((event.loaded / event.total) * 95)));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Upload failed (${xhr.status})`));
      };
      xhr.onerror = () => reject(new Error("Upload failed"));
      xhr.send(file);
    }).then(() => true).catch((e: Error) => {
      setUploading(false);
      setProgress(0);
      toast.error(e.message);
      return false;
    });

    if (!uploaded) return;

    setProgress(96);
    toast.success("Video uploaded — Mux is processing it now");
    for (let i = 0; i < 24; i += 1) {
      const { data: statusData } = await supabase.functions.invoke("create-mux-upload", {
        body: classId
          ? { action: "status", class_id: classId, upload_id: data.upload_id }
          : { action: "status", workout_id: workoutId, upload_id: data.upload_id },
      });
      if (statusData?.playback_id) {
        setProgress(100);
        setUploading(false);
        onMuxReady?.({
          playbackId: statusData.playback_id,
          videoUrl: statusData.video_url || playbackUrl(statusData.playback_id),
          thumbnailUrl: statusData.thumbnail_url || null,
        });
        await refetch();
        qc.invalidateQueries({ queryKey: ["admin-classes"] });
        qc.invalidateQueries({ queryKey: ["admin-workouts"] });
        return;
      }
      if (statusData?.status === "errored") {
        setUploading(false);
        toast.error("Mux could not process this video");
        await refetch();
        return;
      }
      await wait(5000);
    }
    await refetch();
    qc.invalidateQueries({ queryKey: ["admin-classes"] });
    qc.invalidateQueries({ queryKey: ["admin-workouts"] });
  };

  const createMuxAssetFromClassClips = async () => {
    if (!classId) return toast.error("Save the class first");
    if (!hasBlocks) return toast.error("Add exercise clips before sending this class to Mux");
    setCreatingFromClips(true);
    setProgress(3);
    const { data, error } = await supabase.functions.invoke("create-mux-upload", {
      body: { action: "stitch_existing_mux", class_id: classId },
    });
    if (error || data?.error || !data?.asset_id) {
      setCreatingFromClips(false);
      setProgress(0);
      return toast.error(await functionErrorMessage(error, data, "Mux could not create this class from clips"));
    }
    toast.success(`Mux asset created from ${data.input_count || "class"} clip${data.input_count === 1 ? "" : "s"}`);
    setProgress(96);
    for (let i = 0; i < 36; i += 1) {
      const { data: statusData } = await supabase.functions.invoke("create-mux-upload", {
        body: { action: "status", class_id: classId, asset_id: data.asset_id },
      });
      if (statusData?.playback_id) {
        setProgress(100);
        setCreatingFromClips(false);
        onMuxReady?.({
          playbackId: statusData.playback_id,
          videoUrl: statusData.video_url || playbackUrl(statusData.playback_id),
          thumbnailUrl: statusData.thumbnail_url || null,
        });
        await refetch();
        qc.invalidateQueries({ queryKey: ["admin-classes"] });
        qc.invalidateQueries({ queryKey: ["admin-workouts"] });
        return;
      }
      if (statusData?.status === "errored") {
        setCreatingFromClips(false);
        setProgress(0);
        toast.error("Mux could not process this class asset");
        await refetch();
        return;
      }
      await wait(5000);
    }
    setCreatingFromClips(false);
    await refetch();
    qc.invalidateQueries({ queryKey: ["admin-classes"] });
  };

  const saveManualMuxUrl = async () => {
    if (!targetId) return toast.error("Save the class first");
    const playbackId = extractMuxPlaybackId(manualUrl);
    if (!playbackId) return toast.error("Paste a Mux playback ID or stream.mux.com URL");
    setSavingManualUrl(true);
    const videoUrl = playbackUrl(playbackId);
    const thumbnailUrlValue = `https://image.mux.com/${playbackId}/thumbnail.jpg?width=640&fit_mode=smartcrop`;
    const updatePayload: Record<string, unknown> = {
      mux_playback_id: playbackId,
      mux_status: "ready",
      video_url: videoUrl,
      thumbnail_url: thumbnailUrlValue,
    };
    if (classId) updatePayload.source_type = "uploaded";
    const { error } = await supabase
      .from(targetTable as "admin_classes" | "workouts")
      .update(updatePayload as any)
      .eq("id", targetId);
    setSavingManualUrl(false);
    if (error) return toast.error(error.message);
    setManualUrl("");
    onMuxReady?.({ playbackId, videoUrl, thumbnailUrl: thumbnailUrlValue });
    await refetch();
    qc.invalidateQueries({ queryKey: ["admin-classes"] });
    qc.invalidateQueries({ queryKey: ["admin-workouts"] });
    toast.success("Mux playback URL saved to this class");
  };

  const copyLink = async (url: string, label: string) => {
    await navigator.clipboard.writeText(url);
    toast.success(`${label} copied`);
  };

  const [downloading, setDownloading] = useState(false);
  const downloadMp4 = async (title: string) => {
    try {
      if (!classId) throw new Error("Open and save an On-Demand class before downloading the finished MP4.");
      setDownloading(true);
      toast.info("Preparing finished class MP4…");
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sign in again before downloading the finished class MP4.");

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-video-download`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "finished_class", class_id: classId }),
      });
      const payload = await res.json().catch(async () => ({ error: await res.text() }));
      if (!res.ok || !payload?.url) {
        throw new Error(payload?.error || `Download failed (${res.status})`);
      }

      const a = document.createElement("a");
      a.href = payload.url;
      a.download = payload.filename || `${(title || "apollo-class").replace(/[^a-z0-9-_]+/gi, "_")}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("Download started");
    } catch (e) {
      toast.error((e as Error).message || "Could not download MP4");
    } finally {
      setDownloading(false);
    }
  };

  const playbackId = currentClass?.mux_playback_id || "";
  const publicShareLink = playbackId ? publicUrl(playbackId) : "";
  const downloadLink = playbackId ? mp4Url(playbackId) : "";
  const streamLink = playbackId ? publicUrl(playbackId) : "";

  const busyWithMux = uploading || creatingFromClips;
  const processing = (!playbackId && currentClass?.mux_status === "processing") || (busyWithMux && progress >= 96 && !playbackId);
  const errored = currentClass?.mux_status === "errored";
  const hasVideo = !!playbackId;

  const statusLabel = errored
    ? "MP4 Download Not Available"
    : hasVideo
      ? "Ready to Download MP4"
      : processing
        ? "Processing in MUX"
        : currentClass?.mux_asset_id
          ? "Ready to Stream"
          : "No MUX Asset";

  const statusTone = errored
    ? "text-destructive"
    : hasVideo
      ? "text-primary"
      : processing
        ? "text-amber-500"
        : "text-muted-foreground";

  return (
    <div className="border-t border-border pt-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          Finished Class MP4 (Mux)
        </div>
        <span className={`inline-flex items-center gap-1 text-[10px] ${statusTone}`}>
          {hasVideo ? <CheckCircle2 className="h-3 w-3" /> : processing ? <Loader2 className="h-3 w-3 animate-spin" /> : <AlertCircle className="h-3 w-3" />}
          {statusLabel}
        </span>
      </div>

      {hasVideo ? (
        <Button
          type="button"
          variant="apollo"
          className="w-full"
          disabled={downloading}
          onClick={() => downloadMp4(currentClass?.title || "apollo-class")}
        >
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {downloading ? "Downloading finished class…" : "Download Finished Class MP4"}
        </Button>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-card/40 p-3 space-y-2">
          <p className="text-xs text-foreground">
            This class must be rendered to MUX before it can be downloaded as a finished MP4.
          </p>
          <p className="text-[10px] text-muted-foreground">
            {processing
              ? "Mux is currently stitching this class. The download will unlock automatically when it’s ready (usually under a minute)."
              : "Use “Create MUX Asset from Class Clips” below to stitch every exercise clip into one Mux-hosted MP4, or upload a final edit directly."}
          </p>
        </div>
      )}


      <Input
        ref={fileRef}
        type="file"
        accept="video/mp4,video/quicktime,video/mov"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.currentTarget.value = "";
          if (file) void uploadToMux(file);
        }}
      />

      <Button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={!targetId || busyWithMux}
        className="w-full"
        variant={hasVideo ? "secondary" : "outline"}
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
        {uploading
          ? processing ? "Waiting for Mux…" : `Uploading ${progress}%`
          : hasVideo ? "Replace Video" : "Upload Final Class Video to Mux"}
      </Button>

      {classId && (
        <Button
          type="button"
          onClick={createMuxAssetFromClassClips}
          disabled={!hasBlocks || busyWithMux}
          className="w-full"
          variant="outline"
        >
          {creatingFromClips ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
          {creatingFromClips ? "Creating in Mux…" : "Create Mux Asset from Class Clips"}
        </Button>
      )}

      {classId && (
        <FfmpegRenderSection classId={classId} hasBlocks={hasBlocks} />
      )}

      <div className="space-y-1 rounded-lg border border-border p-3 bg-card/40">
        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Manual Mux playback URL</Label>
        <div className="flex gap-2">
          <Input
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="https://stream.mux.com/playback-id.m3u8"
            className="h-9 text-xs"
          />
          <Button type="button" size="sm" onClick={saveManualMuxUrl} disabled={!targetId || savingManualUrl}>
            {savingManualUrl ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
          </Button>
        </div>
      </div>

      {!targetId && (
        <p className="text-[10px] text-muted-foreground">Save the class first, then upload the final MP4/MOV.</p>
      )}

      {busyWithMux && (
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      {processing && (
        <p className="text-[10px] text-muted-foreground">
          Mux is transcoding your upload. The playback URL and thumbnail will appear here automatically when ready (usually under a minute).
        </p>
      )}

      {errored && (
        <p className="text-[10px] text-destructive">
          Mux could not process the last upload. Try a new MP4/MOV export for this class.
        </p>
      )}

      {hasVideo && (
        <div className="rounded-lg border border-border p-3 bg-card/50 space-y-3">
          {currentClass?.thumbnail_url && (
            <img
              src={currentClass.thumbnail_url}
              alt="Mux thumbnail"
              className="w-full aspect-video object-cover rounded-md border border-border"
            />
          )}

          <video
            key={playbackId}
            controls
            playsInline
            preload="metadata"
            poster={currentClass?.thumbnail_url || undefined}
            src={mp4Url(playbackId)}
            className="w-full aspect-video rounded-md bg-black"
          />

          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-widest text-primary">Public URL</Label>
            <div className="flex gap-2">
              <Input readOnly value={publicShareLink} className="h-8 text-xs" />
              <Button type="button" size="icon" variant="outline" onClick={() => copyLink(publicShareLink, "Public URL")}>
                <Clipboard className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Share this link anywhere. It opens the Mux-hosted class video.
            </p>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">HLS stream link</Label>
            <div className="flex gap-2">
              <Input readOnly value={streamLink} className="h-8 text-xs" />
              <Button type="button" size="icon" variant="outline" onClick={() => copyLink(streamLink, "Stream link")}>
                <Clipboard className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => copyLink(downloadLink, "MP4 link")}>
            <Clipboard className="h-3.5 w-3.5" /> Copy MP4 Link
          </Button>

          <p className="text-[10px] text-muted-foreground">
            If the download fails with a 404, Mux is still rendering the MP4 file (usually under a minute after the class becomes Ready). Try again shortly.
          </p>

        </div>
      )}
    </div>
  );
};

type FfmpegJob = {
  id: string;
  status: string;
  mp4_url: string | null;
  error: string | null;
  expires_at: string | null;
  created_at: string;
};

const FfmpegRenderSection = ({ classId, hasBlocks }: { classId: string; hasBlocks: boolean }) => {
  const [submitting, setSubmitting] = useState(false);

  const { data: job, refetch } = useQuery({
    queryKey: ["ffmpeg-render-job", classId],
    enabled: !!classId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("render_jobs")
        .select("id,status,mp4_url,error,expires_at,created_at")
        .eq("class_id", classId)
        .in("render_engine", ["ffmpeg", "mux"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as FfmpegJob | null) ?? null;
    },
    refetchInterval: (query) => {
      const s = (query.state.data as FfmpegJob | null)?.status;
      return s === "queued" || s === "rendering" ? 4000 : false;
    },
  });

  useEffect(() => {
    if (!job || (job.status !== "queued" && job.status !== "rendering")) return;
    const timer = window.setInterval(() => {
      void supabase.functions.invoke("enqueue-class-render", {
        body: { action: "status", job_id: job.id },
      }).finally(() => void refetch());
    }, 8000);
    return () => window.clearInterval(timer);
  }, [job?.id, job?.status, refetch]);

  const start = async () => {
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("enqueue-class-render", {
      body: { class_id: classId },
    });
    setSubmitting(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Could not start render");
      return;
    }
    toast.success("Stitching started — this can take a few minutes");
    await refetch();
  };

  const status = job?.status;
  const inProgress = status === "queued" || status === "rendering";
  const ready = status === "ready" && job?.mp4_url;
  const failed = status === "failed";

  return (
    <div className="rounded-lg border border-border p-3 bg-card/40 space-y-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        Stitched class MP4
      </div>
      <Button
        type="button"
        onClick={start}
        disabled={!hasBlocks || submitting || inProgress}
        className="w-full"
        variant="outline"
      >
        {submitting || inProgress ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {inProgress
          ? "Stitching your MP4…"
          : submitting
            ? "Starting…"
            : "Download Finished MP4 (stitched)"}
      </Button>
      {inProgress && (
        <p className="text-[10px] text-muted-foreground">
          Stitching your MP4… this can take a few minutes. The download link will appear here automatically.
        </p>
      )}
      {ready && (
        <div className="space-y-1">
          <a
            href={job!.mp4_url!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary underline"
          >
            <Download className="h-3.5 w-3.5" /> Download Finished MP4
          </a>
          <p className="text-[10px] text-muted-foreground">
            Download it, then upload it as the final class video if needed.
          </p>
        </div>
      )}
      {failed && (
        <p className="text-[10px] text-destructive">
          Render failed: {job?.error || "unknown error"}
        </p>
      )}
    </div>
  );
};

export default RenderMp4Panel;
