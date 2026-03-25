import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Lightbulb, Megaphone, Target, BookOpen } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const CATEGORY_CONFIG: Record<string, { icon: typeof Lightbulb; label: string; color: string }> = {
  tip: { icon: Lightbulb, label: "Training Tip", color: "text-yellow-400" },
  announcement: { icon: Megaphone, label: "Announcement", color: "text-primary" },
  reminder: { icon: Target, label: "Phase Reminder", color: "text-blue-400" },
  guidance: { icon: BookOpen, label: "Weekly Guidance", color: "text-green-400" },
};

const CoachInsights = () => {
  const { user } = useAuth();

  const { data: insights = [] } = useQuery({
    queryKey: ["coach-insights"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coach_insights")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (insights.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-4 h-4 text-primary" />
        <p className="text-[10px] text-primary uppercase tracking-[0.2em] font-medium">Coach Insights</p>
      </div>

      <div className="space-y-3">
        {insights.map((insight: any) => {
          const config = CATEGORY_CONFIG[insight.category] || CATEGORY_CONFIG.tip;
          const Icon = config.icon;
          return (
            <div key={insight.id} className="p-3 rounded-xl bg-muted/20 border border-border/50">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg bg-muted/40 flex items-center justify-center flex-shrink-0 ${config.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[9px] uppercase tracking-wider font-medium ${config.color}`}>{config.label}</span>
                    <span className="text-[9px] text-muted-foreground">
                      {formatDistanceToNow(new Date(insight.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="font-heading text-sm mb-1">{insight.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{insight.content}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CoachInsights;
