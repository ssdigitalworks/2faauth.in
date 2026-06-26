// Saved 2FA accounts — localStorage-backed with optional AES-GCM encryption.
import { isValidSecret, normalizeSecret } from "@/lib/totp";
import { decryptBlob, encryptString, type EncryptedBlob } from "@/lib/saved-encryption";

export interface SavedAccount {
  id: string;
  title: string;
  issuer: string;
  secret: string;
  digits: 6 | 8;
  period: number;
  algorithm: "SHA1" | "SHA256" | "SHA512";
  createdAt: string;
}

const KEY = "tfa.saved-accounts.v1";
const ENC_KEY = "tfa.saved-accounts.enc.v1";
const EVENT = "tfa:saved-accounts:changed";

export const EMPTY: SavedAccount[] = [];

// In-memory state for unlocked encrypted vaults. Passphrase is held only in
// memory for the current session and never persisted.
let unlockedAccounts: SavedAccount[] | null = null;
let sessionPassphrase: string | null = null;

// Plaintext snapshot cache for stable references between renders.
let cachedRaw: string | null = null;
let cachedAccounts: SavedAccount[] = EMPTY;

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function hasEncryptedBlob(): boolean {
  if (!isBrowser()) return false;
  return localStorage.getItem(ENC_KEY) !== null;
}

export type VaultMode = "plain" | "encrypted-locked" | "encrypted-unlocked";

export function getVaultMode(): VaultMode {
  if (!isBrowser()) return "plain";
  if (hasEncryptedBlob()) {
    return unlockedAccounts !== null ? "encrypted-unlocked" : "encrypted-locked";
  }
  return "plain";
}

function readPlainSnapshot(): SavedAccount[] {
  if (!isBrowser()) return EMPTY;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === cachedRaw) return cachedAccounts;
    if (!raw) {
      cachedRaw = null;
      cachedAccounts = EMPTY;
      return EMPTY;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      cachedRaw = raw;
      cachedAccounts = EMPTY;
      return EMPTY;
    }
    const valid = parsed.filter(isValidAccount);
    cachedRaw = raw;
    cachedAccounts = valid.length === 0 ? EMPTY : valid;
    return cachedAccounts;
  } catch {
    cachedRaw = null;
    cachedAccounts = EMPTY;
    return EMPTY;
  }
}

export function loadSavedAccounts(): SavedAccount[] {
  if (!isBrowser()) return EMPTY;
  const mode = getVaultMode();
  if (mode === "encrypted-locked") return EMPTY;
  if (mode === "encrypted-unlocked") return unlockedAccounts ?? EMPTY;
  return readPlainSnapshot();
}

function notify() {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(EVENT));
}

async function persist(list: SavedAccount[]) {
  if (!isBrowser()) return;
  const mode = getVaultMode();
  if (mode === "encrypted-locked") {
    throw new Error("Vault is locked.");
  }
  if (mode === "encrypted-unlocked") {
    if (!sessionPassphrase) {
      throw new Error("Vault state inconsistent — please re-unlock");
    }
    const blob = await encryptString(JSON.stringify(list), sessionPassphrase);
    localStorage.setItem(ENC_KEY, JSON.stringify(blob));
    unlockedAccounts = list;
  } else {
    localStorage.setItem(KEY, JSON.stringify(list));
    cachedRaw = null;
    cachedAccounts = EMPTY;
  }
  notify();
}

