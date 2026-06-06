import { useState } from "react";
import { Sparkles, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Summary = {
  client_name: string;
  headline: string;
  adherence: { nutrition: string; training: string };
  trends: string[];
  talking_points: string[];
  flags: string[];
};

const CoachSummaryPanel = ({ clientId }: { clientId: string }) => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);

  const generate = async () => {
    setLoading(true);
    setSummary(null);
    try {
      const { data, error } = await supabase.functions.invoke("openai-coach-summary", {
        body: { client_id: clientId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSummary(data.summary);
      setOpen(true);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate summary");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-b border-border bg-muted/20">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>Coach Summary <span className="opacity-60">(on-demand)</span></span>
        </div>
        <div className="flex items-center gap-2">
          {summary && (
            <button onClick={() => setOpen((o) => !o)} className="text-xs text-muted-foreground hover:text-foreground p-1">
              {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={generate}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {summary ? "Regenerate" : "Generate"}
          </button>
        </div>
      </div>
      {summary && open && (
        <div className="px-4 pb-3 space-y-2 text-sm">
          <p className="font-medium">{summary.headline}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <div className="rounded-md bg-background/50 p-2">
              <p className="text-muted-foreground mb-0.5">Nutrition</p>
              <p>{summary.adherence?.nutrition}</p>
            </div>
            <div className="rounded-md bg-background/50 p-2">
              <p className="text-muted-foreground mb-0.5">Training</p>
              <p>{summary.adherence?.training}</p>
            </div>
          </div>
          {summary.trends?.length > 0 && (
            <div className="text-xs">
              <p className="text-muted-foreground mb-1">Trends</p>
              <ul className="list-disc list-inside space-y-0.5">
                {summary.trends.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}
          {summary.talking_points?.length > 0 && (
            <div className="text-xs">
              <p className="text-muted-foreground mb-1">Talking points</p>
              <ul className="list-disc list-inside space-y-0.5">
                {summary.talking_points.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}
          {summary.flags?.length > 0 && (
            <div className="text-xs">
              <p className="text-muted-foreground mb-1">Flags</p>
              <ul className="list-disc list-inside space-y-0.5 text-amber-400">
                {summary.flags.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CoachSummaryPanel;
