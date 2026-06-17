import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen } from "lucide-react";

type Blueprint = {
  id: string;
  title: string;
  category: string;
  cover_image_url: string | null;
};

const Cover = ({ path, title }: { path: string | null; title: string }) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) return;
    supabase.storage
      .from("blueprint-covers")
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (data?.signedUrl) setUrl(data.signedUrl);
      });
  }, [path]);
  if (!url) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/10 to-background flex items-center justify-center">
        <BookOpen className="w-8 h-8 text-foreground/40" />
      </div>
    );
  }
  return <img src={url} alt={title} className="w-full h-full object-cover" loading="lazy" />;
};

const BlueprintsCarousel = () => {
  const [items, setItems] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("blueprints" as any)
        .select("id,title,category,cover_image_url")
        .eq("is_published", true)
        .eq("is_archived", false)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      setItems(((data as any) || []) as Blueprint[]);
      setLoading(false);
    })();
  }, []);

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
              <Cover path={bp.cover_image_url} title={bp.title} />
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
