import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import {
  adminProcedure,
  isSuperAdminIdentity,
  protectedProcedure,
  publicProcedure,
  router,
  superAdminProcedure,
} from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { invokeGeminiChat } from "./_core/gemini";
import { z } from "zod";
import {
  addAuditLog,
  addEmailLog,
  addServiceDocument,
  createPartnershipRequest,
  createServiceRequest,
  checkDatabaseConnection,
  createUserNotification,
  getAllServiceRequestsWithDocuments,
  getAuditLogs,
  getEmailLogs,
  getEmailLogsForRecipient,
  getPartnershipRequestsForUser,
  getRecentAdminNotifications,
  getServiceDocumentById,
  getServiceDocumentsForUser,
  getServiceRequestById,
  getServiceRequestsForUser,
  getUserById,
  getUserNotifications,
  getUsersForAdmin,
  clearClientLoginFailures,
  createClientAuthAccount,
  getClientAuthByEmail,
  recordClientLoginFailure,
  resetClientPassword,
  saveClientPasswordResetToken,
  updateClientVerificationToken,
  updateUserLastSignedIn,
  verifyClientEmailToken,
  getWorkflowProgressForUser,
  listUsers,
  saveWorkflowProgress,
  setUserRoleByEmail,
  updateServiceRequestAdmin,
  updateServiceRequestStatus,
  deleteServiceDocument,
  deleteEmailLog,
  deleteUserAccount,
  deleteUserNotification,
  resetWorkspaceData,
} from "./db";
import { storagePut, storageGetSignedUrl } from "./storage";
import { ENV } from "./_core/env";
import {
  escapeHtml,
  brevoConfigured,
  sendTransactionalEmail,
} from "./_core/brevo";
import {
  assertAuthRateLimit,
  burnPasswordVerification,
  createOneTimeToken,
  hashOneTimeToken,
  hashPassword,
  normalizeEmail,
  verifyPassword,
} from "./_core/clientAuth";
import { sdk } from "./_core/sdk";
import {
  disconnectOutlook,
  getOutlookMessage,
  listOutlookAttachments,
  listOutlookFolders,
  listOutlookMessages,
  microsoftAdminConfigured,
  moveOutlookMessage,
  outlookIntegrationStatus,
  replyToOutlookMessage,
  setOutlookMessageRead,
} from "./_core/microsoftAdmin";

const icxKnowledgeBase = `Contexte de référence ICX POWER SOLUTIONS SRL : société roumaine basée à Iași, CUI 54675848, Nr. Reg. Com. J2026031336000, CAEN 7020. Services : Expertise internationale, Conseil en entreprise, Sourcing, Ressources humaines, Commerce international, Études & admissions et Immobilier. Parcours portail : chaque sous-service permet de préciser le besoin, répondre à une évaluation courte, puis ouvrir un espace sécurisé pour enregistrer une demande et joindre des documents. Tarification : les prestations sont étudiées sur brief et devis ; ne donne jamais de prix inventé. Documents de départ généralement utiles : identité/passeport, coordonnées, contexte du projet, budget ou calendrier, justificatifs spécifiques au service. Pour les études : le catalogue présente des informations indicatives et la disponibilité, les frais, visas et admissions doivent être confirmés auprès de l’établissement. Pour une entreprise partenaire : demander raison sociale, interlocuteur, email, besoin, pays concernés et objectif de coopération. Ne présente jamais ce contexte comme un contrat, une garantie ou un avis juridique. Pour les mines, rappeler que les audits techniques, juridiques, environnementaux, sociaux, sécurité et conformité doivent être réalisés par des experts qualifiés.`;

async function sendAndLogEmail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  idempotencyKey?: string;
}) {
  const result = await sendTransactionalEmail(input);
  try {
    await addEmailLog({
      recipient: input.to,
      subject: input.subject,
      provider: "brevo",
      providerMessageId: result.id ?? null,
      status: result.sent
        ? "sent"
        : process.env.BREVO_API_KEY
          ? "failed"
          : "skipped",
      error: result.error ?? null,
    });
  } catch (error) {
    console.warn(
      "[Admin] Could not persist email log:",
      error instanceof Error ? error.message : "unknown error"
    );
  }
  return result;
}

function requireEmailSent(
  result: Awaited<ReturnType<typeof sendTransactionalEmail>>
) {
  if (!result.sent) {
    console.error(
      "[Email] Transactional email was not sent:",
      result.error || "unknown provider error"
    );
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message:
        "Le compte a été enregistré, mais le lien de confirmation n’a pas pu être envoyé. L’administrateur doit configurer le service e-mail, puis vous pourrez demander un nouveau lien.",
    });
  }
  return result;
}

function formatRequestedAppointment(value?: string) {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  return match
    ? `${match[3]}/${match[2]}/${match[1]} à ${match[4]}:${match[5]}`
    : value;
}

async function logAdminAction(
  actorId: number,
  action: string,
  entity: string,
  entityId?: number,
  details?: unknown
) {
  try {
    await addAuditLog({
      actorId,
      action,
      entity,
      entityId: entityId ?? null,
      details: details === undefined ? null : JSON.stringify(details),
    });
  } catch (error) {
    console.warn(
      "[Admin] Could not persist audit log:",
      error instanceof Error ? error.message : "unknown error"
    );
  }
}

function safeFileName(fileName: string) {
  const leaf = fileName.split(/[\\/]/).pop() || "document";
  return leaf.replace(/[^A-Za-z0-9_.() -]/g, "_").slice(0, 200) || "document";
}

const requestStatus = z.enum([
  "Reçu",
  "En cours d’analyse",
  "Documents complémentaires requis",
  "Accepté",
  "Refusé",
  "Clôturé",
]);
const requestPriority = z.enum(["low", "normal", "high", "urgent"]);

const LOCAL_SESSION_APP_ID = "icx-power-solutions-client";
const LOCAL_SESSION_MS = 30 * 24 * 60 * 60 * 1000;

function authRateLimit(
  ip: string | undefined,
  action: string,
  email: string,
  limit: number
) {
  try {
    const remote = ip || "unknown";
    assertAuthRateLimit(
      `${action}:ip:${remote}`,
      Math.max(limit * 3, limit),
      15 * 60 * 1000
    );
    assertAuthRateLimit(`${action}:account:${email}`, limit, 15 * 60 * 1000);
  } catch {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Trop de tentatives. Réessayez dans quelques minutes.",
    });
  }
}

