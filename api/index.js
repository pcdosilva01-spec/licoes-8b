// server/vercel-entry.ts
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// server/routers.ts
import { createHash, randomBytes as randomBytes2 } from "node:crypto";
import { and as and2, eq as eq2 } from "drizzle-orm";
import { TRPCError as TRPCError3 } from "@trpc/server";
import { z as z2 } from "zod";

// server/localAuth.ts
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { parse } from "cookie";
var LOCAL_SESSION_COOKIE = "oitavo_b_local_session";
var SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
function secret() {
  return process.env.JWT_SECRET || "oitavo-b-local-development-secret";
}
function encode(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}
function sign(value) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}
function createLocalSessionToken(openId) {
  const payload = `${openId}.${Date.now() + SESSION_TTL_SECONDS * 1e3}`;
  const encoded = encode(payload);
  return `${encoded}.${sign(encoded)}`;
}
function verifyLocalSessionToken(token) {
  if (!token) return void 0;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return void 0;
  const expected = sign(encoded);
  const actual = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actual.length !== expectedBuffer.length || !timingSafeEqual(actual, expectedBuffer)) return void 0;
  const decoded = Buffer.from(encoded, "base64url").toString("utf8");
  const separator = decoded.lastIndexOf(".");
  if (separator <= 0) return void 0;
  const openId = decoded.slice(0, separator);
  const expiresAt = Number(decoded.slice(separator + 1));
  if (!openId || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) return void 0;
  return openId;
}
function getLocalSessionOpenId(req) {
  return verifyLocalSessionToken(parse(req.headers.cookie || "")[LOCAL_SESSION_COOKIE]);
}
function setLocalSessionCookie(req, res, openId) {
  res.cookie(LOCAL_SESSION_COOKIE, createLocalSessionToken(openId), {
    httpOnly: true,
    secure: req.protocol === "https" || req.headers?.["x-forwarded-proto"] === "https",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS * 1e3
  });
}
function clearLocalSessionCookie(res) {
  res.clearCookie(LOCAL_SESSION_COOKIE, { httpOnly: true, sameSite: "lax", path: "/" });
}
function createLocalOpenId() {
  return `local:${randomBytes(24).toString("base64url")}`;
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";

// server/_core/env.ts
var ENV = {
  // Mantidos apenas para compatibilidade de módulos legados não registrados no servidor.
  appId: process.env.VITE_APP_ID ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/_core/notification.ts
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// shared/const.ts
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/storage.ts
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "node:crypto";
function storageConfig() {
  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION || "us-east-1";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("Storage n\xE3o configurado: defina AWS_S3_BUCKET, AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY.");
  }
  return { bucket, region, accessKeyId, secretAccessKey };
}
function client() {
  const config = storageConfig();
  return {
    config,
    s3: new S3Client({
      region: config.region,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
      endpoint: process.env.AWS_S3_ENDPOINT || void 0,
      forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === "true"
    })
  };
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
function appendHashSuffix(relKey) {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  return lastDot === -1 ? `${relKey}_${hash}` : `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const { config, s3 } = client();
  const key = appendHashSuffix(normalizeKey(relKey));
  await s3.send(new PutObjectCommand({ Bucket: config.bucket, Key: key, Body: data, ContentType: contentType, ServerSideEncryption: "AES256" }));
  return { key, url: key };
}
async function storageGetSignedUrl(relKey) {
  const { config, s3 } = client();
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: config.bucket, Key: normalizeKey(relKey) }), { expiresIn: 300 });
}
async function storageDelete(relKey) {
  const { config, s3 } = client();
  await s3.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: normalizeKey(relKey) }));
}

// server/pdfValidation.ts
var MAX_PDF_BYTES = 10 * 1024 * 1024;
function validatePdfBuffer(buffer) {
  if (buffer.length === 0 || buffer.length > MAX_PDF_BYTES) return false;
  const header = buffer.subarray(0, 16).toString("latin1");
  if (!/^%PDF-\d\.\d/.test(header)) return false;
  const tail = buffer.subarray(Math.max(0, buffer.length - 2048)).toString("latin1");
  if (!tail.includes("%%EOF")) return false;
  const source = buffer.toString("latin1");
  const dangerousMarkers = ["/JavaScript", "/JS", "/Launch", "/OpenAction", "/AA"];
  if (dangerousMarkers.some((marker) => source.includes(marker))) return false;
  return true;
}

// server/db.ts
import { and, asc, desc, eq, gt, isNull, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import {
  bigint,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  unique,
  varchar
} from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var classes = mysqlTable("classes", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  archivedAt: timestamp("archivedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var classMembers = mysqlTable(
  "classMembers",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    classId: int("classId").notNull(),
    role: mysqlEnum("role", ["member", "admin"]).default("member").notNull(),
    status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
    joinedAt: timestamp("joinedAt").defaultNow().notNull()
  },
  (table) => ({
    userClassUnique: unique("classMembers_user_class_unique").on(table.userId, table.classId),
    userIdx: index("classMembers_user_idx").on(table.userId),
    classIdx: index("classMembers_class_idx").on(table.classId)
  })
);
var inviteTokens = mysqlTable(
  "inviteTokens",
  {
    id: int("id").autoincrement().primaryKey(),
    classId: int("classId").notNull(),
    tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
    expiresAt: timestamp("expiresAt").notNull(),
    revokedAt: timestamp("revokedAt"),
    maxUses: int("maxUses").default(100).notNull(),
    usedCount: int("usedCount").default(0).notNull(),
    createdBy: int("createdBy").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (table) => ({
    classIdx: index("inviteTokens_class_idx").on(table.classId),
    expiresIdx: index("inviteTokens_expires_idx").on(table.expiresAt)
  })
);
var lessons = mysqlTable(
  "lessons",
  {
    id: int("id").autoincrement().primaryKey(),
    classId: int("classId").notNull(),
    subject: varchar("subject", { length: 80 }).notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    description: text("description"),
    lessonDate: timestamp("lessonDate").notNull(),
    dueDate: timestamp("dueDate"),
    teacherName: varchar("teacherName", { length: 120 }),
    createdBy: int("createdBy").notNull(),
    updatedBy: int("updatedBy").notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
  },
  (table) => ({
    classIdx: index("lessons_class_idx").on(table.classId),
    expiresIdx: index("lessons_expires_idx").on(table.expiresAt),
    dateIdx: index("lessons_date_idx").on(table.lessonDate),
    subjectIdx: index("lessons_subject_idx").on(table.subject)
  })
);
var attachments = mysqlTable(
  "attachments",
  {
    id: int("id").autoincrement().primaryKey(),
    lessonId: int("lessonId").notNull(),
    storageKey: varchar("storageKey", { length: 512 }).notNull().unique(),
    originalName: varchar("originalName", { length: 255 }).notNull(),
    mimeType: varchar("mimeType", { length: 120 }).notNull(),
    byteSize: bigint("byteSize", { mode: "number" }).notNull(),
    sha256: varchar("sha256", { length: 64 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (table) => ({
    lessonIdx: index("attachments_lesson_idx").on(table.lessonId)
  })
);
var auditEvents = mysqlTable(
  "auditEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    classId: int("classId"),
    actorUserId: int("actorUserId"),
    eventType: varchar("eventType", { length: 80 }).notNull(),
    objectId: int("objectId"),
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (table) => ({
    classIdx: index("auditEvents_class_idx").on(table.classId),
    createdIdx: index("auditEvents_created_idx").on(table.createdAt)
  })
);

// shared/class.ts
var FIXED_CLASS_NAME = "8\xBA B";

// shared/mysqlConnection.ts
function parseMySqlConnectionString(connectionString) {
  const url = new URL(connectionString);
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!url.hostname || !url.username || !database) {
    throw new Error("DATABASE_URL must include host, user, and database");
  }
  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    ssl: {
      minVersion: "TLSv1.2",
      rejectUnauthorized: true
    }
  };
}

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle({ connection: parseMySqlConnectionString(process.env.DATABASE_URL) });
    } catch (error) {
      console.warn("[Database] Failed to connect", error instanceof Error ? error.message : "unknown");
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values = {
    openId: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? null,
    lastSignedIn: user.lastSignedIn ?? /* @__PURE__ */ new Date()
  };
  const updateSet = {
    name: values.name,
    email: values.email,
    loginMethod: values.loginMethod,
    lastSignedIn: values.lastSignedIn
  };
  if (user.role !== void 0) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}
async function updateUserName(userId, name) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indispon\xEDvel");
  await db.update(users).set({ name: name.trim() }).where(eq(users.id, userId));
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}
async function getMembership(userId, classId) {
  const db = await getDb();
  if (!db) return void 0;
  const conditions = [eq(classMembers.userId, userId), eq(classMembers.status, "active"), eq(classes.name, FIXED_CLASS_NAME)];
  if (classId !== void 0) conditions.push(eq(classMembers.classId, classId));
  const result = await db.select({ member: classMembers, class: classes }).from(classMembers).innerJoin(classes, eq(classes.id, classMembers.classId)).where(and(...conditions)).limit(1);
  return result[0];
}
async function getMemberships(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ member: classMembers, class: classes }).from(classMembers).innerJoin(classes, eq(classes.id, classMembers.classId)).where(and(eq(classMembers.userId, userId), eq(classMembers.status, "active"), eq(classes.name, FIXED_CLASS_NAME))).orderBy(asc(classes.name));
}
async function createClassForUser(userId, name) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indispon\xEDvel");
  const result = await db.insert(classes).values({ name }).$returningId();
  const classId = result[0]?.id;
  if (!classId) throw new Error("N\xE3o foi poss\xEDvel criar a turma");
  await db.insert(classMembers).values({ userId, classId, role: "admin", status: "active" });
  return (await db.select().from(classes).where(eq(classes.id, classId)).limit(1))[0];
}
async function getFixedClass() {
  const db = await getDb();
  if (!db) return void 0;
  return (await db.select().from(classes).where(eq(classes.name, FIXED_CLASS_NAME)).limit(1))[0];
}
async function getClassById(classId) {
  const db = await getDb();
  if (!db) return void 0;
  return (await db.select().from(classes).where(and(eq(classes.id, classId), eq(classes.name, FIXED_CLASS_NAME))).limit(1))[0];
}
async function getClassMembers(classId) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ member: classMembers, user: users }).from(classMembers).innerJoin(users, eq(users.id, classMembers.userId)).where(eq(classMembers.classId, classId)).orderBy(desc(classMembers.joinedAt));
}
async function addMember(userId, classId) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indispon\xEDvel");
  await db.insert(classMembers).values({ userId, classId, role: "member", status: "active" }).onDuplicateKeyUpdate({ set: { status: "active" } });
}
async function setMemberStatus(classId, userId, status) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indispon\xEDvel");
  await db.update(classMembers).set({ status }).where(and(eq(classMembers.classId, classId), eq(classMembers.userId, userId)));
}
async function createInvite(classId, createdBy, tokenHash, expiresAt) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indispon\xEDvel");
  const result = await db.insert(inviteTokens).values({ classId, createdBy, tokenHash, expiresAt, maxUses: 100, usedCount: 0 }).$returningId();
  return result[0]?.id;
}
async function getInviteByHash(tokenHash) {
  const db = await getDb();
  if (!db) return void 0;
  return (await db.select().from(inviteTokens).where(eq(inviteTokens.tokenHash, tokenHash)).limit(1))[0];
}
async function revokeInvites(classId) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indispon\xEDvel");
  await db.update(inviteTokens).set({ revokedAt: /* @__PURE__ */ new Date() }).where(and(eq(inviteTokens.classId, classId), isNull(inviteTokens.revokedAt)));
}
async function incrementInviteUsage(id) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indispon\xEDvel");
  await db.update(inviteTokens).set({ usedCount: sql`${inviteTokens.usedCount} + 1` }).where(eq(inviteTokens.id, id));
}
async function listLessons(classId, filters) {
  const db = await getDb();
  if (!db) return [];
  const now = /* @__PURE__ */ new Date();
  const conditions = [eq(lessons.classId, classId)];
  if (filters.expiredOnly) conditions.push(lte(lessons.expiresAt, now));
  else if (!filters.includeExpired) conditions.push(gt(lessons.expiresAt, now));
  if (filters.subject) conditions.push(eq(lessons.subject, filters.subject));
  if (filters.from) conditions.push(sql`${lessons.lessonDate} >= ${filters.from}`);
  if (filters.to) conditions.push(sql`${lessons.lessonDate} <= ${filters.to}`);
  const rows = await db.select({ lesson: lessons, authorName: users.name }).from(lessons).leftJoin(users, eq(users.id, lessons.createdBy)).where(and(...conditions)).orderBy(desc(lessons.lessonDate), desc(lessons.createdAt));
  return rows.map((row) => ({ ...row.lesson, authorName: row.authorName || "Aluno da turma" }));
}
async function getLessonForClass(classId, id) {
  const db = await getDb();
  if (!db) return void 0;
  return (await db.select().from(lessons).where(and(eq(lessons.id, id), eq(lessons.classId, classId), gt(lessons.expiresAt, /* @__PURE__ */ new Date()))).limit(1))[0];
}
async function createLesson(values) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indispon\xEDvel");
  const result = await db.insert(lessons).values(values).$returningId();
  return result[0]?.id;
}
async function updateLesson(classId, id, values) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indispon\xEDvel");
  await db.update(lessons).set(values).where(and(eq(lessons.id, id), eq(lessons.classId, classId), gt(lessons.expiresAt, /* @__PURE__ */ new Date())));
}
async function deleteLesson(classId, id) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indispon\xEDvel");
  const found = await db.select().from(attachments).innerJoin(lessons, eq(lessons.id, attachments.lessonId)).where(and(eq(attachments.lessonId, id), eq(lessons.classId, classId)));
  for (const row of found) await storageDelete(row.attachments.storageKey);
  await db.delete(attachments).where(eq(attachments.lessonId, id));
  await db.delete(lessons).where(and(eq(lessons.id, id), eq(lessons.classId, classId)));
  return found.map((item) => item.attachments);
}
async function listAttachments(classId, lessonId) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ attachment: attachments }).from(attachments).innerJoin(lessons, eq(lessons.id, attachments.lessonId)).where(and(eq(lessons.classId, classId), eq(lessons.id, lessonId), gt(lessons.expiresAt, /* @__PURE__ */ new Date())));
}
async function createAttachment(values) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indispon\xEDvel");
  const result = await db.insert(attachments).values(values).$returningId();
  return result[0]?.id;
}
async function addAuditEvent(values) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditEvents).values(values);
}
async function purgeExpiredLessons() {
  const db = await getDb();
  if (!db) return { lessons: 0, attachments: 0 };
  const expired = await db.select({ id: lessons.id }).from(lessons).where(lte(lessons.expiresAt, /* @__PURE__ */ new Date())).limit(500);
  if (!expired.length) return { lessons: 0, attachments: 0 };
  const ids = expired.map((item) => item.id);
  let attachmentCount = 0;
  for (const id of ids) {
    const rows = await db.select().from(attachments).where(eq(attachments.lessonId, id));
    attachmentCount += rows.length;
    for (const row of rows) await storageDelete(row.storageKey);
    await db.delete(attachments).where(eq(attachments.lessonId, id));
    await db.delete(lessons).where(eq(lessons.id, id));
  }
  return { lessons: ids.length, attachments: attachmentCount };
}

// server/routers.ts
var idSchema = z2.number().int().positive();
var dateSchema = z2.coerce.date();
var textSchema = (max) => z2.string().trim().min(1).max(max);
function hashInviteToken(token) {
  return createHash("sha256").update(token).digest("hex");
}
function requireDatabase(value) {
  if (value === void 0 || value === null) {
    throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indispon\xEDvel." });
  }
  return value;
}
async function requireMembership(userId, classId, admin = false) {
  const membership = await getMembership(userId, classId);
  if (!membership) throw new TRPCError3({ code: "FORBIDDEN", message: "Voc\xEA n\xE3o pertence a esta turma." });
  if (admin && membership.member.role !== "admin") {
    throw new TRPCError3({ code: "FORBIDDEN", message: "Apenas administradores podem realizar esta a\xE7\xE3o." });
  }
  return membership;
}
function calculateExpiry(lessonDate) {
  const expiry = new Date(lessonDate);
  expiry.setUTCDate(expiry.getUTCDate() + 10);
  return expiry;
}
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    register: publicProcedure.input(z2.object({ name: z2.string().trim().min(2, "Digite seu nome completo.").max(80) })).mutation(async ({ ctx, input }) => {
      const openId = createLocalOpenId();
      await upsertUser({ openId, name: input.name, loginMethod: "local", role: "user" });
      const user = await getUserByOpenId(openId);
      if (!user) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "N\xE3o foi poss\xEDvel criar a conta local. Configure o banco de dados." });
      const fixedClass = await getFixedClass();
      if (fixedClass) await addMember(user.id, fixedClass.id);
      else await createClassForUser(user.id, FIXED_CLASS_NAME);
      setLocalSessionCookie(ctx.req, ctx.res, openId);
      return user;
    }),
    setName: protectedProcedure.input(z2.object({ name: z2.string().trim().min(2, "Digite seu nome completo.").max(80) })).mutation(async ({ ctx, input }) => {
      await updateUserName(ctx.user.id, input.name);
      await addAuditEvent({ actorUserId: ctx.user.id, eventType: "profile_name_updated" });
      return { success: true, name: input.name };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      clearLocalSessionCookie(ctx.res);
      return { success: true };
    })
  }),
  classes: router({
    mine: protectedProcedure.query(async ({ ctx }) => {
      return getMemberships(ctx.user.id);
    }),
    create: protectedProcedure.input(z2.object({})).mutation(async ({ ctx }) => {
      const existing = await getMemberships(ctx.user.id);
      if (existing.length > 0) throw new TRPCError3({ code: "CONFLICT", message: "Voc\xEA j\xE1 participa do 8\xBA B." });
      return requireDatabase(await createClassForUser(ctx.user.id, FIXED_CLASS_NAME));
    }),
    join: protectedProcedure.input(z2.object({ token: textSchema(200) })).mutation(async ({ ctx, input }) => {
      const invite = await getInviteByHash(hashInviteToken(input.token));
      const invitedClass = invite ? await getClassById(invite.classId) : void 0;
      if (!invite || !invitedClass || invite.revokedAt || invite.expiresAt <= /* @__PURE__ */ new Date() || invite.usedCount >= invite.maxUses) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "Este convite \xE9 inv\xE1lido, expirou ou foi revogado." });
      }
      await addMember(ctx.user.id, invite.classId);
      await incrementInviteUsage(invite.id);
      await addAuditEvent({ classId: invite.classId, actorUserId: ctx.user.id, eventType: "member_joined" });
      return { success: true, classId: invite.classId };
    }),
    members: protectedProcedure.input(z2.object({ classId: idSchema })).query(async ({ ctx, input }) => {
      await requireMembership(ctx.user.id, input.classId, true);
      return getClassMembers(input.classId);
    }),
    setMemberStatus: protectedProcedure.input(z2.object({ classId: idSchema, userId: idSchema, status: z2.enum(["active", "inactive"]) })).mutation(async ({ ctx, input }) => {
      await requireMembership(ctx.user.id, input.classId, true);
      if (input.userId === ctx.user.id) throw new TRPCError3({ code: "BAD_REQUEST", message: "Voc\xEA n\xE3o pode desativar a pr\xF3pria conta." });
      await setMemberStatus(input.classId, input.userId, input.status);
      return { success: true };
    }),
    rotateInvite: protectedProcedure.input(z2.object({ classId: idSchema, expiresInDays: z2.number().int().min(1).max(90).default(30) })).mutation(async ({ ctx, input }) => {
      await requireMembership(ctx.user.id, input.classId, true);
      await revokeInvites(input.classId);
      const token = randomBytes2(32).toString("base64url");
      const expiresAt = new Date(Date.now() + input.expiresInDays * 864e5);
      await createInvite(input.classId, ctx.user.id, hashInviteToken(token), expiresAt);
      await addAuditEvent({ classId: input.classId, actorUserId: ctx.user.id, eventType: "invite_rotated" });
      return { token, expiresAt, invitePath: `/?invite=${encodeURIComponent(token)}` };
    })
  }),
  lessons: router({
    list: protectedProcedure.input(z2.object({ classId: idSchema, subject: z2.string().trim().max(80).optional(), from: dateSchema.optional(), to: dateSchema.optional(), includeExpired: z2.boolean().optional(), expiredOnly: z2.boolean().optional() })).query(async ({ ctx, input }) => {
      await requireMembership(ctx.user.id, input.classId);
      return listLessons(input.classId, input);
    }),
    get: protectedProcedure.input(z2.object({ classId: idSchema, id: idSchema })).query(async ({ ctx, input }) => {
      await requireMembership(ctx.user.id, input.classId);
      const lesson = await getLessonForClass(input.classId, input.id);
      if (!lesson) throw new TRPCError3({ code: "NOT_FOUND", message: "Li\xE7\xE3o n\xE3o encontrada ou expirada." });
      const files = await listAttachments(input.classId, input.id);
      return { lesson, attachments: files.map((item) => item.attachment) };
    }),
    create: protectedProcedure.input(z2.object({
      classId: idSchema,
      subject: textSchema(80),
      title: textSchema(180),
      description: z2.string().trim().max(5e3).optional().nullable(),
      lessonDate: dateSchema,
      dueDate: dateSchema.optional().nullable(),
      teacherName: z2.string().trim().max(120).optional().nullable()
    })).mutation(async ({ ctx, input }) => {
      await requireMembership(ctx.user.id, input.classId);
      const lessonDate = new Date(input.lessonDate);
      const expiresAt = calculateExpiry(lessonDate);
      const id = requireDatabase(await createLesson({
        classId: input.classId,
        subject: input.subject,
        title: input.title,
        description: input.description || null,
        lessonDate,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        teacherName: input.teacherName || null,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
        expiresAt
      }));
      await addAuditEvent({ classId: input.classId, actorUserId: ctx.user.id, eventType: "lesson_created", objectId: id });
      return { id, expiresAt };
    }),
    update: protectedProcedure.input(z2.object({
      classId: idSchema,
      id: idSchema,
      subject: textSchema(80),
      title: textSchema(180),
      description: z2.string().trim().max(5e3).optional().nullable(),
      lessonDate: dateSchema,
      dueDate: dateSchema.optional().nullable(),
      teacherName: z2.string().trim().max(120).optional().nullable()
    })).mutation(async ({ ctx, input }) => {
      await requireMembership(ctx.user.id, input.classId);
      const lesson = await getLessonForClass(input.classId, input.id);
      if (!lesson) throw new TRPCError3({ code: "NOT_FOUND", message: "Li\xE7\xE3o n\xE3o encontrada ou expirada." });
      const lessonDate = new Date(input.lessonDate);
      const expiresAt = calculateExpiry(lessonDate);
      await updateLesson(input.classId, input.id, {
        subject: input.subject,
        title: input.title,
        description: input.description || null,
        lessonDate,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        teacherName: input.teacherName || null,
        updatedBy: ctx.user.id,
        expiresAt
      });
      await addAuditEvent({ classId: input.classId, actorUserId: ctx.user.id, eventType: "lesson_updated", objectId: input.id });
      return { success: true };
    }),
    remove: protectedProcedure.input(z2.object({ classId: idSchema, id: idSchema })).mutation(async ({ ctx, input }) => {
      await requireMembership(ctx.user.id, input.classId);
      const lesson = await getLessonForClass(input.classId, input.id);
      if (!lesson) throw new TRPCError3({ code: "NOT_FOUND", message: "Li\xE7\xE3o n\xE3o encontrada ou expirada." });
      await deleteLesson(input.classId, input.id);
      await addAuditEvent({ classId: input.classId, actorUserId: ctx.user.id, eventType: "lesson_deleted", objectId: input.id });
      return { success: true };
    }),
    uploadPdf: protectedProcedure.input(z2.object({ classId: idSchema, lessonId: idSchema, fileName: textSchema(255), mimeType: z2.string().max(120), base64: z2.string().min(1).max(14e6) })).mutation(async ({ ctx, input }) => {
      await requireMembership(ctx.user.id, input.classId);
      const lesson = await getLessonForClass(input.classId, input.lessonId);
      if (!lesson) throw new TRPCError3({ code: "NOT_FOUND", message: "Li\xE7\xE3o n\xE3o encontrada ou expirada." });
      if (input.mimeType !== "application/pdf" || !input.fileName.toLowerCase().endsWith(".pdf")) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "Envie somente um arquivo PDF." });
      }
      const buffer = Buffer.from(input.base64, "base64");
      if (!validatePdfBuffer(buffer)) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "O PDF \xE9 inv\xE1lido, cont\xE9m a\xE7\xF5es n\xE3o permitidas ou excede o limite de 10 MB." });
      }
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "anexo.pdf";
      const storageKey = `classes/${input.classId}/lessons/${input.lessonId}/${randomBytes2(24).toString("hex")}-${safeName}`;
      const uploaded = await storagePut(storageKey, buffer, "application/pdf");
      const checksum = createHash("sha256").update(buffer).digest("hex");
      const attachmentId = requireDatabase(await createAttachment({ lessonId: input.lessonId, storageKey: uploaded.key, originalName: safeName, mimeType: "application/pdf", byteSize: buffer.length, sha256: checksum }));
      await addAuditEvent({ classId: input.classId, actorUserId: ctx.user.id, eventType: "pdf_uploaded", objectId: attachmentId });
      return { id: attachmentId, name: safeName };
    }),
    downloadPdf: protectedProcedure.input(z2.object({ classId: idSchema, lessonId: idSchema, attachmentId: idSchema })).query(async ({ ctx, input }) => {
      await requireMembership(ctx.user.id, input.classId);
      const lesson = await getLessonForClass(input.classId, input.lessonId);
      if (!lesson) throw new TRPCError3({ code: "NOT_FOUND", message: "Li\xE7\xE3o n\xE3o encontrada ou expirada." });
      const dbInstance = await getDb();
      if (!dbInstance) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indispon\xEDvel." });
      const rows = await dbInstance.select({ attachment: attachments }).from(attachments).where(and2(eq2(attachments.id, input.attachmentId), eq2(attachments.lessonId, input.lessonId))).limit(1);
      const attachment = rows[0]?.attachment;
      if (!attachment) throw new TRPCError3({ code: "NOT_FOUND", message: "Arquivo n\xE3o encontrado." });
      const url = await storageGetSignedUrl(attachment.storageKey);
      return { url, name: attachment.originalName };
    })
  })
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  const openId = getLocalSessionOpenId(opts.req);
  if (openId) user = await getUserByOpenId(openId) ?? null;
  return { req: opts.req, res: opts.res, user };
}

// server/cleanup.ts
async function purgeExpiredHandler(req, res) {
  const configuredSecret = process.env.CRON_SECRET;
  const authorization = req.headers.authorization;
  const suppliedSecret = authorization?.startsWith("Bearer ") ? authorization.slice(7) : void 0;
  if (!configuredSecret || !suppliedSecret || suppliedSecret !== configuredSecret) {
    return res.status(401).json({ error: "cron_unauthorized" });
  }
  try {
    const result = await purgeExpiredLessons();
    return res.json({ ok: true, ...result });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "cleanup_failed",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
}

// server/envValidation.ts
var DEVELOPMENT_ENV = ["DATABASE_URL"];
var PRODUCTION_CORE_ENV = ["DATABASE_URL", "JWT_SECRET"];
function validateRequiredEnv() {
  const required = process.env.NODE_ENV === "production" ? PRODUCTION_CORE_ENV : DEVELOPMENT_ENV;
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    const message = `Configura\xE7\xE3o incompleta. Vari\xE1veis ausentes: ${missing.join(", ")}`;
    if (process.env.NODE_ENV === "production") throw new Error(message);
    console.warn(`[Config] ${message}. O servidor iniciou em modo limitado.`);
  }
}

// server/vercel-entry.ts
validateRequiredEnv();
var app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.post("/api/scheduled/purge-expired", purgeExpiredHandler);
app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
var vercel_entry_default = app;
export {
  vercel_entry_default as default
};
