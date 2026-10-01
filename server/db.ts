import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createPool } from "mysql2";
import { InsertUser, auditLogs, clientAuthAccounts, emailLogs, integrationTokens, partnershipRequests, serviceDocuments, serviceRequests, userNotifications, users, workflowProgress } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export function createDatabasePool(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error("DATABASE_URL is required");
  const connection = new URL(connectionString);
  if (connection.protocol !== "mysql:" && connection.protocol !== "mariadb:") {
    throw new Error("DATABASE_URL must use the MySQL/TiDB protocol");
  }
  const host = connection.hostname;
  const configuredTls = process.env.DATABASE_SSL?.trim().toLowerCase();
  const useTls = configuredTls === "true" || (configuredTls !== "false" && /(^|\.)tidbcloud\.com$/i.test(host));
  return createPool({
    host,
    port: Number(connection.port || 3306),
    user: decodeURIComponent(connection.username),
    password: decodeURIComponent(connection.password),
    database: decodeURIComponent(connection.pathname.replace(/^\//, "")),
    waitForConnections: true,
    connectionLimit: 10,
    enableKeepAlive: true,
    connectTimeout: 15_000,
    ...(useTls ? { ssl: { minVersion: "TLSv1.2" as const } } : {}),
  });
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(createDatabasePool());
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = field === "email" && typeof value === "string" ? value.trim().toLowerCase() : value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    const normalizedEmail = user.email?.trim().toLowerCase();
    const isPrincipal = user.openId === ENV.ownerOpenId || normalizedEmail === ENV.superAdminEmail;
    if (isPrincipal) {
      values.role = "admin";
      updateSet.role = "admin";
    } else if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function listUsers() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ id: users.id, openId: users.openId, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt, lastSignedIn: users.lastSignedIn }).from(users).orderBy(desc(users.createdAt));
  return rows.map(account => ({ ...account, isProtectedPrincipal: account.openId === ENV.ownerOpenId || account.email?.toLowerCase() === ENV.superAdminEmail }));
}

export async function setUserRoleByEmail(email: string, role: "user" | "admin") {
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail === ENV.superAdminEmail && role !== "admin") throw new Error("The super-admin account cannot be demoted");
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const target = await db.select({ openId: users.openId }).from(users).where(sql`LOWER(${users.email}) = ${normalizedEmail}`).limit(1);
  if (!target[0]) throw new Error("No account found with that email");
  if (target[0].openId === ENV.ownerOpenId && role !== "admin") throw new Error("The owner account cannot be demoted");
  await db.update(users).set({ role }).where(sql`LOWER(${users.email}) = ${normalizedEmail}`);
  return { success: true } as const;
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getClientAuthByEmail(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select().from(clientAuthAccounts).where(eq(clientAuthAccounts.email, email)).limit(1);
  if (!rows[0]) return undefined;
  const user = await getUserById(rows[0].userId);
  return user ? { account: rows[0], user } : undefined;
}

export async function getClientAuthByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(clientAuthAccounts).where(eq(clientAuthAccounts.userId, userId)).limit(1);
  return rows[0];
}

