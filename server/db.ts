import { and, asc, desc, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  attachments,
  auditEvents,
  classMembers,
  classes,
  inviteTokens,
  lessons,
  InsertUser,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { FIXED_CLASS_NAME } from "@shared/class";
import { storageDelete } from "./storage";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect", error instanceof Error ? error.message : "unknown");
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = {
    openId: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? null,
    lastSignedIn: user.lastSignedIn ?? new Date(),
  };
  const updateSet: Record<string, unknown> = {
    name: values.name,
    email: values.email,
    loginMethod: values.loginMethod,
    lastSignedIn: values.lastSignedIn,
  };
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function updateUserName(userId: number, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(users).set({ name: name.trim() }).where(eq(users.id, userId));
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getMembership(userId: number, classId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  const conditions = [eq(classMembers.userId, userId), eq(classMembers.status, "active"), eq(classes.name, FIXED_CLASS_NAME)];
  if (classId !== undefined) conditions.push(eq(classMembers.classId, classId));
  const result = await db
    .select({ member: classMembers, class: classes })
    .from(classMembers)
    .innerJoin(classes, eq(classes.id, classMembers.classId))
    .where(and(...conditions))
    .limit(1);
  return result[0];
}

export async function getMemberships(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ member: classMembers, class: classes })
    .from(classMembers)
    .innerJoin(classes, eq(classes.id, classMembers.classId))
    .where(and(eq(classMembers.userId, userId), eq(classMembers.status, "active"), eq(classes.name, FIXED_CLASS_NAME)))
    .orderBy(asc(classes.name));
}

export async function createClassForUser(userId: number, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.insert(classes).values({ name }).$returningId();
  const classId = result[0]?.id;
  if (!classId) throw new Error("Não foi possível criar a turma");
  await db.insert(classMembers).values({ userId, classId, role: "admin", status: "active" });
  return (await db.select().from(classes).where(eq(classes.id, classId)).limit(1))[0];
}

export async function getFixedClass() {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(classes).where(eq(classes.name, FIXED_CLASS_NAME)).limit(1))[0];
}

export async function getClassById(classId: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(classes).where(and(eq(classes.id, classId), eq(classes.name, FIXED_CLASS_NAME))).limit(1))[0];
}

export async function getClassMembers(classId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ member: classMembers, user: users })
    .from(classMembers)
    .innerJoin(users, eq(users.id, classMembers.userId))
    .where(eq(classMembers.classId, classId))
    .orderBy(desc(classMembers.joinedAt));
}

export async function addMember(userId: number, classId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db
    .insert(classMembers)
    .values({ userId, classId, role: "member", status: "active" })
    .onDuplicateKeyUpdate({ set: { status: "active" } });
}

export async function setMemberStatus(classId: number, userId: number, status: "active" | "inactive") {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(classMembers).set({ status }).where(and(eq(classMembers.classId, classId), eq(classMembers.userId, userId)));
}

export async function createInvite(classId: number, createdBy: number, tokenHash: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.insert(inviteTokens).values({ classId, createdBy, tokenHash, expiresAt, maxUses: 100, usedCount: 0 }).$returningId();
  return result[0]?.id;
}

export async function getInviteByHash(tokenHash: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(inviteTokens).where(eq(inviteTokens.tokenHash, tokenHash)).limit(1))[0];
}

export async function revokeInvites(classId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(inviteTokens).set({ revokedAt: new Date() }).where(and(eq(inviteTokens.classId, classId), isNull(inviteTokens.revokedAt)));
}

export async function incrementInviteUsage(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(inviteTokens).set({ usedCount: sql`${inviteTokens.usedCount} + 1` }).where(eq(inviteTokens.id, id));
}

export async function listLessons(classId: number, filters: { subject?: string; from?: Date; to?: Date; includeExpired?: boolean; expiredOnly?: boolean }) {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const conditions = [eq(lessons.classId, classId)];
  if (filters.expiredOnly) conditions.push(lte(lessons.expiresAt, now));
  else if (!filters.includeExpired) conditions.push(gt(lessons.expiresAt, now));
  if (filters.subject) conditions.push(eq(lessons.subject, filters.subject));
  if (filters.from) conditions.push(sql`${lessons.lessonDate} >= ${filters.from}`);
  if (filters.to) conditions.push(sql`${lessons.lessonDate} <= ${filters.to}`);
  const rows = await db
    .select({ lesson: lessons, authorName: users.name })
    .from(lessons)
    .leftJoin(users, eq(users.id, lessons.createdBy))
    .where(and(...conditions))
    .orderBy(desc(lessons.lessonDate), desc(lessons.createdAt));
  return rows.map(row => ({ ...row.lesson, authorName: row.authorName || "Aluno da turma" }));
}

export async function getLessonForClass(classId: number, id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(lessons).where(and(eq(lessons.id, id), eq(lessons.classId, classId), gt(lessons.expiresAt, new Date()))).limit(1))[0];
}

export async function createLesson(values: typeof lessons.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.insert(lessons).values(values).$returningId();
  return result[0]?.id;
}

export async function updateLesson(classId: number, id: number, values: Partial<typeof lessons.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(lessons).set(values).where(and(eq(lessons.id, id), eq(lessons.classId, classId), gt(lessons.expiresAt, new Date())));
}

export async function deleteLesson(classId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const found = await db.select().from(attachments).innerJoin(lessons, eq(lessons.id, attachments.lessonId)).where(and(eq(attachments.lessonId, id), eq(lessons.classId, classId)));
  for (const row of found) await storageDelete(row.attachments.storageKey);
  await db.delete(attachments).where(eq(attachments.lessonId, id));
  await db.delete(lessons).where(and(eq(lessons.id, id), eq(lessons.classId, classId)));
  return found.map(item => item.attachments);
}

export async function listAttachments(classId: number, lessonId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ attachment: attachments })
    .from(attachments)
    .innerJoin(lessons, eq(lessons.id, attachments.lessonId))
    .where(and(eq(lessons.classId, classId), eq(lessons.id, lessonId), gt(lessons.expiresAt, new Date())));
}

export async function createAttachment(values: typeof attachments.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.insert(attachments).values(values).$returningId();
  return result[0]?.id;
}

export async function addAuditEvent(values: typeof auditEvents.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditEvents).values(values);
}

export async function purgeExpiredLessons() {
  const db = await getDb();
  if (!db) return { lessons: 0, attachments: 0 };
  const expired = await db.select({ id: lessons.id }).from(lessons).where(lte(lessons.expiresAt, new Date())).limit(500);
  if (!expired.length) return { lessons: 0, attachments: 0 };
  const ids = expired.map(item => item.id);
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
