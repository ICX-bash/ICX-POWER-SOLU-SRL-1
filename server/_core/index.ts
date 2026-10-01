import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerMicrosoftAdminAuthRoutes } from "./microsoftAdmin";
import { registerMicrosoftAdminDownloadRoutes } from "./microsoftAdminDownloads";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { ENV } from "./env";

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.set("trust proxy", 1);
  // Keep readiness independent from optional database, storage and OAuth integrations.
  app.get("/healthz", (_req, res) => {
    const llmConfigured = Boolean(ENV.llmApiKey.trim());
    const geminiConfigured = Boolean(ENV.geminiApiKey.trim());
    const assistantConfigured = Boolean(
      ENV.aiPreferredProvider === "gemini"
        ? geminiConfigured || (ENV.aiEnableFallback && llmConfigured)
        : llmConfigured || (ENV.aiEnableFallback && geminiConfigured)
    );
    return res.status(200).json({
      status: "ok",
      assistantReady: assistantConfigured,
      assistantConfigured,
      assistantHealth: "configuration-only",
    });
  });
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerStorageProxy(app);
  registerMicrosoftAdminAuthRoutes(app); // Separate Microsoft sign-in for /admin only.
  registerMicrosoftAdminDownloadRoutes(app);

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = Number.parseInt(process.env.PORT || "3000", 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT value: ${process.env.PORT}`);
  }
  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on 0.0.0.0:${port}`);
  });
}

startServer().catch(console.error);
