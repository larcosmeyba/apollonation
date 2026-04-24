// Shared helper to authenticate cron-triggered edge functions via a static
// shared secret header (`x-cron-secret`) matched against the CRON_SECRET env.
//
// Apply at the top of every cron handler that should NOT be reachable by
// regular users. Returns a 401 Response when the secret is missing or wrong;
// returns null when the caller is authorized so the handler can continue.

export function requireCronSecret(req: Request): Response | null {
  const expected = Deno.env.get("CRON_SECRET");
  if (!expected) {
    // Misconfigured server — refuse instead of failing open.
    return new Response("server_misconfigured", { status: 500 });
  }
  const provided = req.headers.get("x-cron-secret");
  if (provided !== expected) {
    return new Response("unauthorized", { status: 401 });
  }
  return null;
}
