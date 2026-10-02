const forgeApiUrl = (process.env.BUILT_IN_FORGE_API_URL ?? "").trim();
const forgeApiKey = (process.env.BUILT_IN_FORGE_API_KEY ?? "").trim();
const openAiApiBase = (process.env.OPENAI_API_BASE ?? "").trim();
const openAiApiKey = (process.env.OPENAI_API_KEY ?? "").trim();
const geminiApiKey = (process.env.GEMINI_API_KEY ?? "").trim();
const geminiModel = (process.env.GEMINI_MODEL ?? "gemini-2.5-flash").trim();
const validBaseUrl = (value: string, fallback: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? value.replace(/\/+$/, "")
      : fallback;
  } catch {
    return fallback;
  }
};
const aiPreferredProvider =
  (process.env.AI_PREFERRED_PROVIDER ?? "llm").trim().toLowerCase() ===
  "gemini"
    ? "gemini"
    : "llm";
const aiEnableFallback =
  (process.env.AI_ENABLE_FALLBACK ?? "false").trim().toLowerCase() !== "false";
const isUsableApiKey = (value: string) =>
  Boolean(value) && !/^(REMPLACEZ|VOTRE_|YOUR_|<)/i.test(value);
const useForgeForLlm = isUsableApiKey(forgeApiKey);

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  superAdminEmail: (
    process.env.SUPER_ADMIN_EMAIL ??
    process.env.ADMIN_EMAIL ??
    "icxps.sale@outlook.com"
  )
    .trim()
    .toLowerCase(),
  isProduction: process.env.NODE_ENV === "production",
  // Keep Forge credentials separate: storage/media integrations use these fields.
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Chat can use the Forge pair, or a standard OpenAI-compatible server-side pair.
  llmApiUrl: useForgeForLlm
    ? validBaseUrl(forgeApiUrl, "https://forge.manus.im")
    : openAiApiBase ||
      (openAiApiKey ? "https://api.openai.com/v1" : "https://forge.manus.im"),
  llmApiKey: useForgeForLlm
    ? forgeApiKey
    : isUsableApiKey(openAiApiKey)
      ? openAiApiKey
      : "",
  // Optional direct Google AI Studio fallback. This secret is server-only.
  geminiApiKey: isUsableApiKey(geminiApiKey) ? geminiApiKey : "",
  geminiModel,
  aiPreferredProvider,
  aiEnableFallback,
};
