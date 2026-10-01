export type TransactionalEmail = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  idempotencyKey?: string;
};

export type TransactionalEmailResult = {
  sent: boolean;
  id?: string;
  error?: string;
};

type BrevoResponse = {
  messageId?: string;
  code?: string;
  message?: string;
};

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const TIMEOUT_MS = 15_000;

function env(value: string | undefined) {
  return value?.trim().replace(/^['"]|['"]$/g, "").trim() || "";
}

function validEmail(value: string) {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
}

function config() {
  const apiKey = env(process.env.BREVO_API_KEY);
  const fromEmail = env(process.env.BREVO_FROM_EMAIL);
  const fromName = env(process.env.BREVO_FROM_NAME) || "ICX Power Solutions";
  const replyTo = env(process.env.BREVO_REPLY_TO);

  if (!apiKey) return { error: "BREVO_API_KEY est absente dans les variables Render." } as const;
  if (!fromEmail) return { error: "BREVO_FROM_EMAIL est absente dans les variables Render." } as const;
  if (!validEmail(fromEmail)) return { error: "BREVO_FROM_EMAIL n’est pas une adresse valide." } as const;
  if (replyTo && !validEmail(replyTo)) return { error: "BREVO_REPLY_TO n’est pas une adresse valide." } as const;
  if (/[\r\n<>]/.test(fromName)) return { error: "BREVO_FROM_NAME contient des caractères non autorisés." } as const;

  return { apiKey, fromEmail, fromName, replyTo } as const;
}

export function brevoConfigured() {
  return !("error" in config());
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]!);
}

async function parseResponse(response: Response): Promise<BrevoResponse> {
  const raw = await response.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw) as BrevoResponse;
  } catch {
    return { message: raw.slice(0, 500) };
  }
}

export async function sendTransactionalEmail(input: TransactionalEmail): Promise<TransactionalEmailResult> {
  const settings = config();
  if ("error" in settings) {
    console.error(`[Brevo] Configuration invalide : ${settings.error}`);
    return { sent: false, error: settings.error };
  }

  const to = env(input.to);
  if (!validEmail(to)) {
    const error = "Le destinataire n’est pas une adresse e-mail valide.";
    console.error(`[Brevo] ${error}`);
    return { sent: false, error };
  }

  const replyTo = env(input.replyTo) || settings.replyTo;
  const payload = {
    sender: { name: settings.fromName, email: settings.fromEmail },
    to: [{ email: to }],
    subject: input.subject,
    textContent: input.text,
    ...(input.html ? { htmlContent: input.html } : {}),
    ...(replyTo ? { replyTo: { email: replyTo } } : {}),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": settings.apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const body = await parseResponse(response);

    if (!response.ok) {
      const detail = body.message || body.code || "Requête refusée par Brevo.";
      const error = `Brevo HTTP ${response.status}: ${detail}`;
      console.error(`[Brevo] Échec d’envoi vers ${to} : ${error}`);
      return { sent: false, error };
    }

    if (!body.messageId) {
      const error = "Brevo a accepté la requête mais n’a renvoyé aucun messageId.";
      console.error(`[Brevo] ${error}`);
      return { sent: false, error };
    }

    console.info(`[Brevo] E-mail accepté, messageId=${body.messageId}, destinataire=${to}`);
    return { sent: true, id: body.messageId };
  } catch (error) {
    const message = error instanceof DOMException && error.name === "AbortError"
      ? `Délai dépassé après ${TIMEOUT_MS / 1000} secondes lors de l’appel HTTPS à Brevo.`
      : error instanceof Error ? error.message : "Erreur réseau inconnue lors de l’appel à Brevo.";
    console.error(`[Brevo] ${message}`);
    return { sent: false, error: message };
  } finally {
    clearTimeout(timeout);
  }
}
