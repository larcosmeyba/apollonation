// Shared CORS allowlist + preflight helper for all Apollo Reborn edge functions.
// Replaces the previous "Access-Control-Allow-Origin: *" pattern.
//
// Allowed origins by default:
//   - Production web/custom domains (apolloreborn.com etc.)
//   - apollonation.lovable.app (published Lovable URL)
//   - Any *.lovable.app preview subdomain
//   - capacitor://localhost & http://localhost (native shells / dev)
//   - http://localhost:* dev ports (Vite, etc.)
//
// Override via ALLOWED_ORIGINS env (comma-separated) to add more origins.

const STATIC_ALLOWED: string[] = [
  "https://apolloreborn.com",
  "https://www.apolloreborn.com",
  "https://www-apollo.com",
  "https://apollonation.lovable.app",
  "capacitor://localhost",
  "http://localhost",
  "http://localhost:5173",
  "http://localhost:4173",
  "http://localhost:8080",
  "http://localhost:3000",
];

const REGEX_ALLOWED: RegExp[] = [
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/i,           // *.lovable.app previews
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/i,    // sandbox previews
  /^http:\/\/localhost:\d+$/i,                        // any localhost port
];

function envAllowed(): string[] {
  const raw = Deno.env.get("ALLOWED_ORIGINS") ?? "";
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
}

function isAllowed(origin: string): boolean {
  if (!origin) return false;
  if (STATIC_ALLOWED.includes(origin)) return true;
  if (envAllowed().includes(origin)) return true;
  return REGEX_ALLOWED.some((rx) => rx.test(origin));
}

const ALLOW_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";

const ALLOW_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";

/**
 * Build CORS headers for a request. Echoes the request Origin only when it
 * matches the allowlist. Falls back to the canonical production origin so
 * disallowed callers still receive a non-* header (they will be blocked by
 * the browser, which is the desired behavior).
 */
export function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = isAllowed(origin) ? origin : STATIC_ALLOWED[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": ALLOW_HEADERS,
    "Access-Control-Allow-Methods": ALLOW_METHODS,
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

/**
 * Handles CORS preflight OPTIONS requests. Returns null when the request is
 * not a preflight so the caller can continue normal handling.
 */
export function handlePreflight(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: buildCorsHeaders(req) });
  }
  return null;
}

/**
 * Convenience JSON response with CORS headers attached.
 */
export function jsonResponse(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
  });
}