export async function createClientAuthAccount(input: {
  email: string;
  name: string;
  openId: string;
  passwordHash: string;
  verificationTokenHash: string;
  verificationExpiresAt: Date;
  verificationSentAt: Date;
  termsAcceptedAt: Date;
  privacyAcceptedAt: Date;
  dataProcessingAcceptedAt: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.transaction(async tx => {
    const existingAuth = await tx.select().from(clientAuthAccounts).where(eq(clientAuthAccounts.email, input.email)).limit(1);
    if (existingAuth[0]) {
      const existingUser = await tx.select().from(users).where(eq(users.id, existingAuth[0].userId)).limit(1);
      // Une inscription précédente peut avoir créé le compte avant l’envoi de
      // l’e-mail. Tant que l’adresse n’est pas confirmée, une nouvelle
      // inscription doit remplacer le mot de passe saisi par l’utilisateur.
      // Un compte déjà confirmé ne peut jamais être écrasé par register : il
      // doit passer par « Mot de passe oublié ».
      if (!existingAuth[0].emailVerifiedAt) {
        await tx.update(clientAuthAccounts).set({
          passwordHash: input.passwordHash,
          passwordChangedAt: input.verificationSentAt,
          failedLoginAttempts: 0,
          lockedUntil: null,
        }).where(eq(clientAuthAccounts.userId, existingAuth[0].userId));
        const refreshedAuth = await tx.select().from(clientAuthAccounts).where(eq(clientAuthAccounts.userId, existingAuth[0].userId)).limit(1);
        return { created: false, account: refreshedAuth[0], user: existingUser[0] };
      }
      return { created: false, account: existingAuth[0], user: existingUser[0] };
    }

    const existingUsers = await tx.select().from(users).where(sql`LOWER(${users.email}) = ${input.email}`).limit(1);
    let user = existingUsers[0];
    if (!user) {
      await tx.insert(users).values({
        openId: input.openId,
        name: input.name,
        email: input.email,
        loginMethod: "email-password",
        role: "user",
      });
      const inserted = await tx.select().from(users).where(eq(users.openId, input.openId)).limit(1);
      user = inserted[0];
    }
    if (!user) throw new Error("Could not create the client user");

    await tx.insert(clientAuthAccounts).values({
      userId: user.id,
      email: input.email,
      passwordHash: input.passwordHash,
      verificationTokenHash: input.verificationTokenHash,
      verificationExpiresAt: input.verificationExpiresAt,
      verificationSentAt: input.verificationSentAt,
      passwordChangedAt: input.verificationSentAt,
      termsAcceptedAt: input.termsAcceptedAt,
      privacyAcceptedAt: input.privacyAcceptedAt,
      dataProcessingAcceptedAt: input.dataProcessingAcceptedAt,
    });
    return { created: true, account: undefined, user };
  });
}

export async function updateClientVerificationToken(userId: number, tokenHash: string, expiresAt: Date, sentAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(clientAuthAccounts).set({ verificationTokenHash: tokenHash, verificationExpiresAt: expiresAt, verificationSentAt: sentAt }).where(eq(clientAuthAccounts.userId, userId));
}

export async function verifyClientEmailToken(tokenHash: string, now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.transaction(async tx => {
    const rows = await tx.select().from(clientAuthAccounts).where(sql`${clientAuthAccounts.verificationTokenHash} = ${tokenHash} AND ${clientAuthAccounts.verificationExpiresAt} > ${now} AND ${clientAuthAccounts.emailVerifiedAt} IS NULL`).limit(1);
    const account = rows[0];
    if (!account) return undefined;
    await tx.update(clientAuthAccounts).set({ emailVerifiedAt: now, verificationTokenHash: null, verificationExpiresAt: null }).where(eq(clientAuthAccounts.userId, account.userId));
    const userRows = await tx.select().from(users).where(eq(users.id, account.userId)).limit(1);
    return userRows[0];
  });
}

export async function saveClientPasswordResetToken(userId: number, tokenHash: string, expiresAt: Date, sentAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(clientAuthAccounts).set({ passwordResetTokenHash: tokenHash, passwordResetExpiresAt: expiresAt, passwordResetSentAt: sentAt }).where(eq(clientAuthAccounts.userId, userId));
}

export async function resetClientPassword(tokenHash: string, passwordHash: string, now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.transaction(async tx => {
    const rows = await tx.select().from(clientAuthAccounts).where(sql`${clientAuthAccounts.passwordResetTokenHash} = ${tokenHash} AND ${clientAuthAccounts.passwordResetExpiresAt} > ${now} AND ${clientAuthAccounts.emailVerifiedAt} IS NOT NULL`).limit(1);
    const account = rows[0];
    if (!account) return false;
    await tx.update(clientAuthAccounts).set({
      passwordHash,
      passwordChangedAt: now,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
    }).where(eq(clientAuthAccounts.userId, account.userId));
    return true;
  });
}

export async function recordClientLoginFailure(userId: number, now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select({ failedLoginAttempts: clientAuthAccounts.failedLoginAttempts, lockedUntil: clientAuthAccounts.lockedUntil }).from(clientAuthAccounts).where(eq(clientAuthAccounts.userId, userId)).limit(1);
  const account = rows[0];
  if (!account) return undefined;
  if (account.lockedUntil && account.lockedUntil > now) return account.lockedUntil;
  const attempts = account.lockedUntil && account.lockedUntil <= now ? 1 : account.failedLoginAttempts + 1;
  if (attempts >= 8) {
    const lockedUntil = new Date(now.getTime() + 15 * 60 * 1000);
    await db.update(clientAuthAccounts).set({ failedLoginAttempts: 0, lockedUntil }).where(eq(clientAuthAccounts.userId, userId));
    return lockedUntil;
  }
  await db.update(clientAuthAccounts).set({ failedLoginAttempts: attempts, lockedUntil: null }).where(eq(clientAuthAccounts.userId, userId));
  return undefined;
}

export async function clearClientLoginFailures(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(clientAuthAccounts).set({ failedLoginAttempts: 0, lockedUntil: null }).where(eq(clientAuthAccounts.userId, userId));
}

export async function updateUserLastSignedIn(userId: number, signedInAt = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(users).set({ lastSignedIn: signedInAt }).where(eq(users.id, userId));
}

export async function createServiceRequest(input: typeof serviceRequests.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(serviceRequests).values(input);
  return { success: true, id: Number(result[0].insertId) } as const;
}

export async function addServiceDocument(input: typeof serviceDocuments.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(serviceDocuments).values(input);
  return { success: true } as const;
}

export async function getServiceDocumentsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(serviceDocuments).where(eq(serviceDocuments.userId, userId)).orderBy(desc(serviceDocuments.createdAt));
}

