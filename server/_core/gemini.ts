import { ENV } from "./env";

export type GeminiChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const RETRYABLE_GEMINI_STATUSES = new Set([408, 425, 500, 502, 503, 504]);
const GEMINI_MAX_ATTEMPTS = 2;
const GEMINI_RETRY_DELAY_MS = 400;
const GEMINI_REQUEST_TIMEOUT_MS = 20_000;

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
      console.warn("[ai.chat] Gemini network failure; retrying once");
      await sleep(GEMINI_RETRY_DELAY_MS);
      continue;
    }

    if (
      response.ok ||
      attempt === GEMINI_MAX_ATTEMPTS ||
      !RETRYABLE_GEMINI_STATUSES.has(response.status)
    ) {
      return response;
    }

    console.warn("[ai.chat] Gemini transient upstream status; retrying once", {
      status: response.status,
    });
    try {
      await response.body?.cancel();
    } catch {
      // The response body may already have been consumed or settled.
    }
    await sleep(GEMINI_RETRY_DELAY_MS);
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

  const model = ENV.geminiModel.trim() || "gemini-3.8-flash";
  if (!/^[a-zA-Z0-9._-]+$/.test(model)) {
    throw new Error("Gemini model name is invalid");
  }

  // Gemini expects the first conversation turn to come from the user. The
  // client includes an assistant welcome card as its first displayed message;
  // it is already covered by the system prompt, so omit only leading assistant
  // turns when building the provider history.
  const history = [...input.messages];
  while (history[0]?.role === "assistant") history.shift();

  if (history.length === 0) {
    throw new Error("Gemini chat requires at least one user message");
  }

  const response = await requestGemini(
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

  if (!response.ok) {
    throw new Error(`Gemini API request failed with status ${response.status}`);
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
