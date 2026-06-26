// Shared admin session verification helper
// Used by all /admin/* pages

const SESSION_SECRET = import.meta.env.SESSION_SECRET || crypto.randomUUID();

export async function signAdminSession(): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(SESSION_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const payload = `admin_authenticated:${Date.now()}`;
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const signature = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return `${payload}.${signature}`;
}

export async function verifyAdminSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const [payload, signature] = parts;
    
    // Check expiration (7 days)
    const timestamp = parseInt(payload.split(':')[1] || "0", 10);
    if (Date.now() - timestamp > 7 * 24 * 60 * 60 * 1000) return false;

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", enc.encode(SESSION_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
    const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));
    return expected === signature && payload.startsWith("admin_authenticated:");
  } catch {
    return false;
  }
}
