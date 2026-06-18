import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PdfThumbnail from "@/components/blueprints/PdfThumbnail";
import { useAuth } from "@/contexts/AuthContext";

type Blueprint = {
  id: string;
  title: string;
  category: string;
  pdf_path: string;
};

const BlueprintsCarousel = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Blueprint[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("blueprints" as any)
        .select("id,title,category,pdf_path")
        .eq("is_published", true)
        .eq("is_archived", false)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      setItems(((data as any) || []) as Blueprint[]);
      if (user) {
        const { data: done } = await supabase
          .from("blueprint_analytics" as any)
          .select("blueprint_id")
          .eq("user_id", user.id)
          .eq("event_type", "completed");
        setCompletedIds(new Set(((done as any[]) || []).map((r) => r.blueprint_id)));
      }
      setLoading(false);
    })();
  }, [user]);

  if (loading || items.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Success Blueprints
        </h2>
        <Link to="/dashboard/blueprints">
          <span className="text-sm font-bold text-foreground hover:text-accent transition-colors">View All</span>
        </Link>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {items.map((bp) => (
          <Link
            key={bp.id}
            to={`/dashboard/blueprints/${bp.id}`}
            className="flex-shrink-0 w-40 group"
          >
            <div className="img-overlay-premium relative w-40 h-56 rounded-xl overflow-hidden shadow-[var(--shadow-md)]">
              <PdfThumbnail pdfPath={bp.pdf_path} title={bp.title} completed={completedIds.has(bp.id)} />
            </div>
            <p className="mt-2 text-sm font-semibold text-foreground leading-snug line-clamp-2">
              {bp.title}
            </p>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">
              {bp.category}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default BlueprintsCarousel;
