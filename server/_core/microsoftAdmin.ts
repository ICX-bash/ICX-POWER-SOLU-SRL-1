import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { Express, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";
import type { User } from "../../drizzle/schema";
import { ENV } from "./env";
import { getIntegrationToken, deleteIntegrationToken, saveIntegrationToken, getUserByOpenId, upsertUser } from "../db";
import { decryptSecret, encryptSecret } from "./secretBox";

export const ADMIN_SESSION_COOKIE = "icx_admin_session";
const OAUTH_STATE_COOKIE = "icx_ms_oauth_state";
const OAUTH_SCOPES = ["openid", "profile", "email", "offline_access", "User.Read", "Mail.ReadWrite", "Mail.Send"];
const GRAPH_ROOT = "https://graph.microsoft.com/v1.0";

export function normalizeMicrosoftEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function microsoftIdentityEmails(
  profile: { mail?: string; userPrincipalName?: string },
  claims: { preferred_username?: unknown; email?: unknown },
): string[] {
  return Array.from(new Set([
    normalizeMicrosoftEmail(profile.mail),
    normalizeMicrosoftEmail(profile.userPrincipalName),
    normalizeMicrosoftEmail(claims.preferred_username),
    normalizeMicrosoftEmail(claims.email),
  ].filter(Boolean)));
}

function tenantName() {
  const tenant = process.env.MICROSOFT_TENANT_ID?.trim() || "consumers";
  if (!/^(common|consumers|organizations|[0-9a-fA-F-]{36})$/.test(tenant)) {
    throw new Error("MICROSOFT_TENANT_ID must be consumers, common, organizations, or a tenant GUID");
  }
  return tenant;
}

function microsoftConfig(req?: Request) {
  const clientId = process.env.MICROSOFT_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET || "";
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI?.trim() || "";
  if (!clientId || !clientSecret || !redirectUri) return null;
  const redirect = new URL(redirectUri);
  if (ENV.isProduction && redirect.protocol !== "https:") throw new Error("MICROSOFT_REDIRECT_URI must use HTTPS in production");
  if (req && redirect.host !== req.get("host")) throw new Error("MICROSOFT_REDIRECT_URI host must match the deployed Render service host");
  return { clientId, clientSecret, redirectUri, tenant: tenantName() };
}

export function microsoftAdminConfigured() {
  try { return Boolean(microsoftConfig() && ENV.cookieSecret && process.env.INTEGRATION_ENCRYPTION_KEY); } catch { return false; }
}

function cookieValue(req: Request, key: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const item of header.split(";")) {
    const split = item.indexOf("=");
    if (split < 0) continue;
    if (item.slice(0, split).trim() === key) {
      try { return decodeURIComponent(item.slice(split + 1).trim()); } catch { return undefined; }
    }
  }
  return undefined;
}

function setSecureCookie(req: Request) {
  const forwardedProto = String(req.headers["x-forwarded-proto"] ?? "").split(",")[0].trim();
  return req.secure || forwardedProto === "https" || ENV.isProduction;
}

function constantTimeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function makePkcePair() {
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

function tokenEndpoint(tenant: string) {
  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
}

function jwksFor(tenant: string) {
  return createRemoteJWKSet(new URL(`https://login.microsoftonline.com/${tenant}/discovery/v2.0/keys`));
}

function safeAuthError(res: Response, reason: string) {
  res.redirect(303, `/admin?authError=${encodeURIComponent(reason)}`);
}

export async function getMicrosoftAdminSessionUser(req: Request): Promise<User | null> {
  const token = cookieValue(req, ADMIN_SESSION_COOKIE);
  if (!token || !ENV.cookieSecret || !ENV.superAdminEmail) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(ENV.cookieSecret), {
      algorithms: ["HS256"], issuer: "icx-admin", audience: "icx-admin",
    });
    const openId = typeof payload.sub === "string" ? payload.sub : "";
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    if (payload.scope !== "icx-admin" || !openId || email !== ENV.superAdminEmail) return null;
    const user = await getUserByOpenId(openId);
    if (!user || user.role !== "admin" || user.email?.trim().toLowerCase() !== ENV.superAdminEmail) return null;
    return user;
  } catch {
    return null;
  }
}

