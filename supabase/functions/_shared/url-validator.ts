// SSRF-safe URL validator for fetching user-supplied image URLs.
//
// Validates:
//   - protocol === "https:"
//   - hostname is in the allowlist (Supabase storage host + TRUSTED_IMAGE_HOSTS env)
//   - resolved IPv4 / IPv6 addresses are NOT in private / loopback / link-local
//     / multicast ranges (RFC 1918, 127/8, 169.254/16, ::1, fc00::/7, etc.)

const PRIVATE_V4_PATTERNS: RegExp[] = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
  /^0\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // 100.64.0.0/10 (CGNAT)
  /^224\./, // multicast
  /^240\./, // reserved
];

function isPrivateV4(ip: string): boolean {
  return PRIVATE_V4_PATTERNS.some((rx) => rx.test(ip));
}

function isPrivateV6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fe80:") || lower.startsWith("fec0:")) return true; // link/site-local
  if (/^f[cd][0-9a-f]{2}:/.test(lower)) return true; // fc00::/7 unique-local
  if (lower.startsWith("ff")) return true; // multicast
  // IPv4-mapped (::ffff:a.b.c.d) — extract and check the embedded v4 address.
  const v4mapped = lower.match(/::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
  if (v4mapped) return isPrivateV4(v4mapped[1]);
  return false;
}

function defaultAllowedHosts(): string[] {
  const supaUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const hosts: string[] = [];
  try {
    if (supaUrl) hosts.push(new URL(supaUrl).hostname);
  } catch { /* ignore */ }
  const extra = Deno.env.get("TRUSTED_IMAGE_HOSTS") ?? "";
  for (const h of extra.split(",").map((s) => s.trim()).filter(Boolean)) {
    hosts.push(h);
  }
  return hosts;
}

export interface UrlValidationResult {
  ok: boolean;
  reason?: string;
}

/**
 * Validate a user-supplied image URL. Throws nothing — returns a result.
 *
 * @param raw  URL string from the user.
 * @param extraAllowedHosts  Optional additional allowed hostnames.
 */
export async function validateExternalImageUrl(
  raw: string,
  extraAllowedHosts: string[] = [],
): Promise<UrlValidationResult> {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, reason: "invalid_url" };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, reason: "https_required" };
  }

  const allowed = new Set([...defaultAllowedHosts(), ...extraAllowedHosts]);
  const host = parsed.hostname.toLowerCase();
  const allowedHost = [...allowed].some((h) => host === h.toLowerCase() || host.endsWith("." + h.toLowerCase()));
  if (!allowedHost) {
    return { ok: false, reason: "host_not_allowed" };
  }

  // Resolve DNS and reject if the resolved IP is private/loopback/link-local.
  try {
    const aRecords = await Deno.resolveDns(host, "A").catch(() => [] as string[]);
    const aaaaRecords = await Deno.resolveDns(host, "AAAA").catch(() => [] as string[]);
    if (aRecords.length === 0 && aaaaRecords.length === 0) {
      return { ok: false, reason: "dns_no_records" };
    }
    for (const ip of aRecords) {
      if (isPrivateV4(ip)) return { ok: false, reason: "resolved_to_private_ip" };
    }
    for (const ip of aaaaRecords) {
      if (isPrivateV6(ip)) return { ok: false, reason: "resolved_to_private_ip" };
    }
  } catch (e) {
    return { ok: false, reason: "dns_resolution_failed" };
  }

  return { ok: true };
}
