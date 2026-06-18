import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Download, Eye, Search, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import SEOHead from "@/components/SEOHead";
import PdfThumbnail from "@/components/blueprints/PdfThumbnail";

type Blueprint = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  cover_image_url: string | null;
  pdf_path: string;
  read_time_minutes: number | null;
  goal_tags: string[];
};

const DashboardBlueprints = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Blueprint[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("blueprints" as any)
        .select("*")
        .eq("is_published", true)
        .eq("is_archived", false)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      setItems((data as any) || []);
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

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(items.map((i) => i.category)))],
    [items]
  );

  const filtered = items.filter((i) => {
    if (category !== "All" && i.category !== category) return false;
    if (query && !i.title.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const trackEvent = async (blueprintId: string, eventType: "view" | "download") => {
    if (!user) return;
    await supabase.from("blueprint_analytics" as any).insert({
      blueprint_id: blueprintId, user_id: user.id, event_type: eventType,
    });
  };

  const handleDownload = async (item: Blueprint) => {
    const { data, error } = await supabase.storage
      .from("blueprint-pdfs")
      .createSignedUrl(item.pdf_path, 3600, { download: `${item.title}.pdf` });
    if (error || !data?.signedUrl) return;
    void trackEvent(item.id, "download");
    window.open(data.signedUrl, "_blank");
  };

  return (
    <DashboardLayout>
      <SEOHead title="Success Blueprints" description="Premium PDF guides for training, nutrition, and recovery." />
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <header>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Success Blueprints</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Premium guides to deepen your knowledge of training, nutrition, recovery, and growth.
          </p>
        </header>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search blueprints..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`text-xs whitespace-nowrap px-3 py-1.5 rounded-full border transition ${
                  category === c
                    ? "bg-foreground text-background border-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            No blueprints available yet. Check back soon.
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item) => (
              <Card key={item.id} className="overflow-hidden bg-card border-border/40 hover:border-border transition group">
                <div className="aspect-[3/2] w-full">
                  <PdfThumbnail pdfPath={item.pdf_path} title={item.title} completed={completedIds.has(item.id)} />
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                      {item.category}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {item.read_time_minutes} min
                    </span>
                  </div>
                  <h3 className="font-semibold text-base leading-snug">{item.title}</h3>
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Link to={`/dashboard/blueprints/${item.id}`} className="flex-1">
                      <Button size="sm" className="w-full">
                        <Eye className="w-3.5 h-3.5 mr-1.5" /> View
                      </Button>
                    </Link>
                    <Button size="sm" variant="outline" onClick={() => handleDownload(item)}>
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardBlueprints;
