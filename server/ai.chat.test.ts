import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(async () => ({
    choices: [{ message: { content: "Réponse ICX test" } }],
  })),
}));

vi.mock("./_core/gemini", () => ({
  invokeGeminiChat: vi.fn(async () => "Réponse Gemini test"),
}));

vi.mock("./_core/env", async importOriginal => {
  const actual = await importOriginal<typeof import("./_core/env")>();
  return {
    ...actual,
    ENV: {
      ...actual.ENV,
      llmApiKey: actual.ENV.llmApiKey || "test-primary-key",
      geminiApiKey: "test-gemini-key",
      geminiModel: "gemini-2.5-flash",
      aiPreferredProvider: "gemini",
      aiEnableFallback: false,
    },
  };
});

import { ENV } from "./_core/env";
import { invokeGeminiChat } from "./_core/gemini";
import { invokeLLM } from "./_core/llm";
import { appRouter } from "./routers";

const originalPreferredProvider = ENV.aiPreferredProvider;
const originalFallbackEnabled = ENV.aiEnableFallback;
const createCaller = () =>
  appRouter.createCaller({
    user: undefined,
    req: {} as any,
    res: {} as any,
  });

const userMessage = {
  messages: [
    { role: "user" as const, content: "Comment préparer un projet d'études ?" },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  ENV.aiPreferredProvider = "gemini";
  ENV.aiEnableFallback = false;
});

afterEach(() => {
  ENV.aiPreferredProvider = originalPreferredProvider;
  ENV.aiEnableFallback = originalFallbackEnabled;
});

describe("ai.chat", () => {
  it("uses the free Gemini-only configuration by default", async () => {
    const result = await createCaller().ai.chat(userMessage);

    expect(result).toEqual({ content: "Réponse Gemini test" });
    expect(invokeGeminiChat).toHaveBeenCalledOnce();
    expect(invokeLLM).not.toHaveBeenCalled();
  });

  it("returns the primary response with GPT-5's supported token limit when selected", async () => {
    ENV.aiPreferredProvider = "llm";
    ENV.aiEnableFallback = true;

    const result = await createCaller().ai.chat(userMessage);

    expect(result).toEqual({ content: "Réponse ICX test" });
    expect(invokeLLM).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-5-mini",
        reasoning: { effort: "medium" },
        maxCompletionTokens: 1200,
      })
    );
    expect(invokeGeminiChat).not.toHaveBeenCalled();
  });

  it("falls back to Gemini when the primary LLM fails and fallback is enabled", async () => {
    ENV.aiPreferredProvider = "llm";
    ENV.aiEnableFallback = true;
    vi.mocked(invokeLLM).mockRejectedValueOnce(
      new Error("primary unavailable")
    );

    const result = await createCaller().ai.chat(userMessage);

    expect(result).toEqual({ content: "Réponse Gemini test" });
    expect(invokeGeminiChat).toHaveBeenCalledWith(
      expect.objectContaining({
        maxOutputTokens: 1200,
        messages: userMessage.messages,
      })
    );
  });

  it("falls back to the primary LLM when preferred Gemini fails and fallback is enabled", async () => {
    ENV.aiEnableFallback = true;
    vi.mocked(invokeGeminiChat).mockRejectedValueOnce(
      new Error("Gemini temporarily unavailable")
    );

    const result = await createCaller().ai.chat(userMessage);

    expect(result).toEqual({ content: "Réponse ICX test" });
    expect(invokeGeminiChat).toHaveBeenCalledOnce();
    expect(invokeLLM).toHaveBeenCalledOnce();
  });

  it("does not call a secondary provider when free-only mode is selected", async () => {
    vi.mocked(invokeGeminiChat).mockRejectedValueOnce(
      new Error("Gemini quota exceeded")
    );

    await expect(createCaller().ai.chat(userMessage)).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
      message:
        "ICX Intelligence est momentanément indisponible. Réessayez dans quelques instants.",
    });
    expect(invokeGeminiChat).toHaveBeenCalledOnce();
    expect(invokeLLM).not.toHaveBeenCalled();
  });

  it("returns a safe service-unavailable error when all providers in hybrid mode fail", async () => {
    ENV.aiEnableFallback = true;
    vi.mocked(invokeLLM).mockRejectedValueOnce(
      new Error("private primary response")
    );
    vi.mocked(invokeGeminiChat).mockRejectedValueOnce(
      new Error("private Gemini response")
    );

    await expect(createCaller().ai.chat(userMessage)).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
      message:
        "ICX Intelligence est momentanément indisponible. Réessayez dans quelques instants.",
    });
  });
});
