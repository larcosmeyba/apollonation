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
const mp4Url = (playbackId: string) => `https://stream.mux.com/${playbackId}/high.mp4`;
const playbackUrl = (playbackId: string) => `https://stream.mux.com/${playbackId}.m3u8`;
const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));



const RenderMp4Panel = ({ classId, workoutId, onMuxReady }: RenderMp4PanelProps) => {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const notifiedPlaybackRef = useRef("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const targetId = classId || workoutId || null;
  const targetTable = classId ? "admin_classes" : "workouts";

  const { data: currentClass, refetch } = useQuery({
    queryKey: ["admin-mux-video", targetTable, targetId],
    enabled: !!targetId,
    queryFn: async () => {
      if (!targetId) return null;
      const { data, error } = await supabase
        .from(targetTable as "admin_classes")
        .select("id,title,mux_playback_id,mux_asset_id,mux_status,video_url,thumbnail_url,updated_at")
        .eq("id", targetId)
        .maybeSingle();
      if (error) throw error;
      return data;
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
      return toast.error(data?.error || error?.message || "Could not create Mux upload");
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

  const copyLink = async (url: string, label: string) => {
    await navigator.clipboard.writeText(url);
    toast.success(`${label} copied`);
  };

  const [downloading, setDownloading] = useState(false);
  const downloadMp4 = async (url: string, title: string) => {
    try {
      setDownloading(true);
      toast.info("Preparing download…");
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Mux returned ${res.status}. The asset may still be processing the MP4 rendition.`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `${(title || "apollo-class").replace(/[^a-z0-9-_]+/gi, "_")}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
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
  const streamLink = playbackId ? playbackUrl(playbackId) : "";


  const processing = (!playbackId && currentClass?.mux_status === "processing") || (uploading && progress >= 96 && !playbackId);
  const errored = currentClass?.mux_status === "errored";
  const hasVideo = !!playbackId;

  return (
    <div className="border-t border-border pt-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          Mux On-Demand Video
        </div>
        {hasVideo ? (
          <span className="inline-flex items-center gap-1 text-[10px] text-primary">
            <CheckCircle2 className="h-3 w-3" /> Ready in Mux
          </span>
        ) : processing ? (
          <span className="inline-flex items-center gap-1 text-[10px] text-amber-500">
            <Loader2 className="h-3 w-3 animate-spin" /> Processing on Mux
          </span>
        ) : errored ? (
          <span className="inline-flex items-center gap-1 text-[10px] text-destructive">
            <AlertCircle className="h-3 w-3" /> Mux error
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <AlertCircle className="h-3 w-3" /> No final video
          </span>
        )}
      </div>

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
        disabled={!targetId || uploading}
        className="w-full"
        variant={hasVideo ? "secondary" : "outline"}
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
        {uploading
          ? processing ? "Waiting for Mux…" : `Uploading ${progress}%`
          : hasVideo ? "Replace Video" : "Upload Final Class Video to Mux"}
      </Button>

      {!targetId && (
        <p className="text-[10px] text-muted-foreground">Save the class first, then upload the final MP4/MOV.</p>
      )}

      {uploading && (
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

      {hasVideo ? (
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


          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" asChild variant="outline" size="sm" className="flex-1">
              <a href={downloadLink} target="_blank" rel="noopener noreferrer" download>
                <Download className="h-3.5 w-3.5" /> Download MP4
              </a>
            </Button>
            <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => copyLink(downloadLink, "MP4 link")}>
              <Clipboard className="h-3.5 w-3.5" /> Copy MP4 Link
            </Button>
          </div>

        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground">
          The builder preview uses exercise clips, but the client-facing on-demand class should use a final MP4/MOV uploaded here so storage stays in Mux.
        </p>
      )}
    </div>
  );
};

export default RenderMp4Panel;