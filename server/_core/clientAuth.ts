import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_MAXMEM = 64 * 1024 * 1024;
const scryptAsync = (password: string, salt: Buffer, length: number) =>
  new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, length, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: SCRYPT_MAXMEM }, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey as Buffer);
    });
  });

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function hashPassword(password: string) {
  if (password.length < 12 || password.length > 128) throw new Error("Password must be between 12 and 128 characters");
  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt, SCRYPT_KEY_LENGTH);
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, nValue, rValue, pValue, saltValue, keyValue, ...extra] = encoded.split("$");
  const n = Number(nValue);
  const r = Number(rValue);
  const p = Number(pValue);
  if (algorithm !== "scrypt" || extra.length || n !== SCRYPT_N || r !== SCRYPT_R || p !== SCRYPT_P || !saltValue || !keyValue) return false;
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltValue, "base64url");
    expected = Buffer.from(keyValue, "base64url");
  } catch {
    return false;
  }
  if (salt.length !== 16 || expected.length !== SCRYPT_KEY_LENGTH) return false;
  const actual = await scryptAsync(password, salt, SCRYPT_KEY_LENGTH);
  return timingSafeEqual(actual, expected);
}

export async function burnPasswordVerification(password: string) {
  const salt = Buffer.alloc(16, 0x49);
  await scryptAsync(password.slice(0, 128), salt, SCRYPT_KEY_LENGTH);
}

export function createOneTimeToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashOneTimeToken(token) };
}

export function hashOneTimeToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

type RateEntry = { count: number; resetAt: number };
const rateEntries = new Map<string, RateEntry>();

export function assertAuthRateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  if (rateEntries.size > 10_000) {
    rateEntries.forEach((value, entryKey) => { if (value.resetAt <= now) rateEntries.delete(entryKey); });
    if (rateEntries.size > 10_000) rateEntries.clear();
  }
  const current = rateEntries.get(key);
  if (!current || current.resetAt <= now) {
    rateEntries.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (current.count >= limit) throw new Error("AUTH_RATE_LIMITED");
  current.count += 1;
}