export function registerMicrosoftAdminAuthRoutes(app: Express) {
  app.get("/api/admin/auth/start", async (req, res) => {
    try {
      const config = microsoftConfig(req);
      if (!config || !ENV.cookieSecret || !process.env.INTEGRATION_ENCRYPTION_KEY) return res.status(503).send("Microsoft admin login is not configured on Render.");
      const state = randomBytes(32).toString("base64url");
      const nonce = randomBytes(32).toString("base64url");
      const { verifier, challenge } = makePkcePair();
      const cookiePayload = Buffer.from(JSON.stringify({ state, nonce, verifier })).toString("base64url");
      res.cookie(OAUTH_STATE_COOKIE, cookiePayload, {
        httpOnly: true, secure: setSecureCookie(req), sameSite: "lax", path: "/", maxAge: 10 * 60 * 1000,
      });
      const authorize = new URL(`https://login.microsoftonline.com/${config.tenant}/oauth2/v2.0/authorize`);
      authorize.searchParams.set("client_id", config.clientId);
      authorize.searchParams.set("response_type", "code");
      authorize.searchParams.set("response_mode", "query");
      authorize.searchParams.set("redirect_uri", config.redirectUri);
      authorize.searchParams.set("scope", OAUTH_SCOPES.join(" "));
      authorize.searchParams.set("state", state);
      authorize.searchParams.set("nonce", nonce);
      authorize.searchParams.set("code_challenge", challenge);
      authorize.searchParams.set("code_challenge_method", "S256");
      authorize.searchParams.set("prompt", "select_account");
      authorize.searchParams.set("login_hint", ENV.superAdminEmail);
      return res.redirect(302, authorize.toString());
    } catch (error) {
      console.error("[Admin OAuth] Start failed:", error instanceof Error ? error.message : "unknown error");
      return res.status(503).send("Impossible de démarrer la connexion Microsoft. Vérifiez les variables Render et l’URL de redirection.");
    }
  });

  app.get("/api/admin/auth/callback", async (req, res) => {
    const stateCookie = cookieValue(req, OAUTH_STATE_COOKIE);
    res.clearCookie(OAUTH_STATE_COOKIE, { httpOnly: true, secure: setSecureCookie(req), sameSite: "lax", path: "/" });
    try {
      const config = microsoftConfig(req);
      if (!config || !stateCookie) return safeAuthError(res, "configuration");
      if (typeof req.query.error === "string") return safeAuthError(res, "microsoft_denied");
      const code = typeof req.query.code === "string" ? req.query.code : "";
      const returnedState = typeof req.query.state === "string" ? req.query.state : "";
      if (!code || !returnedState) return safeAuthError(res, "invalid_callback");
      let stateData: { state: string; nonce: string; verifier: string };
      try { stateData = JSON.parse(Buffer.from(stateCookie, "base64url").toString("utf8")); }
      catch { return safeAuthError(res, "invalid_state"); }
      if (!stateData.state || !stateData.nonce || !stateData.verifier || !constantTimeEqual(stateData.state, returnedState)) {
        return safeAuthError(res, "invalid_state");
      }

      const tokenResponse = await fetch(tokenEndpoint(config.tenant), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          grant_type: "authorization_code",
          code,
          redirect_uri: config.redirectUri,
          code_verifier: stateData.verifier,
          scope: OAUTH_SCOPES.join(" "),
        }),
        signal: AbortSignal.timeout(20_000),
      });
      const tokens = await tokenResponse.json() as { access_token?: string; id_token?: string; refresh_token?: string; error?: string };
      if (!tokenResponse.ok || !tokens.access_token || !tokens.id_token) {
        console.warn("[Admin OAuth] Token exchange rejected:", tokens.error || tokenResponse.status);
        return safeAuthError(res, "token_exchange");
      }

      const { payload } = await jwtVerify(tokens.id_token, jwksFor(config.tenant), {
        algorithms: ["RS256"], audience: config.clientId,
      });
      const issuer = typeof payload.iss === "string" ? payload.iss : "";
      const tenantId = typeof payload.tid === "string" ? payload.tid : "";
      const expectedIssuer = config.tenant === "consumers"
        ? "https://login.microsoftonline.com/9188040d-6c67-4c5b-b112-36a304b66dad/v2.0"
        : `https://login.microsoftonline.com/${tenantId || config.tenant}/v2.0`;
      if (issuer !== expectedIssuer || payload.nonce !== stateData.nonce) {
        return safeAuthError(res, "invalid_identity_token");
      }

      const profileResponse = await fetch(`${GRAPH_ROOT}/me?$select=id,displayName,mail,userPrincipalName`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
        signal: AbortSignal.timeout(15_000),
      });
      if (!profileResponse.ok) return safeAuthError(res, "graph_profile");
      const profile = await profileResponse.json() as { id?: string; displayName?: string; mail?: string; userPrincipalName?: string };
      const identityEmails = microsoftIdentityEmails(profile, payload as { preferred_username?: unknown; email?: unknown });
      // Outlook.com may return an alias in `mail` and the primary sign-in
      // name in `userPrincipalName` (or the reverse). Compare every claim,
      // then persist the configured address as the canonical admin identity.
      if (!profile.id || !identityEmails.includes(ENV.superAdminEmail)) return safeAuthError(res, "not_authorized");
      const email = ENV.superAdminEmail;
      const accountTenantId = tenantId || config.tenant;
      const openId = "microsoft:" + createHash("sha256").update(`${accountTenantId}:${profile.id}`).digest("base64url");
      await upsertUser({
        openId,
        name: profile.displayName || email,
        email,
        loginMethod: "microsoft-admin",
        lastSignedIn: new Date(),
        role: "admin",
      });
      if (tokens.refresh_token) {
        await saveIntegrationToken({ provider: "microsoft-outlook", accountEmail: email, encryptedRefreshToken: encryptSecret(tokens.refresh_token) });
      }

      const session = await new SignJWT({ scope: "icx-admin", email, name: profile.displayName || email })
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setSubject(openId)
        .setIssuer("icx-admin")
        .setAudience("icx-admin")
        .setIssuedAt()
        .setExpirationTime("8h")
        .sign(new TextEncoder().encode(ENV.cookieSecret));
      res.cookie(ADMIN_SESSION_COOKIE, session, {
        httpOnly: true, secure: setSecureCookie(req), sameSite: "lax", path: "/", maxAge: 8 * 60 * 60 * 1000,
      });
      return res.redirect(303, "/admin");
    } catch (error) {
      console.error("[Admin OAuth] Callback failed:", error instanceof Error ? error.message : "unknown error");
      return safeAuthError(res, "callback_failed");
    }
  });

  app.post("/api/admin/auth/logout", async (req, res) => {
    res.clearCookie(ADMIN_SESSION_COOKIE, { httpOnly: true, secure: setSecureCookie(req), sameSite: "lax", path: "/" });
    return res.status(200).json({ success: true });
  });
}

