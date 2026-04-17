// Universal 1080x1080 share card generator using Canvas.
// Works on web (download/Web Share API) and Capacitor.

export interface ShareCardData {
  title: string;       // Top eyebrow, e.g. "Workout Complete"
  headline: string;    // Big text
  subline?: string;    // Smaller line under headline
  stat?: string;       // Optional metric, e.g. "4 workouts this week"
}

export async function generateShareImage(data: ShareCardData): Promise<Blob> {
  const size = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, size, size);

  // Subtle radial vignette accent
  const grad = ctx.createRadialGradient(size / 2, size / 2, 100, size / 2, size / 2, size);
  grad.addColorStop(0, "rgba(255,255,255,0.06)");
  grad.addColorStop(1, "rgba(0,0,0,0.9)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Border frame
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 4;
  ctx.strokeRect(40, 40, size - 80, size - 80);

  ctx.textAlign = "center";

  // Eyebrow
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "600 28px system-ui, -apple-system, sans-serif";
  ctx.fillText(data.title.toUpperCase(), size / 2, 220);

  // Headline (auto-fit)
  ctx.fillStyle = "#ffffff";
  let fontSize = 120;
  ctx.font = `700 ${fontSize}px system-ui, -apple-system, sans-serif`;
  while (ctx.measureText(data.headline).width > size - 160 && fontSize > 48) {
    fontSize -= 6;
    ctx.font = `700 ${fontSize}px system-ui, -apple-system, sans-serif`;
  }
  ctx.fillText(data.headline, size / 2, size / 2);

  // Subline
  if (data.subline) {
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "500 36px system-ui, -apple-system, sans-serif";
    ctx.fillText(data.subline, size / 2, size / 2 + 90);
  }

  // Stat
  if (data.stat) {
    ctx.fillStyle = "#ffffff";
    ctx.font = "600 44px system-ui, -apple-system, sans-serif";
    ctx.fillText(data.stat, size / 2, size - 280);
  }

  // Brand footer
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "700 42px system-ui, -apple-system, sans-serif";
  ctx.fillText("APOLLO REBORN", size / 2, size - 140);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "500 24px system-ui, -apple-system, sans-serif";
  ctx.fillText("apollonation.com", size / 2, size - 90);

  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b!), "image/png", 0.95);
  });
}

export async function shareImage(blob: Blob, filename = "apollo-share.png") {
  const file = new File([blob], filename, { type: "image/png" });
  // Try Web Share API (works on iOS Safari, Android, Capacitor)
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Apollo Reborn" });
      return;
    } catch {
      // user cancelled — fall through to download
    }
  }
  // Fallback: download
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