export function subscribeSavedAccounts(fn: () => void): () => void {
  if (!isBrowser()) return () => {};
  const handler = () => fn();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface SaveAccountInput {
  title: string;
  issuer?: string;
  secret: string;
  digits?: 6 | 8;
  period?: number;
  algorithm?: "SHA1" | "SHA256" | "SHA512";
}

export function isValidAccount(x: unknown): x is SavedAccount {
  if (!x || typeof x !== "object") return false;
  const a = x as Record<string, unknown>;
  return (
    typeof a.id === "string" &&
    typeof a.title === "string" &&
    typeof a.secret === "string" &&
    isValidSecret(a.secret as string) &&
    (a.digits === 6 || a.digits === 8) &&
    typeof a.period === "number" &&
    (a.algorithm === "SHA1" || a.algorithm === "SHA256" || a.algorithm === "SHA512") &&
    typeof a.createdAt === "string"
  );
}

export function isDuplicateSecret(secret: string, list = loadSavedAccounts()): boolean {
  const norm = normalizeSecret(secret);
  return list.some((a) => a.secret === norm);
}

export async function addAccount(input: SaveAccountInput): Promise<SavedAccount | null> {
  const secret = normalizeSecret(input.secret);
  if (!isValidSecret(secret)) return null;
  const list = loadSavedAccounts();
  if (list.some((a) => a.secret === secret)) return null;
  const account: SavedAccount = {
    id: uid(),
    title: sanitizeText(input.title) || "Untitled",
    issuer: sanitizeText(input.issuer ?? ""),
    secret,
    digits: input.digits ?? 6,
    period: input.period ?? 30,
    algorithm: input.algorithm ?? "SHA1",
    createdAt: new Date().toISOString(),
  };
  await persist([account, ...list]);
  return account;
}

export async function deleteAccount(id: string): Promise<SavedAccount[]> {
  const list = loadSavedAccounts();
  const removed = list.filter((a) => a.id === id);
  await persist(list.filter((a) => a.id !== id));
  return removed;
}

export async function deleteMany(ids: string[]): Promise<SavedAccount[]> {
  const list = loadSavedAccounts();
  const set = new Set(ids);
  const removed = list.filter((a) => set.has(a.id));
  await persist(list.filter((a) => !set.has(a.id)));
  return removed;
}

export async function clearAll(): Promise<SavedAccount[]> {
  const removed = loadSavedAccounts();
  await persist([]);
  return removed;
}

export async function renameAccount(id: string, title: string) {
  await persist(
    loadSavedAccounts().map((a) =>
      a.id === id ? { ...a, title: sanitizeText(title) || a.title } : a,
    ),
  );
}

/** Restore previously-deleted accounts (used by the undo snackbar). */
export async function restoreAccounts(items: SavedAccount[]) {
  if (items.length === 0) return;
  const list = loadSavedAccounts();
  const have = new Set(list.map((a) => a.secret));
  const toRestore = items.filter((a) => !have.has(a.secret));
  if (toRestore.length === 0) return;
  await persist([...toRestore, ...list]);
}

export function sanitizeText(s: string): string {
  return s.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 80);
}

export function exportJSON(): string {
  return JSON.stringify(
    { version: 1, exportedAt: new Date().toISOString(), accounts: loadSavedAccounts() },
    null,
    2,
  );
}

export function exportTXT(): string {
  return loadSavedAccounts()
    .map(
      (a) =>
        `Title: ${a.title}\nIssuer: ${a.issuer}\nSecret: ${a.secret}\nDigits: ${a.digits}\nPeriod: ${a.period}\nAlgorithm: ${a.algorithm}\nCreated: ${a.createdAt}\n`,
    )
    .join("\n----\n\n");
}

export interface ImportError {
  index: number;
  reason: string;
}
export interface ImportResult {
  added: number;
  skipped: number;
  invalid: number;
  errors: ImportError[];
}

function coerceRecord(raw: unknown, idx: number): { ok: true; account: SavedAccount } | { ok: false; reason: string } {
  if (!raw || typeof raw !== "object") return { ok: false, reason: `Entry #${idx + 1}: not an object.` };
  const r = raw as Record<string, unknown>;
  if (typeof r.secret !== "string") return { ok: false, reason: `Entry #${idx + 1}: missing "secret".` };
  const secret = normalizeSecret(r.secret);
  if (!isValidSecret(secret)) return { ok: false, reason: `Entry #${idx + 1}: invalid base32 secret.` };
  const acc: SavedAccount = {
    id: typeof r.id === "string" ? r.id : uid(),
    title: sanitizeText(typeof r.title === "string" ? r.title : "Imported"),
    issuer: sanitizeText(typeof r.issuer === "string" ? r.issuer : ""),
    secret,
    digits: r.digits === 8 ? 8 : 6,
    period:
      typeof r.period === "number" && r.period > 0 && r.period <= 300 ? r.period : 30,
    algorithm:
      r.algorithm === "SHA256" || r.algorithm === "SHA512" ? r.algorithm : "SHA1",
    createdAt:
      typeof r.createdAt === "string" ? r.createdAt : new Date().toISOString(),
  };
  return { ok: true, account: acc };
}

function parseTXT(text: string): unknown[] {
  // Split by separator or blank-line groups; collect "Key: value" pairs into objects.
  const blocks = text.split(/\n-{3,}\n|\r?\n\r?\n/);
  const out: Record<string, unknown>[] = [];
  for (const block of blocks) {
    const obj: Record<string, unknown> = {};
    let saw = false;
    for (const line of block.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z]+)\s*:\s*(.*)$/);
      if (!m) continue;
      const key = m[1].toLowerCase();
      const val = m[2].trim();
      if (!val) continue;
      saw = true;
      if (key === "digits") obj.digits = Number(val);
      else if (key === "period") obj.period = Number(val);
      else if (key === "algorithm") obj.algorithm = val.toUpperCase();
      else if (key === "created") obj.createdAt = val;
      else obj[key] = val;
    }
    if (saw) out.push(obj);
  }
  return out;
}

