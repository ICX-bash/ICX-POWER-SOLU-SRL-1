import { ENV } from "./env";

export type GeminiChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const RETRYABLE_GEMINI_STATUSES = new Set([408, 425, 500, 502, 503, 504]);
const GEMINI_MAX_ATTEMPTS = 4;
const GEMINI_RETRY_DELAY_MS = 750;
const GEMINI_REQUEST_TIMEOUT_MS = 30_000;

const sleep = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

async function requestGemini(
  url: string,
  init: RequestInit
): Promise<Response> {
  for (let attempt = 1; attempt <= GEMINI_MAX_ATTEMPTS; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(GEMINI_REQUEST_TIMEOUT_MS),
      });
    } catch {
      if (attempt === GEMINI_MAX_ATTEMPTS) {
        throw new Error("Gemini API network request failed after retry");
      }
      console.warn(
        `[ai.chat] Gemini network failure; retrying (${attempt}/${GEMINI_MAX_ATTEMPTS - 1})`
      );
      await sleep(GEMINI_RETRY_DELAY_MS * 2 ** (attempt - 1));
      continue;
    }

    if (
      response.ok ||
      attempt === GEMINI_MAX_ATTEMPTS ||
      !RETRYABLE_GEMINI_STATUSES.has(response.status)
    ) {
      return response;
    }

    console.warn("[ai.chat] Gemini transient upstream status; retrying", {
      status: response.status,
      attempt,
    });
    try {
      await response.body?.cancel();
    } catch {
      // The response body may already have been consumed or settled.
    }
    await sleep(GEMINI_RETRY_DELAY_MS * 2 ** (attempt - 1));
  }

  throw new Error("Gemini API request failed after exhausting retries");
}

export async function invokeGeminiChat(input: {
  systemPrompt: string;
  messages: GeminiChatMessage[];
  maxOutputTokens?: number;
}): Promise<string> {
  const apiKey = ENV.geminiApiKey.trim();
  if (!apiKey) {
    throw new Error("Gemini API key is not configured");
  }

  const configuredModel = ENV.geminiModel.trim() || "gemini-3.8-flash";
  if (!/^[a-zA-Z0-9._-]+$/.test(configuredModel)) {
    throw new Error("Gemini model name is invalid");
  }
  // A temporary 503 on one model must not make the assistant unavailable.
  // Keep the configured model first, then use stable Gemini-only fallbacks.
  const models = Array.from(
    new Set([configuredModel, "gemini-3.7-flash", "gemini-3.5-flash-lite"])
  );

  // Gemini expects the first conversation turn to come from the user. The
  // client includes an assistant welcome card as its first displayed message;
  // it is already covered by the system prompt, so omit only leading assistant
  // turns when building the provider history.
  const history = [...input.messages];
  while (history[0]?.role === "assistant") history.shift();

  if (history.length === 0) {
    throw new Error("Gemini chat requires at least one user message");
  }

  let response: Response | undefined;
  for (let index = 0; index < models.length; index++) {
    const model = models[index];
    response = await requestGemini(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: input.systemPrompt }] },
          contents: history.map(message => ({
            role: message.role === "assistant" ? "model" : "user",
            parts: [{ text: message.content }],
          })),
          generationConfig: {
            maxOutputTokens: input.maxOutputTokens ?? 1200,
          },
        }),
      }
    );
    if (response.ok || ![404, 503].includes(response.status) || index === models.length - 1) {
      break;
    }
    console.warn("[ai.chat] Gemini model unavailable; trying fallback model", {
      model,
      status: response.status,
      nextModel: models[index + 1],
    });
    try {
      await response.body?.cancel();
    } catch {
      // Ignore an already settled response body.
    }
  }

  if (!response || !response.ok) {
    throw new Error(
      `Gemini API request failed with status ${response?.status ?? "unknown"}`
    );
  }

  let payload: {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    throw new Error("Gemini API returned invalid JSON");
  }

  const answer = payload.candidates?.[0]?.content?.parts
    ?.map(part => part.text ?? "")
    .join("")
    .trim();

  if (!answer) {
    throw new Error("Gemini API returned no text content");
  }

  return answer;
}
