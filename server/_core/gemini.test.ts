import { afterEach, describe, expect, it, vi } from "vitest";
import { ENV } from "./env";
import { invokeGeminiChat } from "./gemini";

const originalApiKey = ENV.geminiApiKey;
const originalModel = ENV.geminiModel;

afterEach(() => {
  ENV.geminiApiKey = originalApiKey;
  ENV.geminiModel = originalModel;
  vi.unstubAllGlobals();
});

describe("invokeGeminiChat", () => {
  it("sends a server-side Gemini request and omits the initial assistant welcome", async () => {
    ENV.geminiApiKey = "test-secret-never-public";
    ENV.geminiModel = "gemini-3.8-flash";
    const fetchMock = vi.fn(
      async (_url: string | URL | Request, _init?: RequestInit) =>
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: "Réponse de test" }] } }],
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
    );
    vi.stubGlobal("fetch", fetchMock);

    const answer = await invokeGeminiChat({
      systemPrompt: "Tu es ICX Intelligence.",
      messages: [
        { role: "assistant", content: "Bienvenue." },
        { role: "user", content: "Bonjour" },
        { role: "assistant", content: "Bonjour, comment aider ?" },
        { role: "user", content: "Parlez-moi des services." },
      ],
    });

    expect(answer).toBe("Réponse de test");
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/models/gemini-3.8-flash:generateContent");
    expect(init?.headers).toMatchObject({
      "x-goog-api-key": "test-secret-never-public",
    });
    const body = JSON.parse(String(init?.body));
    expect(body.contents).toEqual([
      { role: "user", parts: [{ text: "Bonjour" }] },
      { role: "model", parts: [{ text: "Bonjour, comment aider ?" }] },
      { role: "user", parts: [{ text: "Parlez-moi des services." }] },
    ]);
    expect(body.systemInstruction.parts[0].text).toBe(
      "Tu es ICX Intelligence."
    );
  });

  it("fails clearly when no Gemini key is configured", async () => {
    ENV.geminiApiKey = "";
    await expect(
      invokeGeminiChat({
        systemPrompt: "system",
        messages: [{ role: "user", content: "test" }],
      })
    ).rejects.toThrow("Gemini API key is not configured");
  });

  it("rejects an empty or blocked provider response", async () => {
    ENV.geminiApiKey = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ candidates: [] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          })
      )
    );
    await expect(
      invokeGeminiChat({
        systemPrompt: "system",
        messages: [{ role: "user", content: "test" }],
      })
    ).rejects.toThrow("Gemini API returned no text content");
  });

  it("retries one transient 503 before returning a successful answer", async () => {
    ENV.geminiApiKey = "test-key";
    const fetchMock = vi.fn(
      async (_url: string | URL | Request, _init?: RequestInit) =>
        new Response(
          JSON.stringify({
            candidates: [
              { content: { parts: [{ text: "Réponse après reprise" }] } },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
    );
    fetchMock
      .mockImplementationOnce(
        async () => new Response("upstream unavailable", { status: 503 })
      )
      .mockImplementationOnce(
        async () =>
          new Response(
            JSON.stringify({
              candidates: [
                { content: { parts: [{ text: "Réponse après reprise" }] } },
              ],
            }),
            { status: 200, headers: { "content-type": "application/json" } }
          )
      );
    vi.stubGlobal("fetch", fetchMock);

    const answer = await invokeGeminiChat({
      systemPrompt: "system",
      messages: [{ role: "user", content: "test" }],
    });

    expect(answer).toBe("Réponse après reprise");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a 429 quota response", async () => {
    ENV.geminiApiKey = "test-key";
    const fetchMock = vi.fn(
      async (_url: string | URL | Request, _init?: RequestInit) =>
        new Response("quota exhausted", { status: 429 })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      invokeGeminiChat({
        systemPrompt: "system",
        messages: [{ role: "user", content: "test" }],
      })
    ).rejects.toThrow("Gemini API request failed with status 429");
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
