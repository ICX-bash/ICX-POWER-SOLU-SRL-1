import type { Express } from "express";
import { getMicrosoftAdminSessionUser, getOutlookAttachmentContent } from "./microsoftAdmin";
import { ENV } from "./env";

export function registerMicrosoftAdminDownloadRoutes(app: Express) {
  app.get("/api/admin/outlook/attachments/:messageId/:attachmentId", async (req, res) => {
    const admin = await getMicrosoftAdminSessionUser(req);
    if (!admin || admin.role !== "admin" || admin.email?.trim().toLowerCase() !== ENV.superAdminEmail) {
      res.status(401).send("Accès administrateur requis");
      return;
    }
    try {
      const attachment = await getOutlookAttachmentContent(req.params.messageId, req.params.attachmentId);
      const filename = attachment.fileName.replace(/[\r\n"\\/]/g, "_").slice(0, 180) || "outlook-attachment";
      const mimeType = /^[\w.+-]+\/[\w.+-]+$/.test(attachment.contentType) ? attachment.contentType : "application/octet-stream";
      res.set({
        "Content-Type": mimeType,
        "Content-Length": String(attachment.content.byteLength),
        "Content-Disposition": `attachment; filename="${filename.replace(/[^\x20-\x7E]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.status(200).send(attachment.content);
    } catch (error) {
      console.warn("[Admin Outlook] Attachment download failed:", error instanceof Error ? error.message : "unknown error");
      res.status(502).send("Téléchargement de la pièce jointe Outlook impossible");
    }
  });
}
