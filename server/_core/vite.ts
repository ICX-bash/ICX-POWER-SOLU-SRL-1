import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

function isAdminPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

const FINGERPRINTED_ASSET = /-[a-z0-9_-]{8}\.(?:js|css|mjs|woff2?|ttf|otf)$/i;

export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true as const,
    },
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const htmlFile = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        isAdminPath(req.path) ? "admin.html" : "index.html"
      );
      let template = await fs.promises.readFile(htmlFile, "utf-8");
      const entry = isAdminPath(req.path)
        ? "/src/admin-main.tsx"
        : "/src/main.tsx";
      template = template.replace(
        `src="${entry}"`,
        `src="${entry}?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (error) {
      vite.ssrFixStacktrace(error as Error);
      next(error);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.get(/^\/admin(?:\/.*)?$/, (_req, res, next) => {
    const adminHtml = path.resolve(distPath, "admin.html");
    if (fs.existsSync(adminHtml)) return res.sendFile(adminHtml);
    return next();
  });
  app.use(
    express.static(distPath, {
      index: false,
      setHeaders(res, filePath) {
        if (!filePath.includes(`${path.sep}assets${path.sep}`)) return;

        const isFingerprint = FINGERPRINTED_ASSET.test(path.basename(filePath));
        res.setHeader(
          "Cache-Control",
          isFingerprint
            ? "public, max-age=31536000, immutable"
            : "public, max-age=86400, stale-while-revalidate=604800"
        );
      },
    })
  );
  app.get("*", (_req, res) =>
    res.sendFile(path.resolve(distPath, "index.html"))
  );
}
