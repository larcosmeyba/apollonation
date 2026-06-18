import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { pdfjsLib } from "@/lib/pdfjs";

type Props = {
  url: string;
  onReachedEnd?: () => void;
};

const PdfViewer = ({ url, onReachedEnd }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const reachedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    reachedRef.current = false;

    (async () => {
      try {
        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = "";

        const pdf = await pdfjsLib.getDocument({ url }).promise;
        if (cancelled) return;
        setNumPages(pdf.numPages);

        const containerWidth = container.clientWidth || 800;

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          if (cancelled) return;
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = Math.min(2, containerWidth / baseViewport.width);
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.className = "w-full h-auto block mb-3 rounded-md shadow-sm bg-white";
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          canvas.width = viewport.width * dpr;
          canvas.height = viewport.height * dpr;
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          ctx.scale(dpr, dpr);

          container.appendChild(canvas);
          await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
        }
        if (!cancelled) setLoading(false);
      } catch (e: any) {
        console.error("[PdfViewer] error", e);
        if (!cancelled) {
          setError(e?.message || "Failed to load PDF");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    if (!onReachedEnd) return;
    const el = containerRef.current?.parentElement;
    if (!el) return;
    const onScroll = () => {
      if (reachedRef.current) return;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
        reachedRef.current = true;
        onReachedEnd();
      }
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [onReachedEnd, numPages]);

  return (
    <div className="relative w-full h-full overflow-y-auto bg-muted/30 p-3">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-10">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      )}
      {error && (
        <div className="text-center text-sm text-destructive p-6">{error}</div>
      )}
      <div ref={containerRef} className="max-w-3xl mx-auto" />
    </div>
  );
};

export default PdfViewer;
