import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Download, ExternalLink, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import PdfViewer from "@/components/blueprints/PdfViewer";
import { toast } from "sonner";

type Blueprint = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  pdf_path: string;
  read_time_minutes: number | null;
};

const DashboardBlueprintViewer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [item, setItem] = useState<Blueprint | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("blueprints" as any)
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!data) {
        setLoading(false);
        return;
      }
      const bp = data as any as Blueprint;
      setItem(bp);
      const { data: signed } = await supabase.storage
        .from("blueprint-pdfs")
        .createSignedUrl(bp.pdf_path, 3600);
      if (signed?.signedUrl) setPdfUrl(signed.signedUrl);
      if (user) {
        await supabase.from("blueprint_analytics" as any).insert({
          blueprint_id: bp.id, user_id: user.id, event_type: "view",
        });
        const { data: done } = await supabase
          .from("blueprint_analytics" as any)
          .select("id")
          .eq("blueprint_id", bp.id)
          .eq("user_id", user.id)
          .eq("event_type", "completed")
          .limit(1);
        if ((done as any[])?.length) setCompleted(true);
      }
      setLoading(false);
    })();
  }, [id, user]);

  const markCompleted = async () => {
    if (!item || !user || completed) return;
    setCompleted(true);
    const { error } = await supabase.from("blueprint_analytics" as any).insert({
      blueprint_id: item.id, user_id: user.id, event_type: "completed",
    });
    if (error) {
      setCompleted(false);
      toast.error("Could not save");
      return;
    }
    toast.success("Marked as read");
  };

  const handleDownload = async () => {
    if (!item) return;
    const { data } = await supabase.storage
      .from("blueprint-pdfs")
      .createSignedUrl(item.pdf_path, 3600, { download: `${item.title}.pdf` });
    if (data?.signedUrl) {
      if (user) {
        void supabase.from("blueprint_analytics" as any).insert({
          blueprint_id: item.id, user_id: user.id, event_type: "download",
        });
      }
      window.open(data.signedUrl, "_blank");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-16"><Loader2 className="animate-spin" /></div>
      </DashboardLayout>
    );
  }

  if (!item) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto p-8 text-center">
          <p className="text-muted-foreground mb-4">Blueprint not found.</p>
          <Button onClick={() => navigate("/dashboard/blueprints")}>Back to Library</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <Link to="/dashboard/blueprints" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Blueprints
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                {item.category}
              </span>
              {completed && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500">
                  <CheckCircle2 className="w-3 h-3" /> Read
                </span>
              )}
            </div>
            <h1 className="text-2xl font-heading font-bold mt-2">{item.title}</h1>
            {item.description && (
              <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {!completed && (
              <Button variant="default" onClick={markCompleted}>
                <CheckCircle2 className="w-4 h-4 mr-2" /> Mark as Read
              </Button>
            )}
            <Button variant="outline" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" /> Download
            </Button>
            {pdfUrl && (
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost">
                  <ExternalLink className="w-4 h-4 mr-2" /> Open
                </Button>
              </a>
            )}
          </div>
        </div>

        {pdfUrl ? (
          <div className="w-full h-[80vh] rounded-lg overflow-hidden border border-border/40">
            <PdfViewer url={pdfUrl} onReachedEnd={markCompleted} />
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground">PDF could not be loaded.</div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardBlueprintViewer;
