// Document storage: Forge/S3 when configured, with a secure local fallback.
// Both user and admin downloads use the authenticated /manus-storage route.
import fs from "node:fs/promises";
import path from "node:path";
import { ENV } from "./_core/env";

export const LOCAL_STORAGE_ROOT = path.resolve(process.env.ICX_LOCAL_STORAGE_DIR || path.join(process.cwd(), "storage-data"));

function normalizeKey(relKey: string): string {
  const key = relKey.replace(/^\/+/, "");
  if (!key || key.includes("..") || key.includes("\\") || path.isAbsolute(key)) throw new Error("Invalid storage key");
  return key;
}
function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  return lastDot === -1 ? `${relKey}_${hash}` : `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}
function forgeBaseUrl(): URL | null {
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) return null;
  try { return new URL(`${ENV.forgeApiUrl.replace(/\/+$/, "")}/`); }
  catch (error) { console.warn("[Storage] Invalid Forge URL; using local storage.", error instanceof Error ? error.message : "unknown error"); return null; }
}
export function localStoragePath(key: string): string {
  const normalized = normalizeKey(key);
  const absolute = path.resolve(LOCAL_STORAGE_ROOT, normalized);
  if (absolute !== LOCAL_STORAGE_ROOT && !absolute.startsWith(`${LOCAL_STORAGE_ROOT}${path.sep}`)) throw new Error("Invalid storage path");
  return absolute;
}
async function saveLocally(key: string, data: Buffer | Uint8Array | string) {
  const filePath = localStoragePath(key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, typeof data === "string" ? Buffer.from(data) : Buffer.from(data), { flag: "wx" });
}
async function putToForge(key: string, data: Buffer | Uint8Array | string, contentType: string, base: URL) {
  const presignUrl = new URL("v1/storage/presign/put", base);
  presignUrl.searchParams.set("path", key);
  const presignResp = await fetch(presignUrl, { headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }, signal: AbortSignal.timeout(15_000) });
  if (!presignResp.ok) throw new Error(`Storage presign failed (${presignResp.status})`);
  const { url: s3Url } = await presignResp.json() as { url?: string };
  if (!s3Url) throw new Error("Forge returned empty presign URL");
  new URL(s3Url);
  const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data as any], { type: contentType });
  const uploadResp = await fetch(s3Url, { method: "PUT", headers: { "Content-Type": contentType }, body: blob, signal: AbortSignal.timeout(60_000) });
  if (!uploadResp.ok) throw new Error(`Storage upload failed (${uploadResp.status})`);
}
export async function storagePut(relKey: string, data: Buffer | Uint8Array | string, contentType = "application/octet-stream"): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const forge = forgeBaseUrl();
  if (forge) {
    try { await putToForge(key, data, contentType, forge); return { key, url: `/manus-storage/${key}` }; }
    catch (error) { console.warn("[Storage] Forge upload failed; saving locally.", error instanceof Error ? error.message : "unknown error"); }
  }
  await saveLocally(key, data);
  return { key, url: `/manus-storage/${key}` };
}
export async function storageGet(relKey: string): Promise<{ key: string; url: string }> { const key = normalizeKey(relKey); return { key, url: `/manus-storage/${key}` }; }
export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  try { await fs.access(localStoragePath(key)); return `/manus-storage/${key}`; } catch { /* remote Forge file */ }
  const forge = forgeBaseUrl();
  if (!forge) return `/manus-storage/${key}`;
  try {
    const getUrl = new URL("v1/storage/presign/get", forge); getUrl.searchParams.set("path", key);
    const resp = await fetch(getUrl, { headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }, signal: AbortSignal.timeout(15_000) });
    if (!resp.ok) throw new Error(`Storage signed URL failed (${resp.status})`);
    const { url } = await resp.json() as { url?: string };
    if (!url) throw new Error("Forge returned empty download URL");
    new URL(url); return url;
  } catch (error) { console.warn("[Storage] Forge download unavailable; using local route.", error instanceof Error ? error.message : "unknown error"); return `/manus-storage/${key}`; }
}