export async function getAllServiceDocuments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(serviceDocuments).orderBy(desc(serviceDocuments.createdAt));
}

export async function getServiceDocumentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(serviceDocuments).where(eq(serviceDocuments.id, id)).limit(1);
  return rows[0];
}

export async function getServiceDocumentByFileKey(fileKey: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(serviceDocuments).where(eq(serviceDocuments.fileKey, fileKey)).limit(1);
  return rows[0];
}

export async function createUserNotification(input: typeof userNotifications.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(userNotifications).values(input);
  return { success: true } as const;
}

export async function getUserNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userNotifications).where(eq(userNotifications.userId, userId)).orderBy(desc(userNotifications.createdAt));
}

export async function getRecentAdminNotifications(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: userNotifications.id, userId: users.id, userName: users.name, email: users.email, title: userNotifications.title, content: userNotifications.content, read: userNotifications.read, createdAt: userNotifications.createdAt })
    .from(userNotifications).innerJoin(users, eq(userNotifications.userId, users.id)).orderBy(desc(userNotifications.createdAt)).limit(limit);
}

export async function getServiceRequestById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(serviceRequests).where(eq(serviceRequests.id, id)).limit(1);
  return rows[0];
}

export async function updateServiceRequestStatus(id: number, status: typeof serviceRequests.$inferInsert.status) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(serviceRequests).set({ status }).where(eq(serviceRequests.id, id));
  return { success: true } as const;
}

export async function updateServiceRequestAdmin(id: number, input: Partial<Pick<typeof serviceRequests.$inferInsert, "status" | "priority" | "assignedAdminEmail" | "adminNotes">>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const values: Record<string, unknown> = {};
  if (input.status !== undefined) values.status = input.status;
  if (input.priority !== undefined) values.priority = input.priority;
  if (input.assignedAdminEmail !== undefined) values.assignedAdminEmail = input.assignedAdminEmail;
  if (input.adminNotes !== undefined) values.adminNotes = input.adminNotes;
  if (!Object.keys(values).length) return { success: true } as const;
  await db.update(serviceRequests).set(values).where(eq(serviceRequests.id, id));
  return { success: true } as const;
}

export async function getServiceRequestsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(serviceRequests).where(eq(serviceRequests.userId, userId)).orderBy(desc(serviceRequests.updatedAt));
}

export async function getAllServiceRequests() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(serviceRequests).orderBy(desc(serviceRequests.updatedAt));
}

export async function getAllServiceRequestsWithDocuments() {
  const [requests, documents] = await Promise.all([getAllServiceRequests(), getAllServiceDocuments()]);
  const byRequest = new Map<number, typeof documents>();
  for (const document of documents) {
    const list = byRequest.get(document.requestId) ?? [];
    list.push(document);
    byRequest.set(document.requestId, list);
  }
  return requests.map(request => ({ ...request, documents: byRequest.get(request.id) ?? [] }));
}

export async function addAuditLog(input: typeof auditLogs.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(auditLogs).values(input);
}

export async function getAuditLogs(input: { entity?: string; entityId?: number; limit?: number } = {}) {
  const db = await getDb();
  if (!db) return [];
  const where = input.entity && input.entityId !== undefined
    ? and(eq(auditLogs.entity, input.entity), eq(auditLogs.entityId, input.entityId))
    : input.entity ? eq(auditLogs.entity, input.entity) : undefined;
  const query = db.select().from(auditLogs);
  return (where ? query.where(where) : query).orderBy(desc(auditLogs.createdAt)).limit(Math.min(input.limit ?? 100, 500));
}

export async function saveIntegrationToken(input: typeof integrationTokens.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(integrationTokens).values(input).onDuplicateKeyUpdate({
    set: { accountEmail: input.accountEmail, encryptedRefreshToken: input.encryptedRefreshToken, updatedAt: new Date() },
  });
}

