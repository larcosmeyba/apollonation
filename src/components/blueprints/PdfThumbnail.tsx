import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Loader2, CheckCircle2 } from "lucide-react";
import { pdfjsLib } from "@/lib/pdfjs";

// Module-level cache so we don't re-render the same PDF first page repeatedly.
const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

async function renderFirstPage(pdfPath: string): Promise<string | null> {
  if (cache.has(pdfPath)) return cache.get(pdfPath) || null;
  if (inflight.has(pdfPath)) return inflight.get(pdfPath)!;

  const task = (async () => {
    try {
      const { data } = await supabase.storage
        .from("blueprint-pdfs")
        .createSignedUrl(pdfPath, 3600);
      if (!data?.signedUrl) return null;

      const loadingTask = pdfjsLib.getDocument({ url: data.signedUrl });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1 });
      const targetWidth = 480;
      const scale = targetWidth / viewport.width;
      const scaled = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.width = scaled.width;
      canvas.height = scaled.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      await page.render({ canvasContext: ctx, viewport: scaled, canvas } as any).promise;

      const url = canvas.toDataURL("image/jpeg", 0.8);
      cache.set(pdfPath, url);
      return url;
    } catch (e) {
      console.warn("[PdfThumbnail] render failed", e);
      return null;
    } finally {
      inflight.delete(pdfPath);
    }
  })();

  inflight.set(pdfPath, task);
  return task;
}

type Props = {
  pdfPath: string | null;
  title: string;
  className?: string;
  completed?: boolean;
};

const PdfThumbnail = ({ pdfPath, title, className, completed }: Props) => {
  const [url, setUrl] = useState<string | null>(pdfPath ? cache.get(pdfPath) || null : null);
  const [loading, setLoading] = useState(!url && !!pdfPath);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!pdfPath || url) return;
    setLoading(true);
    renderFirstPage(pdfPath).then((result) => {
      if (!mounted.current) return;
      setUrl(result);
      setLoading(false);
    });
  }, [pdfPath, url]);

  return (
    <div className={`relative w-full h-full bg-gradient-to-br from-primary/30 via-primary/10 to-background flex items-center justify-center overflow-hidden ${className || ""}`}>
      {url ? (
        <img src={url} alt={title} className="w-full h-full object-cover" loading="lazy" />
      ) : loading ? (
        <Loader2 className="w-6 h-6 animate-spin text-foreground/40" />
      ) : (
        <BookOpen className="w-8 h-8 text-foreground/40" />
      )}
      {completed && (
        <div className="absolute top-2 right-2 bg-background/90 rounded-full p-0.5 shadow-md">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/20" strokeWidth={2.5} />
        </div>
      )}
    </div>
  );
};

export default PdfThumbnail;