async function outlookAccessToken(): Promise<string> {
  const config = microsoftConfig();
  if (!config) throw new Error("Connexion Outlook non configurée.");
  const integration = await getIntegrationToken("microsoft-outlook");
  if (!integration) throw new Error("La boîte Outlook n’est pas connectée. Reconnectez-vous avec le compte autorisé.");
  const refreshToken = decryptSecret(integration.encryptedRefreshToken);
  const response = await fetch(tokenEndpoint(config.tenant), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      scope: OAUTH_SCOPES.join(" "),
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const tokens = await response.json() as { access_token?: string; refresh_token?: string; error?: string };
  if (!response.ok || !tokens.access_token) {
    if (tokens.error === "invalid_grant") await deleteIntegrationToken("microsoft-outlook");
    throw new Error("Microsoft Graph a refusé le renouvellement. Reconnectez la boîte Outlook.");
  }
  if (tokens.refresh_token) {
    await saveIntegrationToken({
      provider: "microsoft-outlook",
      accountEmail: integration.accountEmail,
      encryptedRefreshToken: encryptSecret(tokens.refresh_token),
    });
  }
  return tokens.access_token;
}

async function graphRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const accessToken = await outlookAccessToken();
  const response = await fetch(`${GRAPH_ROOT}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: 'outlook.body-content-type="text"',
      ...(init.headers ?? {}),
    },
    signal: init.signal ?? AbortSignal.timeout(20_000),
  });
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => ({})) as { error?: { message?: string } };
  if (!response.ok) {
    console.warn("[Microsoft Graph] Request rejected:", response.status, body.error?.message || "");
    throw new Error(`Microsoft Graph a refusé l’opération (HTTP ${response.status}).`);
  }
  return body as T;
}

export async function listOutlookFolders() {
  const result = await graphRequest<{ value: Array<{ id: string; displayName: string; totalItemCount?: number; unreadItemCount?: number }> }>(
    "/me/mailFolders?$select=id,displayName,totalItemCount,unreadItemCount&$top=100",
  );
  return result.value;
}

export async function listOutlookMessages(folderId = "inbox") {
  const safeFolder = encodeURIComponent(folderId);
  const result = await graphRequest<{ value: Array<Record<string, unknown>> }>(
    `/me/mailFolders/${safeFolder}/messages?$select=id,subject,from,toRecipients,receivedDateTime,sentDateTime,bodyPreview,isRead,hasAttachments,importance&$top=50&$orderby=receivedDateTime%20desc`,
  );
  return result.value;
}

export async function getOutlookMessage(messageId: string) {
  return graphRequest<Record<string, unknown>>(
    `/me/messages/${encodeURIComponent(messageId)}?$select=id,subject,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,body,bodyPreview,isRead,hasAttachments,importance`,
  );
}

export async function listOutlookAttachments(messageId: string) {
  const result = await graphRequest<{ value: Array<Record<string, unknown>> }>(
    `/me/messages/${encodeURIComponent(messageId)}/attachments?$select=id,name,contentType,size,isInline&$top=100`,
  );
  return result.value;
}

export async function getOutlookAttachmentContent(messageId: string, attachmentId: string) {
  const attachment = await graphRequest<{ name?: string; contentType?: string; contentBytes?: string }>(
    `/me/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}?$select=name,contentType,contentBytes`,
  );
  if (!attachment.contentBytes) throw new Error("Microsoft Graph n’a pas retourné le contenu de la pièce jointe.");
  return {
    fileName: attachment.name || "outlook-attachment",
    contentType: attachment.contentType || "application/octet-stream",
    content: Buffer.from(attachment.contentBytes, "base64"),
  };
}

export async function setOutlookMessageRead(messageId: string, isRead: boolean) {
  await graphRequest(`/me/messages/${encodeURIComponent(messageId)}`, {
    method: "PATCH", body: JSON.stringify({ isRead }),
  });
  return { success: true } as const;
}

export async function replyToOutlookMessage(messageId: string, comment: string) {
  await graphRequest(`/me/messages/${encodeURIComponent(messageId)}/reply`, {
    method: "POST", body: JSON.stringify({ comment }),
  });
  return { success: true } as const;
}

export async function moveOutlookMessage(messageId: string, destinationId: string) {
  const result = await graphRequest<{ id?: string }>(`/me/messages/${encodeURIComponent(messageId)}/move`, {
    method: "POST", body: JSON.stringify({ destinationId }),
  });
  return { success: true, id: result.id } as const;
}

export async function outlookIntegrationStatus() {
  try {
    if (!microsoftAdminConfigured()) return { configured: false, connected: false, email: null as string | null };
    const token = await getIntegrationToken("microsoft-outlook");
    return { configured: true, connected: Boolean(token), email: token?.accountEmail ?? null };
  } catch {
    return { configured: false, connected: false, email: null as string | null };
  }
}

export async function disconnectOutlook() {
  await deleteIntegrationToken("microsoft-outlook");
  return { success: true } as const;
}