function authEmailBaseUrl(req: {
  protocol: string;
  get(name: string): string | undefined;
}) {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.PUBLIC_APP_URL?.trim();
  const raw =
    configured ||
    (ENV.isProduction
      ? ""
      : `${req.protocol}://${req.get("host") || "localhost:3000"}`);
  if (!raw || raw.includes("VOTRE-SERVICE"))
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must be set to the deployed site URL"
    );
  const url = new URL(raw);
  if (ENV.isProduction && url.protocol !== "https:")
    throw new Error("The public site URL must use HTTPS in production");
  if (url.username || url.password || url.search || url.hash)
    throw new Error(
      "The public site URL must be an origin without credentials, query, or fragment"
    );
  return url.origin;
}

function oneTimeLink(
  req: { protocol: string; get(name: string): string | undefined },
  path: string,
  token: string
) {
  const url = new URL(path, authEmailBaseUrl(req));
  url.searchParams.set("token", token);
  return url.toString();
}

function sendVerificationEmail(
  req: { protocol: string; get(name: string): string | undefined },
  email: string,
  name: string,
  token: string,
  tokenHash: string
) {
  const link = oneTimeLink(req, "/verification-email", token);
  const safeName = escapeHtml(name);
  return sendAndLogEmail({
    to: email,
    subject: "Confirmez votre adresse e-mail — ICX Power Solutions",
    text: `Bonjour ${name}, confirmez votre adresse e-mail en ouvrant ce lien (valable 24 heures) : ${link}`,
    html: `<p>Bonjour ${safeName},</p><p>Confirmez votre adresse e-mail pour activer votre espace client ICX.</p><p><a href="${escapeHtml(link)}">Confirmer mon adresse</a></p><p>Ce lien expire dans 24 heures. Si vous n’avez pas créé de compte, ignorez ce message.</p>`,
    idempotencyKey: `client-verify-${tokenHash}`,
  });
}

