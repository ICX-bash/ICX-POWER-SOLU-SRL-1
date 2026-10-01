import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const clientAuthAccounts = mysqlTable("clientAuthAccounts", {
  userId: int("userId").primaryKey().notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  emailVerifiedAt: timestamp("emailVerifiedAt"),
  verificationTokenHash: varchar("verificationTokenHash", { length: 64 }),
  verificationExpiresAt: timestamp("verificationExpiresAt"),
  verificationSentAt: timestamp("verificationSentAt"),
  passwordResetTokenHash: varchar("passwordResetTokenHash", { length: 64 }),
  passwordResetExpiresAt: timestamp("passwordResetExpiresAt"),
  passwordResetSentAt: timestamp("passwordResetSentAt"),
  passwordChangedAt: timestamp("passwordChangedAt"),
  termsAcceptedAt: timestamp("termsAcceptedAt").notNull(),
  privacyAcceptedAt: timestamp("privacyAcceptedAt").notNull(),
  dataProcessingAcceptedAt: timestamp("dataProcessingAcceptedAt").notNull(),
  failedLoginAttempts: int("failedLoginAttempts").default(0).notNull(),
  lockedUntil: timestamp("lockedUntil"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const universities = mysqlTable("universities", {
  id: int("id").autoincrement().primaryKey(),
  country: varchar("country", { length: 80 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  city: varchar("city", { length: 120 }).notNull(),
  website: varchar("website", { length: 500 }),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const programs = mysqlTable("programs", {
  id: int("id").autoincrement().primaryKey(),
  universityId: int("universityId").notNull(),
  level: mysqlEnum("level", ["Bachelor", "Master", "Doctorat"]).notNull(),
  field: varchar("field", { length: 180 }).notNull(),
  intake: varchar("intake", { length: 120 }).notNull(),
  estimatedCost: varchar("estimatedCost", { length: 120 }),
  prerequisites: text("prerequisites"),
  requiredDocuments: text("requiredDocuments"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const serviceRequests = mysqlTable("serviceRequests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  serviceKey: varchar("serviceKey", { length: 80 }).notNull(),
  firstName: varchar("firstName", { length: 120 }).notNull(),
  lastName: varchar("lastName", { length: 120 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 40 }),
  country: varchar("country", { length: 80 }),
  message: text("message"),
  attachmentCount: int("attachmentCount").default(0).notNull(),
  status: mysqlEnum("status", ["Reçu", "En cours d’analyse", "Documents complémentaires requis", "Accepté", "Refusé", "Clôturé"]).default("Reçu").notNull(),
  priority: mysqlEnum("priority", ["low", "normal", "high", "urgent"]).default("normal").notNull(),
  assignedAdminEmail: varchar("assignedAdminEmail", { length: 320 }),
  adminNotes: text("adminNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const serviceDocuments = mysqlTable("serviceDocuments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  requestId: int("requestId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 700 }).notNull(),
  mimeType: varchar("mimeType", { length: 120 }).notNull(),
  fileSize: int("fileSize").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const userNotifications = mysqlTable("userNotifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  content: text("content").notNull(),
  read: int("read").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const workflowProgress = mysqlTable("workflowProgress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  serviceKey: varchar("serviceKey", { length: 80 }).notNull(),
  need: varchar("need", { length: 180 }).notNull(),
  step: varchar("step", { length: 40 }).notNull().default("detail"),
  answers: text("answers"),
  status: mysqlEnum("status", ["in_progress", "submitted", "abandoned"]).default("in_progress").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const partnershipRequests = mysqlTable("partnershipRequests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  companyName: varchar("companyName", { length: 180 }).notNull(),
  contactName: varchar("contactName", { length: 160 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 40 }),
  needs: text("needs").notNull(),
  status: mysqlEnum("status", ["Reçu", "En qualification", "Partenariat actif", "Clôturé"]).default("Reçu").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const applicationCases = mysqlTable("applicationCases", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  programId: int("programId").notNull(),
  status: mysqlEnum("status", ["Dossier ouvert", "Pièces en vérification", "Soumis à l’université", "Décision attendue", "Clôturé"]).default("Dossier ouvert").notNull(),
  progress: int("progress").default(20).notNull(),
  submittedAt: timestamp("submittedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  actorId: int("actorId").notNull(),
  action: varchar("action", { length: 160 }).notNull(),
  entity: varchar("entity", { length: 80 }).notNull(),
  entityId: int("entityId"),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const integrationTokens = mysqlTable("integrationTokens", {
  provider: varchar("provider", { length: 40 }).primaryKey(),
  accountEmail: varchar("accountEmail", { length: 320 }).notNull(),
  encryptedRefreshToken: text("encryptedRefreshToken").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const emailLogs = mysqlTable("emailLogs", {
  id: int("id").autoincrement().primaryKey(),
  recipient: varchar("recipient", { length: 320 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  provider: varchar("provider", { length: 40 }).notNull(),
  providerMessageId: varchar("providerMessageId", { length: 180 }),
  status: mysqlEnum("status", ["sent", "failed", "skipped"]).default("sent").notNull(),
  error: text("error"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type ClientAuthAccount = typeof clientAuthAccounts.$inferSelect;
export type University = typeof universities.$inferSelect;
export type Program = typeof programs.$inferSelect;
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type ServiceDocument = typeof serviceDocuments.$inferSelect;
export type ApplicationCase = typeof applicationCases.$inferSelect;
export type WorkflowProgress = typeof workflowProgress.$inferSelect;
export type UserNotification = typeof userNotifications.$inferSelect;
export type PartnershipRequest = typeof partnershipRequests.$inferSelect;
export type IntegrationToken = typeof integrationTokens.$inferSelect;
export type EmailLog = typeof emailLogs.$inferSelect;
