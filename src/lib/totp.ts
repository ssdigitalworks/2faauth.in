import { TOTP, Secret } from "otpauth";

export type Digits = 6 | 8;

export interface AccountInput {
  issuer: string;
  label: string;
  secret: string;
  digits?: Digits;
  period?: number;
  algorithm?: "SHA1" | "SHA256" | "SHA512";
}

export interface Account extends Required<AccountInput> {
  id: string;
  createdAt: number;
}

export function generateSecret(bytes = 20): string {
  return new Secret({ size: bytes }).base32;
}

export function normalizeSecret(input: string): string {
  return input.replace(/\s+/g, "").toUpperCase();
}

export function isValidSecret(input: string): boolean {
  const s = normalizeSecret(input);
  if (s.length < 8) return false;
  return /^[A-Z2-7]+=*$/.test(s);
}

export function buildTOTP(a: AccountInput): TOTP {
  return new TOTP({
    issuer: a.issuer,
    label: a.label,
    algorithm: a.algorithm ?? "SHA1",
    digits: a.digits ?? 6,
    period: a.period ?? 30,
    secret: Secret.fromBase32(normalizeSecret(a.secret)),
  });
}

export function currentCode(a: AccountInput, at = Date.now()): string {
  try {
    return buildTOTP(a).generate({ timestamp: at });
  } catch {
    return "—".repeat(a.digits ?? 6);
  }
}

export function secondsRemaining(period = 30, at = Date.now()): number {
  return period - Math.floor(at / 1000) % period;
}

export function otpauthURL(a: AccountInput): string {
  return buildTOTP(a).toString();
}

export async function qrDataURL(text: string, opts?: { dark?: boolean; size?: number }): Promise<string> {
  const { toDataURL } = await import("qrcode");
  return toDataURL(text, {
    margin: 1,
    width: opts?.size ?? 320,
    color: {
      dark: opts?.dark ? "#ffffff" : "#0a0a0a",
      light: opts?.dark ? "#00000000" : "#ffffff",
    },
    errorCorrectionLevel: "M",
  });
}

export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  for (let i = 0; i < count; i++) {
    let c = "";
    const arr = new Uint8Array(10);
    crypto.getRandomValues(arr);
    for (let j = 0; j < 10; j++) {
      c += chars[arr[j] % chars.length];
      if (j === 4) c += "-";
    }
    codes.push(c);
  }
  return codes;
}
