import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Film, Download, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface RenderMp4PanelProps {
  classId: string | null;
  hasBlocks: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  queued: "Queued",
  rendering: "Rendering on Mux…",
  ready: "Ready",
  failed: "Failed",
};

const RenderMp4Panel = ({ classId, hasBlocks }: RenderMp4PanelProps) => {
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

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
    const { data, error } = await supabase.functions.invoke("render-class", {
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
    toast.success("Render started — Mux is stitching now");
    qc.invalidateQueries({ queryKey: ["render-jobs", classId] });
  };

  return (
    <div className="border-t border-border pt-3 space-y-2">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">
        MP4 Render
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
        Render MP4
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
            <button
              onClick={async () => {
                try {
                  toast.loading("Preparing download…", { id: "mp4-dl" });
                  const res = await fetch(latest.mp4_url);
                  if (!res.ok) throw new Error(`HTTP ${res.status}`);
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${(latest.title || "apollo-class").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.mp4`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  toast.success("Download started", { id: "mp4-dl" });
                } catch (e: any) {
                  toast.error(`Download failed: ${e.message}`, { id: "mp4-dl" });
                }
              }}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <Download className="w-3.5 h-3.5" /> Download MP4
              {latest.duration_seconds
                ? ` · ${Math.round(latest.duration_seconds / 60)}m`
                : ""}
            </button>
          )}

          {latest.status === "failed" && latest.error && (
            <p className="text-[10px] text-destructive break-words">
              {latest.error.slice(0, 200)}
            </p>
          )}

          {latest.status === "rendering" && (
            <p className="text-[10px] text-muted-foreground">
              Mux usually finishes within a few minutes. This page will update
              automatically.
            </p>
          )}
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
