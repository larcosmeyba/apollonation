import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

type Row = {
  id: string;
  name: string;
  body_part: string | null;
  category: string | null;
};

/**
 * Lists every admin_exercises row missing a mux_playback_id, so the admin can
 * see at a glance which library entries still need a demo video uploaded.
 */
const MissingMuxReport = ({ onSelect }: { onSelect?: (id: string) => void }) => {
  const [open, setOpen] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-exercises-missing-mux"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_exercises")
        .select("id,name,body_part,category")
        .is("mux_playback_id", null)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const byCategory = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const r of data ?? []) {
      const key = r.category || "uncategorized";
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(r);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [data]);

  const count = data?.length ?? 0;

  return (
    <Card className="p-4 border-amber-500/30 bg-amber-500/5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2 text-left">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="font-semibold text-sm">Library exercises missing a demo video</span>
          {isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
          ) : (
            <Badge variant={count > 0 ? "destructive" : "secondary"} className="text-[10px]">
              {count}
            </Badge>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && !isLoading && (
        <div className="mt-3 space-y-3">
          {count === 0 ? (
            <p className="text-xs text-muted-foreground">
              Every library exercise has a Mux demo video. 🎉
            </p>
          ) : (
            byCategory.map(([cat, rows]) => (
              <div key={cat}>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  {cat} ({rows.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {rows.map((r) => (
                    <Button
                      key={r.id}
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => onSelect?.(r.id)}
                      title={r.body_part ?? ""}
                    >
                      {r.name}
                    </Button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </Card>
  );
};

export default MissingMuxReport;
