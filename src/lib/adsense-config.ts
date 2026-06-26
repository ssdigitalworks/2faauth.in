/**
 * Google AdSense environment guard.
 *
 * Ads will ONLY render when:
 *   - the host is the published domain (not localhost / lovable preview)
 *   - the page is not inside an iframe
 *   - the user has granted "ads" consent
 */

const BLOCKED_HOST_PREFIXES = ["id-preview--", "preview--"];
const BLOCKED_HOST_SUFFIXES = [
  ".lovableproject.com",
  ".lovableproject-dev.com",
  ".lovable.app", // staging *.lovable.app domains; published custom domain is fine
  ".beta.lovable.dev",
];

export function isAdsenseAllowedHost(): boolean {
  if (typeof window === "undefined") return false;
  // Block inside iframes (Lovable editor preview)
  try {
    if (window.self !== window.top) return false;
  } catch {
    return false;
  }
  const host = window.location.hostname;
  if (!host) return false;
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) return false;
  if (BLOCKED_HOST_PREFIXES.some((p) => host.startsWith(p))) return false;
  if (BLOCKED_HOST_SUFFIXES.some((s) => host.endsWith(s))) return false;
  return true;
}
