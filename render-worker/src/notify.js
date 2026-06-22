// Reports job progress/result back to the Supabase `render-callback` edge
// function, authenticated with the shared worker secret.

const SECRET = process.env.RENDER_WORKER_SECRET;

async function post(callbackUrl, payload) {
  const res = await fetch(callbackUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-worker-secret": SECRET },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`callback ${res.status}: ${txt.slice(0, 300)}`);
  }
}

export function reportProgress({ callbackUrl, jobId }, status) {
  return post(callbackUrl, { jobId, status });
}

export function reportResult({ callbackUrl, jobId }, { mp4_url, duration_seconds, expires_at }) {
  return post(callbackUrl, { jobId, status: "ready", mp4_url, duration_seconds, expires_at });
}

export function reportFailure({ callbackUrl, jobId }, error) {
  return post(callbackUrl, { jobId, status: "failed", error });
}