export async function importFromText(text: string, kind: "json" | "txt" | "auto" = "auto"): Promise<ImportResult> {
  let candidates: unknown[] = [];
  const trimmed = text.trim();
  const looksJson = kind === "json" || (kind === "auto" && (trimmed.startsWith("{") || trimmed.startsWith("[")));

  if (looksJson) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch (e) {
      throw new Error(`Invalid JSON: ${e instanceof Error ? e.message : "could not parse"}`);
    }
    if (Array.isArray(parsed)) candidates = parsed;
    else if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as { accounts?: unknown }).accounts)
    ) {
      candidates = (parsed as { accounts: unknown[] }).accounts;
    } else {
      throw new Error('JSON does not contain an "accounts" array.');
    }
  } else {
    candidates = parseTXT(trimmed);
    if (candidates.length === 0) throw new Error("No recognizable entries found in TXT file.");
  }

  const current = loadSavedAccounts();
  const seen = new Set(current.map((a) => a.secret));
  const result: ImportResult = { added: 0, skipped: 0, invalid: 0, errors: [] };
  const next = [...current];

  candidates.forEach((raw, idx) => {
    const parsed = coerceRecord(raw, idx);
    if (!parsed.ok) {
      result.invalid++;
      result.errors.push({ index: idx, reason: parsed.reason });
      return;
    }
    if (seen.has(parsed.account.secret)) {
      result.skipped++;
      return;
    }
    next.unshift(parsed.account);
    seen.add(parsed.account.secret);
    result.added++;
  });

  if (result.added > 0) await persist(next);
  return result;
}

// ─── Encryption controls ────────────────────────────────────────────────────

export async function enableEncryption(passphrase: string): Promise<void> {
  if (!isBrowser()) return;
  if (!passphrase || passphrase.length < 6) throw new Error("Passphrase must be at least 6 characters.");
  if (hasEncryptedBlob()) throw new Error("Encryption is already enabled.");
  const current = readPlainSnapshot();
  const blob = await encryptString(JSON.stringify(current), passphrase);
  localStorage.setItem(ENC_KEY, JSON.stringify(blob));
  localStorage.removeItem(KEY);
  cachedRaw = null;
  cachedAccounts = EMPTY;
  unlockedAccounts = current;
  sessionPassphrase = passphrase;
  notify();
}

export async function unlock(passphrase: string): Promise<void> {
  if (!isBrowser()) return;
  const raw = localStorage.getItem(ENC_KEY);
  if (!raw) throw new Error("No encrypted vault exists.");
  const blob = JSON.parse(raw) as EncryptedBlob;
  const plaintext = await decryptBlob(blob, passphrase);
  const parsed = JSON.parse(plaintext);
  if (!Array.isArray(parsed)) throw new Error("Vault contents are malformed.");
  unlockedAccounts = parsed.filter(isValidAccount);
  sessionPassphrase = passphrase;
  notify();
}

export function lock(): void {
  unlockedAccounts = null;
  sessionPassphrase = null;
  notify();
}

export async function disableEncryption(passphrase: string): Promise<void> {
  if (!isBrowser()) return;
  if (!hasEncryptedBlob()) return;
  // Always re-verify with passphrase even if currently unlocked.
  const raw = localStorage.getItem(ENC_KEY)!;
  const blob = JSON.parse(raw) as EncryptedBlob;
  const plaintext = await decryptBlob(blob, passphrase);
  const parsed = JSON.parse(plaintext);
  if (!Array.isArray(parsed)) throw new Error("Vault contents are malformed.");
  localStorage.setItem(KEY, JSON.stringify(parsed.filter(isValidAccount)));
  localStorage.removeItem(ENC_KEY);
  unlockedAccounts = null;
  sessionPassphrase = null;
  cachedRaw = null;
  cachedAccounts = EMPTY;
  notify();
}

export async function changePassphrase(oldPass: string, newPass: string): Promise<void> {
  if (!isBrowser()) return;
  if (!newPass || newPass.length < 6) throw new Error("Passphrase must be at least 6 characters.");
  const raw = localStorage.getItem(ENC_KEY);
  if (!raw) throw new Error("No encrypted vault exists.");
  const blob = JSON.parse(raw) as EncryptedBlob;
  const plaintext = await decryptBlob(blob, oldPass);
  const reBlob = await encryptString(plaintext, newPass);
  localStorage.setItem(ENC_KEY, JSON.stringify(reBlob));
  sessionPassphrase = newPass;
  notify();
}