export async function getIntegrationToken(provider: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(integrationTokens).where(eq(integrationTokens.provider, provider)).limit(1);
  return rows[0];
}

export async function deleteIntegrationToken(provider: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(integrationTokens).where(eq(integrationTokens.provider, provider));
}

export async function addEmailLog(input: typeof emailLogs.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(emailLogs).values(input);
}

export async function getEmailLogs(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(emailLogs).orderBy(desc(emailLogs.createdAt)).limit(Math.min(limit, 500));
}
export async function getEmailLogsForRecipient(recipient: string, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select({id:emailLogs.id,subject:emailLogs.subject,status:emailLogs.status,createdAt:emailLogs.createdAt,error:emailLogs.error}).from(emailLogs).where(eq(emailLogs.recipient, recipient)).orderBy(desc(emailLogs.createdAt)).limit(Math.min(limit, 100));
}

export async function deleteServiceDocument(id:number){const db=await getDb();if(!db)throw new Error("Database unavailable");await db.delete(serviceDocuments).where(eq(serviceDocuments.id,id));return {success:true} as const;}
export async function deleteEmailLog(id:number){const db=await getDb();if(!db)throw new Error("Database unavailable");await db.delete(emailLogs).where(eq(emailLogs.id,id));return {success:true} as const;}
export async function deleteUserAccount(id:number){const db=await getDb();if(!db)throw new Error("Database unavailable");await db.transaction(async tx=>{await tx.delete(serviceDocuments).where(eq(serviceDocuments.userId,id));await tx.delete(serviceRequests).where(eq(serviceRequests.userId,id));await tx.delete(userNotifications).where(eq(userNotifications.userId,id));await tx.delete(workflowProgress).where(eq(workflowProgress.userId,id));await tx.delete(partnershipRequests).where(eq(partnershipRequests.userId,id));await tx.delete(clientAuthAccounts).where(eq(clientAuthAccounts.userId,id));await tx.delete(users).where(eq(users.id,id));});return {success:true} as const;}
export async function deleteUserNotification(id:number){const db=await getDb();if(!db)throw new Error("Database unavailable");await db.delete(userNotifications).where(eq(userNotifications.id,id));return {success:true} as const;}
export async function resetWorkspaceData(scope:{documents?:boolean;requests?:boolean;notifications?:boolean;emailLogs?:boolean;workflows?:boolean;partnerships?:boolean}){const db=await getDb();if(!db)throw new Error("Database unavailable");if(scope.documents)await db.delete(serviceDocuments);if(scope.requests)await db.delete(serviceRequests);if(scope.notifications)await db.delete(userNotifications);if(scope.emailLogs)await db.delete(emailLogs);if(scope.workflows)await db.delete(workflowProgress);if(scope.partnerships)await db.delete(partnershipRequests);return {success:true} as const;}
export async function getUsersForAdmin() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: users.id, name: users.name, email: users.email, role: users.role }).from(users).orderBy(desc(users.createdAt));
}

export async function saveWorkflowProgress(input: typeof workflowProgress.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await db.select().from(workflowProgress).where(and(
    eq(workflowProgress.userId, input.userId), eq(workflowProgress.serviceKey, input.serviceKey),
    eq(workflowProgress.need, input.need), eq(workflowProgress.status, "in_progress"),
  )).limit(1);
  if (existing[0]) {
    await db.update(workflowProgress).set({ step: input.step, answers: input.answers ?? null }).where(eq(workflowProgress.id, existing[0].id));
    return existing[0].id;
  }
  const result = await db.insert(workflowProgress).values(input);
  return Number(result[0].insertId);
}

export async function getWorkflowProgressForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workflowProgress).where(and(eq(workflowProgress.userId, userId), eq(workflowProgress.status, "in_progress"))).orderBy(desc(workflowProgress.updatedAt));
}

export async function createPartnershipRequest(input: typeof partnershipRequests.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(partnershipRequests).values(input);
  return { success: true } as const;
}

export async function getPartnershipRequestsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(partnershipRequests).where(eq(partnershipRequests.userId, userId)).orderBy(desc(partnershipRequests.updatedAt));
}


export async function checkDatabaseConnection() {
  if (!process.env.DATABASE_URL) return { configured: false, connected: false };
  try {
    const db = await getDb();
    if (!db) return { configured: true, connected: false };
    await db.execute(sql`SELECT 1`);
    return { configured: true, connected: true };
  } catch {
    return { configured: true, connected: false };
  }
}
