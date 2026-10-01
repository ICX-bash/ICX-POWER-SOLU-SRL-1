import type { Express } from "express";
import { getServiceDocumentByFileKey } from "../db";
import { sdk } from "./sdk";
import { getMicrosoftAdminSessionUser } from "./microsoftAdmin";
import { ENV } from "./env";
import { localStoragePath } from "../storage";
import fs from "node:fs/promises";

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key || key.includes("..") || key.includes("\\")) {
      res.status(404).send("Document introuvable");
      return;
    }

    try {
      const adminUser = await getMicrosoftAdminSessionUser(req);
      const user = adminUser ?? await sdk.authenticateRequest(req).catch(() => null);
      if (!user) {
        res.status(401).send("Connexion requise");
        return;
      }
      const document = await getServiceDocumentByFileKey(key);
      if (!document || (!adminUser && document.userId !== user.id)) {
        res.status(404).send("Document introuvable");
        return;
      }

      // Local fallback files are served directly when Forge is unavailable or when
      // an upload was saved locally after a Forge error.
      try {
        const localPath = localStoragePath(key);
        await fs.access(localPath);
        res.set({ "Cache-Control": "private, no-store", "Content-Type": document.mimeType, "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(document.fileName)}` });
        res.sendFile(localPath);
        return;
      } catch { /* remote Forge path below */ }

      if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
        res.status(404).send("Fichier non disponible");
        return;
      }
      const forgeUrl = new URL("v1/storage/presign/get", ENV.forgeApiUrl.replace(/\/+$/, "") + "/");
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
        signal: AbortSignal.timeout(15_000),
      });
      if (!forgeResp.ok) {
        console.error(`[StorageProxy] Forge returned HTTP ${forgeResp.status}`);
        res.status(502).send("Le fournisseur de stockage est indisponible");
        return;
      }
      const { url } = await forgeResp.json() as { url?: string };
      if (!url) {
        res.status(502).send("URL sécurisée indisponible");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (error) {
      console.error("[StorageProxy] Download failed:", error instanceof Error ? error.message : "unknown error");
      res.status(502).send("Impossible de télécharger le document");
    }
  });
}
