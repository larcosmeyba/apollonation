import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Film, Download, RefreshCw, AlertCircle, CheckCircle2, Save } from "lucide-react";
import { toast } from "sonner";

interface RenderMp4PanelProps {
  classId: string | null;
  hasBlocks: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  queued: "Queued",
  rendering: "Rendering MP4…",
  ready: "Ready",
  failed: "Failed",
};

// Accept either a full Mux playback URL or a bare playback ID and store the ID.
const parsePlaybackId = (input: string): string => {
  const v = input.trim();
  const m = v.match(/stream\.mux\.com\/([^/.?#]+)/i);
  return (m ? m[1] : v).trim();
};

const RenderMp4Panel = ({ classId, hasBlocks }: RenderMp4PanelProps) => {
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [playbackInput, setPlaybackInput] = useState("");
  const [savingPlayback, setSavingPlayback] = useState(false);

  const { data: jobs = [], refetch } = useQuery({
    queryKey: ["render-jobs", classId],
    enabled: !!classId,
    queryFn: async () => {
      if (!classId) return [];
      const { data } = await supabase
        .from("render_jobs")
        .select("*")
        .eq("class_id", classId)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    // poll while any job is in flight
    refetchInterval: (q) => {
      const data = q.state.data as any[] | undefined;
      const inFlight = data?.some((j) => j.status === "queued" || j.status === "rendering");
      return inFlight ? 4000 : false;
    },
  });

  const latest = jobs[0];

  const startRender = async () => {
    if (!classId) {
      toast.error("Save the class first");
      return;
    }
    if (!hasBlocks) {
      toast.error("Add blocks before rendering");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("enqueue-class-render", {
      body: { class_id: classId },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data?.error) {
      toast.error(data.error);
      return;
    }
    toast.success("Render started — building your finished MP4");
    qc.invalidateQueries({ queryKey: ["render-jobs", classId] });
  };

  const savePlayback = async () => {
    if (!classId) return;
    const id = parsePlaybackId(playbackInput);
    if (!id) {
      toast.error("Paste a Mux playback URL or ID");
      return;
    }
    setSavingPlayback(true);
    // `mux_playback_id` is added by the external-render-worker migration; the
    // generated types lag until Lovable regenerates them post-migration.
    const { error } = await (supabase as any)
      .from("admin_classes")
      .update({ mux_playback_id: id })
      .eq("id", classId);
    setSavingPlayback(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Mux playback ID saved to class");
    setPlaybackInput("");
    qc.invalidateQueries({ queryKey: ["admin-class", classId] });
  };

  return (
    <div className="border-t border-border pt-3 space-y-2">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">
        Finished MP4
      </div>
      <Button
        onClick={startRender}
        disabled={submitting || !classId}
        className="w-full"
        variant="outline"
      >
        {submitting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Film className="w-4 h-4" />
        )}
        Generate Finished MP4
      </Button>
      {!classId && (
        <p className="text-[10px] text-muted-foreground">
          Save the class first to enable rendering.
        </p>
      )}

      {latest && (
        <div className="rounded-lg border border-border p-3 bg-card/50 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5">
              {latest.status === "ready" && (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              )}
              {latest.status === "failed" && (
                <AlertCircle className="w-3.5 h-3.5 text-destructive" />
              )}
              {(latest.status === "queued" || latest.status === "rendering") && (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              )}
              <span className="font-medium">
                {STATUS_LABELS[latest.status] || latest.status}
              </span>
            </span>
            <button
              onClick={() => refetch()}
              className="text-muted-foreground hover:text-foreground"
              title="Refresh"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          {latest.status === "ready" && latest.mp4_url && (
            <>
              <a
                href={latest.mp4_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <Download className="w-3.5 h-3.5" /> Download Finished MP4
                {latest.duration_seconds
                  ? ` · ${Math.round(latest.duration_seconds / 60)}m`
                  : ""}
              </a>
              <p className="text-[10px] text-muted-foreground">
                One complete class video. Download link expires in 24 hours, then the file is
                deleted. Upload it to Mux, then paste the playback URL below.
              </p>
            </>
          )}

          {latest.status === "failed" && latest.error && (
            <p className="text-[10px] text-destructive break-words">
              {latest.error.slice(0, 200)}
            </p>
          )}

          {(latest.status === "rendering" || latest.status === "queued") && (
            <p className="text-[10px] text-muted-foreground">
              Rendering on the external worker. This can take a few minutes for a full-length
              class. This panel updates automatically.
            </p>
          )}
        </div>
      )}

      {/* After uploading the MP4 to Mux, paste the playback URL/ID back onto the class. */}
      {classId && (
        <div className="space-y-1.5 pt-1">
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Mux playback URL / ID
          </label>
          <div className="flex gap-1.5">
            <Input
              value={playbackInput}
              onChange={(e) => setPlaybackInput(e.target.value)}
              placeholder="https://stream.mux.com/… or playback ID"
              className="h-8 text-xs"
            />
            <Button
              onClick={savePlayback}
              disabled={savingPlayback || !playbackInput.trim()}
              size="sm"
              className="h-8 px-2"
              variant="secondary"
            >
              {savingPlayback ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      )}

      {jobs.length > 1 && (
        <details className="text-[10px] text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground">
            Previous renders ({jobs.length - 1})
          </summary>
          <div className="mt-1 space-y-1">
            {jobs.slice(1).map((j: any) => (
              <div key={j.id} className="flex items-center justify-between gap-2">
                <span>{new Date(j.created_at).toLocaleString()}</span>
                <span>{STATUS_LABELS[j.status]}</span>
                {j.mp4_url && (
                  <a
                    href={j.mp4_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    MP4
                  </a>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
};

export default RenderMp4Panel;