function sendPasswordResetEmail(
  req: { protocol: string; get(name: string): string | undefined },
  email: string,
  name: string,
  token: string,
  tokenHash: string
) {
  const link = oneTimeLink(req, "/mot-de-passe-oublie", token);
  const safeName = escapeHtml(name);
  return sendAndLogEmail({
    to: email,
    subject: "Réinitialisation de votre mot de passe — ICX Power Solutions",
    text: `Bonjour ${name}, réinitialisez votre mot de passe dans les 30 minutes : ${link}. Si vous n’avez pas demandé cette opération, ignorez ce message.`,
    html: `<p>Bonjour ${safeName},</p><p>Une demande de réinitialisation a été faite pour votre espace ICX.</p><p><a href="${escapeHtml(link)}">Choisir un nouveau mot de passe</a></p><p>Le lien expire dans 30 minutes. Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.</p>`,
    idempotencyKey: `client-reset-${tokenHash}`,
  });
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    isSuperAdmin: publicProcedure.query(({ ctx }) =>
      Boolean(
        ctx.adminAuthenticated && ctx.user && isSuperAdminIdentity(ctx.user)
      )
    ),
    register: publicProcedure
      .input(
        z.object({
          firstName: z.string().trim().min(1).max(120),
          lastName: z.string().trim().min(1).max(120),
          email: z.string().trim().email().max(320),
          password: z.string().min(12).max(128),
          acceptTerms: z.literal(true),
          acceptPrivacy: z.literal(true),
          acceptDataProcessing: z.literal(true),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const email = normalizeEmail(input.email);
        if (email === ENV.superAdminEmail)
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Utilisez la connexion administrateur Microsoft pour cette adresse.",
          });
        authRateLimit(
          ctx.req.ip || ctx.req.socket.remoteAddress,
          "register",
          email,
          5
        );
        const now = new Date();
        const { token, tokenHash } = createOneTimeToken();
        const passwordHash = await hashPassword(input.password);
        const name = `${input.firstName} ${input.lastName}`.trim();
        let result: Awaited<ReturnType<typeof createClientAuthAccount>>;
        try {
          result = await createClientAuthAccount({
            email,
            name,
            openId: `local:${crypto.randomUUID()}`,
            passwordHash,
            verificationTokenHash: tokenHash,
            verificationExpiresAt: new Date(
              now.getTime() + 24 * 60 * 60 * 1000
            ),
            verificationSentAt: now,
            termsAcceptedAt: now,
            privacyAcceptedAt: now,
            dataProcessingAcceptedAt: now,
          });
        } catch (error) {
          const dbError = error as { code?: string; errno?: number };
          if (dbError.code === "ER_DUP_ENTRY" || dbError.errno === 1062)
            return { success: true } as const;
          console.warn(
            "[Client auth] Registration could not create the account:",
            error instanceof Error ? error.message : "unknown error"
          );
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              "Le compte n’a pas pu être créé. Vérifiez la configuration de la base puis réessayez.",
          });
        }
        if (!result.user)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Le compte n’a pas pu être créé. Réessayez.",
          });
        if (result.created) {
          requireEmailSent(
            await sendVerificationEmail(ctx.req, email, name, token, tokenHash)
          );
        } else if (result.account && !result.account.emailVerifiedAt) {
          const lastSent = result.account.verificationSentAt?.getTime() ?? 0;
          if (!lastSent || now.getTime() - lastSent >= 60_000) {
            const replacement = createOneTimeToken();
            await updateClientVerificationToken(
              result.user.id,
              replacement.tokenHash,
              new Date(now.getTime() + 24 * 60 * 60 * 1000),
              now
            );
            requireEmailSent(
              await sendVerificationEmail(
                ctx.req,
                email,
                result.user.name || name,
                replacement.token,
                replacement.tokenHash
              )
            );
          }
        }
        return { success: true } as const;
      }),
    login: publicProcedure
      .input(
        z.object({
          email: z.string().trim().email().max(320),
          password: z.string().min(1).max(128),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const email = normalizeEmail(input.email);
        authRateLimit(
          ctx.req.ip || ctx.req.socket.remoteAddress,
          "login",
          email,
          20
        );
        const record = await getClientAuthByEmail(email);
        if (!record) {
          await burnPasswordVerification(input.password);
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Adresse e-mail ou mot de passe incorrect.",
          });
        }
        const now = new Date();
        if (record.account.lockedUntil && record.account.lockedUntil > now) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message:
              "Compte temporairement verrouillé après plusieurs essais. Réessayez plus tard.",
          });
        }
        if (
          !(await verifyPassword(input.password, record.account.passwordHash))
        ) {
          const lockedUntil = await recordClientLoginFailure(
            record.user.id,
            now
          );
          if (lockedUntil && lockedUntil > now)
            throw new TRPCError({
              code: "TOO_MANY_REQUESTS",
              message: "Trop d’essais. Réessayez dans 15 minutes.",
            });
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Adresse e-mail ou mot de passe incorrect.",
          });
        }
        if (!record.account.emailVerifiedAt)
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Confirmez votre adresse e-mail avant de vous connecter.",
          });
        await clearClientLoginFailures(record.user.id);
        await updateUserLastSignedIn(record.user.id, now);
        const sessionToken = await sdk.signSession(
          {
            openId: record.user.openId,
            appId: LOCAL_SESSION_APP_ID,
            name: record.user.name || email,
          },
          { expiresInMs: LOCAL_SESSION_MS }
        );
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          sameSite: "lax",
          maxAge: LOCAL_SESSION_MS,
        });
        return { success: true } as const;
      }),
    resendVerification: publicProcedure
      .input(z.object({ email: z.string().trim().email().max(320) }))
      .mutation(async ({ ctx, input }) => {
        const email = normalizeEmail(input.email);
        authRateLimit(
          ctx.req.ip || ctx.req.socket.remoteAddress,
          "verify-resend",
          email,
          5
        );
        const record = await getClientAuthByEmail(email);
        if (!record || record.account.emailVerifiedAt)
          return { success: true } as const;
        const now = new Date();
        const lastSent = record.account.verificationSentAt?.getTime() ?? 0;
        if (lastSent && now.getTime() - lastSent < 60_000)
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Attendez une minute avant de redemander le lien.",
          });
        const { token, tokenHash } = createOneTimeToken();
        await updateClientVerificationToken(
          record.user.id,
          tokenHash,
          new Date(now.getTime() + 24 * 60 * 60 * 1000),
          now
        );
        requireEmailSent(
          await sendVerificationEmail(
            ctx.req,
            email,
            record.user.name || email,
            token,
            tokenHash
          )
        );
        return { success: true } as const;
      }),
    verifyEmail: publicProcedure
      .input(z.object({ token: z.string().min(20).max(256) }))
      .mutation(async ({ ctx, input }) => {
        authRateLimit(
          ctx.req.ip || ctx.req.socket.remoteAddress,
          "email-verify",
          hashOneTimeToken(input.token),
          10
        );
        const user = await verifyClientEmailToken(
          hashOneTimeToken(input.token)
        );
        if (!user)
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Ce lien de confirmation est invalide ou expiré.",
          });
        return { success: true } as const;
      }),
    requestPasswordReset: publicProcedure
      .input(z.object({ email: z.string().trim().email().max(320) }))
      .mutation(async ({ ctx, input }) => {
        const email = normalizeEmail(input.email);
        authRateLimit(
          ctx.req.ip || ctx.req.socket.remoteAddress,
          "password-reset",
          email,
          5
        );
        const record = await getClientAuthByEmail(email);
        if (!record || !record.account.emailVerifiedAt)
          return { success: true } as const;
        const now = new Date();
        const lastSent = record.account.passwordResetSentAt?.getTime() ?? 0;
        if (lastSent && now.getTime() - lastSent < 60_000)
          return { success: true } as const;
        const { token, tokenHash } = createOneTimeToken();
        await saveClientPasswordResetToken(
          record.user.id,
          tokenHash,
          new Date(now.getTime() + 30 * 60 * 1000),
          now
        );
        requireEmailSent(
          await sendPasswordResetEmail(
            ctx.req,
            email,
            record.user.name || email,
            token,
            tokenHash
          )
        );
        return { success: true } as const;
      }),
    resetPassword: publicProcedure
      .input(
        z.object({
          token: z.string().min(20).max(256),
          password: z.string().min(12).max(128),
        })
      )
      .mutation(async ({ ctx, input }) => {
        authRateLimit(
          ctx.req.ip || ctx.req.socket.remoteAddress,
          "password-reset-complete",
          hashOneTimeToken(input.token),
          10
        );
        const passwordHash = await hashPassword(input.password);
        const reset = await resetClientPassword(
          hashOneTimeToken(input.token),
          passwordHash
        );
        if (!reset)
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Ce lien de réinitialisation est invalide ou expiré.",
          });
        return { success: true } as const;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  requests: router({
    mine: protectedProcedure.query(({ ctx }) =>
      getServiceRequestsForUser(ctx.user.id)
    ),
    documents: protectedProcedure.query(({ ctx }) =>
      getServiceDocumentsForUser(ctx.user.id)
    ),
    create: protectedProcedure
      .input(
        z.object({
          serviceKey: z.string().min(2).max(80),
          firstName: z.string().min(1).max(120),
          lastName: z.string().min(1).max(120),
          email: z.string().email(),
          phone: z.string().max(40).optional(),
          country: z.string().max(80).optional(),
          message: z.string().min(5).max(8000),
          appointmentAt: z.string().max(80).optional(),
          attachments: z
            .array(
              z.object({
                fileName: z.string().min(1).max(255),
                mimeType: z.string().min(1).max(120),
                fileSize: z.number().int().positive().max(8_000_000),
                data: z.string().min(1).max(11_000_000),
              })
            )
            .max(10)
            .optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const attachments = input.attachments || [];
        const accountEmail =
          ctx.user.email?.trim().toLowerCase() ||
          input.email.trim().toLowerCase();
        const requestedAppointment = formatRequestedAppointment(
          input.appointmentAt
        );
        const appointmentText = requestedAppointment
          ? `Créneau de rendez-vous souhaité : ${requestedAppointment} (heure locale du formulaire, à confirmer par ICX).`
          : "";
        const appointmentHtml = appointmentText
          ? `<p>${escapeHtml(appointmentText)}</p>`
          : "";
        const result = await createServiceRequest({
          serviceKey: input.serviceKey,
          firstName: input.firstName,
          lastName: input.lastName,
          email: accountEmail,
          phone: input.phone,
          country: input.country,
          message: [input.message, appointmentText]
            .filter(Boolean)
            .join("\n\n"),
          attachmentCount: attachments.length,
          userId: ctx.user.id,
        });
        for (const attachment of attachments) {
          const safeName = safeFileName(attachment.fileName);
          const buffer = Buffer.from(attachment.data, "base64");
          const stored = await storagePut(
            `${ctx.user.id}-documents/${safeName}`,
            buffer,
            attachment.mimeType
          );
          await addServiceDocument({
            userId: ctx.user.id,
            requestId: result.id,
            fileName: safeName,
            fileKey: stored.key,
            fileUrl: stored.url,
            mimeType: attachment.mimeType,
            fileSize: attachment.fileSize,
          });
        }
        await createUserNotification({
          userId: ctx.user.id,
          title: `Nouvelle demande à traiter · #${result.id}`,
          content: `Service : ${input.serviceKey}. Demandeur : ${input.firstName} ${input.lastName}. Pays de résidence : ${input.country || "non précisé"}. Pièces jointes : ${attachments.length ? attachments.map(file => safeFileName(file.fileName)).join(", ") : "aucune"}.${appointmentText ? ` ${appointmentText}` : ""} Le dossier est disponible dans la console super-admin.`,
        });
        const ownerEmail = ENV.superAdminEmail;
        const adminMail = await sendAndLogEmail({
          to: ownerEmail,
          subject: `Nouvelle demande ICX #${result.id}`,
          text: `${input.firstName} ${input.lastName} a soumis une demande (${input.serviceKey}). Pièces jointes : ${attachments.length}.${appointmentText ? `\n${appointmentText}` : ""}`,
          html: `<p><strong>${escapeHtml(input.firstName)} ${escapeHtml(input.lastName)}</strong> a soumis une demande <strong>${escapeHtml(input.serviceKey)}</strong>.</p><p>Référence : #${result.id} · Documents : ${attachments.length}</p>${appointmentHtml}<p>Ouvrir la console: <a href="${escapeHtml(process.env.NEXT_PUBLIC_SITE_URL || "")}/admin">ICX Admin</a></p>`,
          idempotencyKey: `request-${result.id}-admin-created`,
        });
        const clientMail = await sendAndLogEmail({
          to: accountEmail,
          subject: `Votre demande ICX #${result.id} a été reçue`,
          text:
            (input.serviceKey === "permis-travail"
              ? `Bonjour ${input.firstName}, ICX a bien reçu votre dossier Permis de travail. Référence : #${result.id}. L’équipe examinera les pièces transmises; si le dossier est retenu, les modalités d’un contrat de prestation vous seront communiquées pour examen. Le dépôt ne constitue ni une promesse d’emploi, ni un permis, ni une acceptation du dossier. Aucun contrat n’est établi automatiquement par le présent accusé de réception.`
              : `Bonjour ${input.firstName}, ICX a bien reçu votre demande ${input.serviceKey}. Référence : #${result.id}.`) +
            (appointmentText ? `\n\n${appointmentText}` : ""),
          html:
            (input.serviceKey === "permis-travail"
              ? `<p>Bonjour ${escapeHtml(input.firstName)},</p><p>ICX a bien reçu votre dossier <strong>Permis de travail</strong>. Référence : <strong>#${result.id}</strong>.</p><p>L’équipe examinera les pièces transmises. Si le dossier est retenu, les modalités d’un contrat de prestation vous seront communiquées pour examen.</p><p>Le dépôt ne constitue ni une promesse d’emploi, ni un permis, ni une acceptation du dossier. Aucun contrat n’est établi automatiquement par le présent accusé de réception.</p>`
              : `<p>Bonjour ${escapeHtml(input.firstName)},</p><p>ICX a bien reçu votre demande <strong>${escapeHtml(input.serviceKey)}</strong>.</p><p>Référence : <strong>#${result.id}</strong>. Nous vous contacterons pour la suite du traitement.</p>`) +
            appointmentHtml,
          idempotencyKey: `request-${result.id}-client-received`,
        });
        return {
          ...result,
          adminEmailSent: adminMail.sent,
          receiptEmailSent: clientMail.sent,
        };
      }),
    updateStatus: adminProcedure
      .input(
        z.object({ id: z.number().int().positive(), status: requestStatus })
      )
      .mutation(async ({ ctx, input }) => {
        const current = await getServiceRequestById(input.id);
        if (!current)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Demande introuvable.",
          });
        await updateServiceRequestStatus(input.id, input.status);
        await createUserNotification({
          userId: current.userId,
          title: "Statut de demande mis à jour",
          content: `Votre demande ${current.serviceKey} est maintenant « ${input.status} ».`,
        });
        if (current.email)
          await sendAndLogEmail({
            to: current.email,
            subject: `Mise à jour de votre demande ICX #${input.id}`,
            text: `Le statut de votre demande ${current.serviceKey} a été mis à jour : ${input.status}.`,
            html: `<p>Le statut de votre demande <strong>${escapeHtml(current.serviceKey)}</strong> est maintenant : <strong>${escapeHtml(input.status)}</strong>.</p><p>Référence #${input.id}</p>`,
            idempotencyKey: `request-${input.id}-status-${input.status}`,
          });
        await logAdminAction(
          ctx.user.id,
          "request.status.updated",
          "serviceRequest",
          input.id,
          { from: current.status, to: input.status }
        );
        return { success: true } as const;
      }),
  }),

  workflow: router({
    mine: protectedProcedure.query(({ ctx }) =>
      getWorkflowProgressForUser(ctx.user.id)
    ),
    save: protectedProcedure
      .input(
        z.object({
          serviceKey: z.string().min(2).max(80),
          need: z.string().min(2).max(180),
          step: z.enum(["detail", "assessment", "auth"]),
          answers: z.string().max(1000).optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        saveWorkflowProgress({ ...input, userId: ctx.user.id })
      ),
  }),

  partnerships: router({
    mine: protectedProcedure.query(({ ctx }) =>
      getPartnershipRequestsForUser(ctx.user.id)
    ),
    create: protectedProcedure
      .input(
        z.object({
          companyName: z.string().min(2).max(180),
          contactName: z.string().min(2).max(160),
          email: z.string().email(),
          phone: z.string().max(40).optional(),
          country: z.string().max(80).optional(),
          needs: z.string().min(10).max(8000),
          appointmentAt: z.string().max(80).optional(),
          attachments: z
            .array(
              z.object({
                fileName: z.string().min(1).max(255),
                mimeType: z.string().min(1).max(120),
                fileSize: z.number().int().positive().max(8_000_000),
                data: z.string().min(1).max(11_000_000),
              })
            )
            .max(10)
            .optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const attachments = input.attachments || [];
        const accountEmail =
          ctx.user.email?.trim().toLowerCase() ||
          input.email.trim().toLowerCase();
        const requestedAppointment = formatRequestedAppointment(
          input.appointmentAt
        );
        const appointmentText = requestedAppointment
          ? `Créneau de rendez-vous souhaité : ${requestedAppointment} (heure locale du formulaire, à confirmer par ICX).`
          : "";
        const [firstName, ...lastParts] = input.contactName.trim().split(/\s+/);
        const serviceRequest = await createServiceRequest({
          userId: ctx.user.id,
          serviceKey: "partenariat",
          firstName: firstName || input.contactName,
          lastName: lastParts.join(" ") || "Partenaire",
          email: accountEmail,
          phone: input.phone,
          country: input.country,
          message: [input.needs, appointmentText].filter(Boolean).join("\n\n"),
          attachmentCount: attachments.length,
        });
        for (const attachment of attachments) {
          const safeName = safeFileName(attachment.fileName);
          const buffer = Buffer.from(attachment.data, "base64");
          const stored = await storagePut(
            `${ctx.user.id}-partnership-documents/${safeName}`,
            buffer,
            attachment.mimeType
          );
          await addServiceDocument({
            userId: ctx.user.id,
            requestId: serviceRequest.id,
            fileName: safeName,
            fileKey: stored.key,
            fileUrl: stored.url,
            mimeType: attachment.mimeType,
            fileSize: attachment.fileSize,
          });
        }
        const result = await createPartnershipRequest({
          companyName: input.companyName,
          contactName: input.contactName,
          email: input.email,
          phone: input.phone,
          needs:
            `${input.country ? `[Pays de résidence: ${input.country}] ` : ""}${input.needs}${appointmentText ? `\n${appointmentText}` : ""}`.slice(
              0,
              8000
            ),
          userId: ctx.user.id,
        });
        await createUserNotification({
          userId: ctx.user.id,
          title: `Partenariat reçu · dossier #${serviceRequest.id}`,
          content: `Votre proposition de partenariat a été reçue. ${attachments.length} pièce(s) jointe(s) transmise(s).${appointmentText ? ` ${appointmentText}` : ""}`,
        });
        await sendAndLogEmail({
          to: ENV.superAdminEmail,
          subject: `Nouveau partenariat ICX · dossier #${serviceRequest.id}`,
          text: `${input.companyName} souhaite étudier un partenariat. Contact : ${input.contactName} (${input.email}). Pays : ${input.country || "non précisé"}. Pièces jointes : ${attachments.length}.${appointmentText ? `\n${appointmentText}` : ""}`,
          html: `<p><strong>${escapeHtml(input.companyName)}</strong> souhaite étudier un partenariat avec ICX.</p><p>Contact : ${escapeHtml(input.contactName)} · ${escapeHtml(input.email)} · Pays : ${escapeHtml(input.country || "non précisé")}</p><p>Dossier #${serviceRequest.id} · Documents : ${attachments.length}</p>${appointmentText ? `<p>${escapeHtml(appointmentText)}</p>` : ""}`,
          idempotencyKey: `partnership-${ctx.user.id}-${Date.now()}`,
        });
        const clientMail = await sendAndLogEmail({
          to: accountEmail,
          subject: `ICX a bien reçu votre proposition de partenariat · dossier #${serviceRequest.id}`,
          text: `Bonjour ${firstName || ""}, ICX a bien reçu votre demande de partenariat ${input.companyName}. Référence : #${serviceRequest.id}.${appointmentText ? `\n\n${appointmentText}` : ""}`,
          html: `<p>Bonjour ${escapeHtml(firstName || "")},</p><p>ICX a bien reçu votre proposition de partenariat <strong>${escapeHtml(input.companyName)}</strong>.</p><p>Référence : #${serviceRequest.id}.</p>${appointmentText ? `<p>${escapeHtml(appointmentText)}</p>` : ""}`,
          idempotencyKey: `partnership-${serviceRequest.id}-client-received`,
        });
        return { ...result, receiptEmailSent: clientMail.sent };
      }),
  }),

  notifications: router({
    mine: protectedProcedure.query(({ ctx }) =>
      getUserNotifications(ctx.user.id)
    ),
    emailHistory: protectedProcedure.query(({ ctx }) =>
      getEmailLogsForRecipient(ctx.user.email || "")
    ),
    sendToAdmin: protectedProcedure
      .input(
        z.object({
          title: z.string().min(2).max(180),
          content: z.string().min(2).max(4000),
          appointmentAt: z.string().max(80).optional(),
          sendEmail: z.boolean().default(true),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const appointmentText = formatRequestedAppointment(input.appointmentAt);
        const appointmentNotice = appointmentText
          ? `Créneau de rendez-vous souhaité : ${appointmentText} (heure locale du formulaire, à confirmer par ICX).`
          : "";
        const messageContent = [input.content, appointmentNotice]
          .filter(Boolean)
          .join("\n\n");
        await createUserNotification({
          userId: ctx.user.id,
          title: `Message utilisateur · ${input.title}`,
          content: messageContent,
        });
        const idempotencyKey = `user-message-${ctx.user.id}-${Date.now()}`;
        const email = await sendAndLogEmail({
          to: ENV.superAdminEmail,
          subject: `[Portail utilisateur] ${input.title}`,
          text: `${ctx.user.name || ctx.user.email || "Utilisateur"} (${ctx.user.email || ""})\n\n${messageContent}`,
          html: `<p><strong>${escapeHtml(ctx.user.name || ctx.user.email || "Utilisateur")}</strong> (${escapeHtml(ctx.user.email || "")})</p><p>${escapeHtml(messageContent).replace(/\n/g, "<br>")}</p>`,
          idempotencyKey,
        });
        const receipt = ctx.user.email
          ? await sendAndLogEmail({
              to: ctx.user.email,
              subject: `ICX a bien reçu votre message · ${input.title}`,
              text: `Bonjour ${ctx.user.name || ""}, ICX a bien reçu votre message « ${input.title} ». Notre équipe en a été informée.${appointmentNotice ? `\n\n${appointmentNotice}` : ""}`,
              html: `<p>Bonjour ${escapeHtml(ctx.user.name || "")},</p><p>ICX a bien reçu votre message <strong>${escapeHtml(input.title)}</strong>. Notre équipe en a été informée.</p>${appointmentNotice ? `<p>${escapeHtml(appointmentNotice)}</p>` : ""}`,
              idempotencyKey: `${idempotencyKey}-receipt`,
            })
          : { sent: false };
        return {
          success: true,
          emailSent: email.sent,
          receiptEmailSent: receipt.sent,
        } as const;
      }),
    reportUser: protectedProcedure
      .input(
        z.object({
          category: z.enum(["abus", "fraude", "contenu-inapproprie", "autre"]),
          content: z.string().min(10).max(4000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const title = `Signalement utilisateur · ${input.category}`;
        await createUserNotification({
          userId: ctx.user.id,
          title,
          content: input.content,
        });
        const idempotencyKey = `report-${ctx.user.id}-${Date.now()}`;
        const email = await sendAndLogEmail({
          to: ENV.superAdminEmail,
          subject: `[Signalement] ${input.category}`,
          text: `Signalement par ${ctx.user.name || ctx.user.email || "Utilisateur"} (${ctx.user.email || ""})\n\n${input.content}`,
          html: `<p><strong>Signalement de ${escapeHtml(ctx.user.name || ctx.user.email || "Utilisateur")}</strong> (${escapeHtml(ctx.user.email || "")})</p><p>Catégorie : ${escapeHtml(input.category)}</p><p>${escapeHtml(input.content).replace(/\n/g, "<br>")}</p>`,
          idempotencyKey,
        });
        const receipt = ctx.user.email
          ? await sendAndLogEmail({
              to: ctx.user.email,
              subject: "ICX a bien reçu votre signalement",
              text: `Bonjour ${ctx.user.name || ""}, ICX a bien reçu votre signalement (${input.category}). Notre équipe en a été informée.`,
              html: `<p>Bonjour ${escapeHtml(ctx.user.name || "")},</p><p>ICX a bien reçu votre signalement (<strong>${escapeHtml(input.category)}</strong>). Notre équipe en a été informée.</p>`,
              idempotencyKey: `${idempotencyKey}-receipt`,
            })
          : { sent: false };
        return {
          success: true,
          emailSent: email.sent,
          receiptEmailSent: receipt.sent,
        } as const;
      }),
  }),

  admin: router({
    dashboard: adminProcedure.query(async () => {
      const [requests, users] = await Promise.all([
        getAllServiceRequestsWithDocuments(),
        getUsersForAdmin(),
      ]);
      const requestDocs = requests.reduce(
        (total, request) => total + request.documents.length,
        0
      );
      const counts = Object.fromEntries(
        requestStatus.options.map(status => [
          status,
          requests.filter(request => request.status === status).length,
        ])
      );
      return {
        totalRequests: requests.length,
        totalDocuments: requestDocs,
        totalUsers: users.length,
        statusCounts: counts,
        latestRequests: requests
          .slice(0, 8)
          .map(({ documents: _documents, ...request }) => request),
      };
    }),
    requests: adminProcedure.query(async () => {
      const requests = await getAllServiceRequestsWithDocuments();
      return requests.map(({ documents, ...request }) => ({
        ...request,
        documents: documents.map(
          ({ fileKey: _fileKey, fileUrl: _fileUrl, ...document }) => document
        ),
      }));
    }),
    files: adminProcedure.query(async () => {
      const requests = await getAllServiceRequestsWithDocuments();
      return requests.flatMap(request =>
        request.documents.map(
          ({ fileKey: _fileKey, fileUrl: _fileUrl, ...document }) => ({
            ...document,
            request: {
              id: request.id,
              serviceKey: request.serviceKey,
              status: request.status,
              firstName: request.firstName,
              lastName: request.lastName,
              email: request.email,
            },
          })
        )
      );
    }),
    deleteDocument: superAdminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const doc = await getServiceDocumentById(input.id);
        if (!doc)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Document introuvable.",
          });
        await deleteServiceDocument(input.id);
        await logAdminAction(
          ctx.user.id,
          "document.deleted",
          "serviceDocument",
          input.id,
          { fileName: doc.fileName }
        );
        return { success: true } as const;
      }),
    documentUrl: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const document = await getServiceDocumentById(input.id);
        if (!document)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Document introuvable.",
          });
        const signedUrl = await storageGetSignedUrl(document.fileKey);
        await logAdminAction(
          ctx.user.id,
          "document.download.signed",
          "serviceDocument",
          document.id,
          { requestId: document.requestId, fileName: document.fileName }
        );
        return { url: signedUrl };
      }),
    updateRequest: adminProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          status: requestStatus.optional(),
          priority: requestPriority.optional(),
          assignedAdminEmail: z.string().email().nullable().optional(),
          adminNotes: z.string().max(8000).optional(),
          clientMessage: z.string().max(4000).optional(),
          emailCustomer: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const current = await getServiceRequestById(input.id);
        if (!current)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Demande introuvable.",
          });
        await updateServiceRequestAdmin(input.id, {
          status: input.status,
          priority: input.priority,
          assignedAdminEmail: input.assignedAdminEmail,
          adminNotes: input.adminNotes,
        });
        const messages: string[] = [];
        if (input.status && input.status !== current.status)
          messages.push(`Statut : ${current.status} → ${input.status}`);
        if (input.priority && input.priority !== current.priority)
          messages.push(`Priorité : ${current.priority} → ${input.priority}`);
        if (
          input.assignedAdminEmail !== undefined &&
          input.assignedAdminEmail !== current.assignedAdminEmail
        )
          messages.push(
            `Responsable : ${input.assignedAdminEmail || "non assigné"}`
          );
        if (
          input.adminNotes !== undefined &&
          input.adminNotes !== current.adminNotes
        )
          messages.push("Note interne modifiée");
        if (
          (input.status && input.status !== current.status) ||
          input.clientMessage?.trim()
        ) {
          const content =
            input.clientMessage?.trim() ||
            `Votre demande ${current.serviceKey} est maintenant « ${input.status} ».`;
          await createUserNotification({
            userId: current.userId,
            title: "Suivi de votre demande",
            content,
          });
          if (input.emailCustomer !== false && current.email) {
            const email = await sendAndLogEmail({
              to: current.email,
              subject: `Suivi de votre demande ICX #${input.id}`,
              text: content,
              html: `<p>${escapeHtml(content)}</p><p>Référence : #${input.id}</p>`,
              idempotencyKey: `request-${input.id}-admin-update-${Date.now()}`,
            });
            messages.push(
              email.sent
                ? "E-mail client envoyé"
                : `E-mail client non envoyé : ${email.error || "Brevo non configuré"}`
            );
          }
        }
        await logAdminAction(
          ctx.user.id,
          "request.updated",
          "serviceRequest",
          input.id,
          { changes: messages }
        );
        return {
          success: true,
          emailSent: messages.some(item => item === "E-mail client envoyé"),
          messages,
        };
      }),
    notifications: adminProcedure.query(() => getRecentAdminNotifications(150)),
    sendNotification: adminProcedure
      .input(
        z.object({
          userId: z.number().int().positive(),
          title: z.string().min(2).max(180),
          content: z.string().min(2).max(4000),
          sendEmail: z.boolean().default(true),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const user = await getUserById(input.userId);
        if (!user)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Compte utilisateur introuvable.",
          });
        await createUserNotification({
          userId: user.id,
          title: input.title,
          content: input.content,
        });
        let emailSent = false;
        if (input.sendEmail && user.email) {
          const result = await sendAndLogEmail({
            to: user.email,
            subject: input.title,
            text: input.content,
            html: `<p>${escapeHtml(input.content).replace(/\n/g, "<br>")}</p>`,
            idempotencyKey: `notification-${user.id}-${Date.now()}`,
          });
          emailSent = result.sent;
        }
        await logAdminAction(
          ctx.user.id,
          "notification.sent",
          "user",
          user.id,
          { title: input.title, emailSent }
        );
        return { success: true, emailSent } as const;
      }),
    users: superAdminProcedure.query(() => listUsers()),
    recipients: adminProcedure.query(() => getUsersForAdmin()),
    setRole: superAdminProcedure
      .input(
        z.object({ email: z.string().email(), role: z.enum(["user", "admin"]) })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await setUserRoleByEmail(
          input.email.toLowerCase(),
          input.role
        );
        await logAdminAction(
          ctx.user!.id,
          "user.role.updated",
          "user",
          undefined,
          { email: input.email.toLowerCase(), role: input.role }
        );
        return result;
      }),
    createUser: superAdminProcedure
      .input(
        z.object({
          firstName: z.string().min(1).max(120),
          lastName: z.string().min(1).max(120),
          email: z.string().email().max(320),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const email = normalizeEmail(input.email);
        if (email === ENV.superAdminEmail)
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Cette adresse est réservée au super-admin.",
          });
        const now = new Date();
        const token = createOneTimeToken();
        const passwordHash = await hashPassword(
          `ICX-${crypto.randomUUID()}-Invite!`
        );
        const result = await createClientAuthAccount({
          email,
          name: `${input.firstName} ${input.lastName}`.trim(),
          openId: `local:${crypto.randomUUID()}`,
          passwordHash,
          verificationTokenHash: token.tokenHash,
          verificationExpiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          verificationSentAt: now,
          termsAcceptedAt: now,
          privacyAcceptedAt: now,
          dataProcessingAcceptedAt: now,
        });
        if (!result.created)
          throw new TRPCError({
            code: "CONFLICT",
            message: "Un compte existe déjà avec cette adresse.",
          });
        const sent = await sendVerificationEmail(
          ctx.req,
          email,
          `${input.firstName} ${input.lastName}`,
          token.token,
          token.tokenHash
        );
        await logAdminAction(
          ctx.user.id,
          "user.created",
          "user",
          result.user?.id,
          { email }
        );
        return { success: true, emailSent: sent.sent } as const;
      }),
    deleteNotification: superAdminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await deleteUserNotification(input.id);
        await logAdminAction(
          ctx.user.id,
          "notification.deleted",
          "userNotification",
          input.id
        );
        return { success: true } as const;
      }),
    resetData: superAdminProcedure
      .input(
        z.object({
          documents: z.boolean(),
          requests: z.boolean(),
          notifications: z.boolean(),
          emailLogs: z.boolean(),
          workflows: z.boolean(),
          partnerships: z.boolean(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await resetWorkspaceData(input);
        await logAdminAction(
          ctx.user.id,
          "workspace.reset",
          "workspace",
          undefined,
          input
        );
        return { success: true } as const;
      }),
    audit: adminProcedure
      .input(
        z
          .object({
            entity: z.string().max(80).optional(),
            entityId: z.number().int().positive().optional(),
            limit: z.number().int().min(1).max(500).optional(),
          })
          .optional()
      )
      .query(({ input }) => getAuditLogs(input ?? {})),
    emailLogs: adminProcedure.query(() => getEmailLogs(150)),
    deleteEmailLog: superAdminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await deleteEmailLog(input.id);
        await logAdminAction(
          ctx.user.id,
          "email.log.deleted",
          "emailLog",
          input.id
        );
        return { success: true } as const;
      }),
    deleteUser: superAdminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const target = await getUserById(input.id);
        if (!target)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Compte introuvable.",
          });
        if (isSuperAdminIdentity(target))
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Le compte super-admin ne peut pas être supprimé.",
          });
        await deleteUserAccount(input.id);
        await logAdminAction(ctx.user.id, "user.deleted", "user", input.id, {
          email: target.email,
        });
        return { success: true } as const;
      }),
    integrations: adminProcedure.query(async () => {
      const [outlook, database] = await Promise.all([
        outlookIntegrationStatus(),
        checkDatabaseConnection(),
      ]);
      return {
        microsoft: {
          configured: microsoftAdminConfigured(),
          connected: outlook.connected,
          email: outlook.email,
        },
        outlook,
        brevo: {
          configured: brevoConfigured(),
          from: process.env.BREVO_FROM_EMAIL || null,
        },
        storage: { configured: Boolean(ENV.forgeApiUrl && ENV.forgeApiKey) },
        database,
      };
    }),
    outlookFolders: adminProcedure.query(() => listOutlookFolders()),
    outlookMessages: adminProcedure
      .input(z.object({ folderId: z.string().max(500).optional() }).optional())
      .query(({ input }) => listOutlookMessages(input?.folderId || "inbox")),
    outlookMessage: adminProcedure
      .input(z.object({ messageId: z.string().min(1).max(1000) }))
      .query(({ input }) => getOutlookMessage(input.messageId)),
    outlookAttachments: adminProcedure
      .input(z.object({ messageId: z.string().min(1).max(1000) }))
      .query(({ input }) => listOutlookAttachments(input.messageId)),
    outlookMarkRead: adminProcedure
      .input(
        z.object({
          messageId: z.string().min(1).max(1000),
          isRead: z.boolean(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await setOutlookMessageRead(
          input.messageId,
          input.isRead
        );
        await logAdminAction(
          ctx.user.id,
          input.isRead ? "outlook.message.read" : "outlook.message.unread",
          "outlookMessage"
        );
        return result;
      }),
    outlookReply: adminProcedure
      .input(
        z.object({
          messageId: z.string().min(1).max(1000),
          comment: z.string().min(1).max(8000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await replyToOutlookMessage(
          input.messageId,
          input.comment
        );
        await logAdminAction(
          ctx.user.id,
          "outlook.message.replied",
          "outlookMessage"
        );
        return result;
      }),
    outlookMove: adminProcedure
      .input(
        z.object({
          messageId: z.string().min(1).max(1000),
          destinationId: z.string().min(1).max(500),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await moveOutlookMessage(
          input.messageId,
          input.destinationId
        );
        await logAdminAction(
          ctx.user.id,
          "outlook.message.moved",
          "outlookMessage"
        );
        return result;
      }),
    outlookDisconnect: superAdminProcedure.mutation(async ({ ctx }) => {
      await disconnectOutlook();
      await logAdminAction(ctx.user!.id, "outlook.disconnected", "integration");
      return { success: true } as const;
    }),
  }),

  ai: router({
    chat: publicProcedure
      .input(
        z.object({
          messages: z
            .array(
              z.object({
                role: z.enum(["user", "assistant"]),
                content: z.string().min(1).max(6000),
              })
            )
            .min(1)
            .max(20),
        })
      )
      .mutation(async ({ input }) => {
        const systemPrompt = `Tu es ICX Intelligence, l'assistant officiel indépendant d'ICX POWER SOLUTIONS SRL. Tu réponds en français par défaut, mais tu peux répondre en anglais, roumain, polonais, chinois ou arabe si l'utilisateur le demande. Comprends l'objectif, pose au maximum deux questions de clarification si nécessaire, puis réponds avec une structure lisible : analyse, options, documents ou informations utiles, risques/points à confirmer, prochaine action. Ne fabrique jamais une université, un visa, un prix, une règle légale ou une disponibilité. Quand une information doit être confirmée, indique-le clairement. Pour les demandes sensibles, donne uniquement des informations générales et recommande un professionnel qualifié. Pour ICX, propose une prochaine étape concrète : choisir un service, ouvrir un espace sécurisé, contacter ICX ou commencer une demande.\n\n${icxKnowledgeBase}`;
        const messages = input.messages;
        const getAnswer = (content: unknown) =>
          typeof content === "string" && content.trim() ? content : undefined;

        const primaryProvider = {
          name: "Primary LLM",
          configured: Boolean(ENV.llmApiKey.trim()),
          run: async () => {
            const result = await invokeLLM({
              model: "gpt-5-mini",
              reasoning: { effort: "medium" },
              maxCompletionTokens: 1200,
              messages: [
                { role: "system" as const, content: systemPrompt },
                ...messages,
              ],
            });
            const answer = getAnswer(result.choices[0]?.message?.content);
            if (!answer)
              throw new Error("Primary LLM returned an empty answer");
            return answer;
          },
        };
        const geminiProvider = {
          name: "Gemini",
          configured: Boolean(ENV.geminiApiKey.trim()),
          run: () =>
            invokeGeminiChat({
              systemPrompt,
              messages,
              maxOutputTokens: 1200,
            }),
        };
        const preferredProviders =
          ENV.aiPreferredProvider === "gemini"
            ? [geminiProvider, primaryProvider]
            : [primaryProvider, geminiProvider];
        const providers = ENV.aiEnableFallback
          ? preferredProviders
          : preferredProviders.slice(0, 1);

        const attemptedProviders: string[] = [];
        for (const provider of providers) {
          if (!provider.configured) continue;
          attemptedProviders.push(provider.name);
          try {
            return { content: await provider.run() };
          } catch (error) {
            console.warn(`[ai.chat] ${provider.name} provider failed`, {
              error:
                error instanceof Error
                  ? error.message.slice(0, 200)
                  : "Unknown error",
            });
          }
        }

        console.error("[ai.chat] No working AI provider is available", {
          primaryConfigured: Boolean(ENV.llmApiKey.trim()),
          geminiConfigured: Boolean(ENV.geminiApiKey.trim()),
          preferredProvider: ENV.aiPreferredProvider,
          fallbackEnabled: ENV.aiEnableFallback,
          attemptedProviders,
        });
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message:
            "ICX Intelligence est momentanément indisponible. Réessayez dans quelques instants.",
        });
      }),
  }),
});

export type AppRouter = typeof appRouter;
