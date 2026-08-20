import {
  bigint,
  boolean,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/mysql-core";

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

export const classes = mysqlTable("classes", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  archivedAt: timestamp("archivedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const classMembers = mysqlTable(
  "classMembers",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    classId: int("classId").notNull(),
    role: mysqlEnum("role", ["member", "admin"]).default("member").notNull(),
    status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
    joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  },
  table => ({
    userClassUnique: unique("classMembers_user_class_unique").on(table.userId, table.classId),
    userIdx: index("classMembers_user_idx").on(table.userId),
    classIdx: index("classMembers_class_idx").on(table.classId),
  })
);

export const inviteTokens = mysqlTable(
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
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    classIdx: index("inviteTokens_class_idx").on(table.classId),
    expiresIdx: index("inviteTokens_expires_idx").on(table.expiresAt),
  })
);

export const lessons = mysqlTable(
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
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    classIdx: index("lessons_class_idx").on(table.classId),
    expiresIdx: index("lessons_expires_idx").on(table.expiresAt),
    dateIdx: index("lessons_date_idx").on(table.lessonDate),
    subjectIdx: index("lessons_subject_idx").on(table.subject),
  })
);

export const attachments = mysqlTable(
  "attachments",
  {
    id: int("id").autoincrement().primaryKey(),
    lessonId: int("lessonId").notNull(),
    storageKey: varchar("storageKey", { length: 512 }).notNull().unique(),
    originalName: varchar("originalName", { length: 255 }).notNull(),
    mimeType: varchar("mimeType", { length: 120 }).notNull(),
    byteSize: bigint("byteSize", { mode: "number" }).notNull(),
    sha256: varchar("sha256", { length: 64 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    lessonIdx: index("attachments_lesson_idx").on(table.lessonId),
  })
);

export const auditEvents = mysqlTable(
  "auditEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    classId: int("classId"),
    actorUserId: int("actorUserId"),
    eventType: varchar("eventType", { length: 80 }).notNull(),
    objectId: int("objectId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    classIdx: index("auditEvents_class_idx").on(table.classId),
    createdIdx: index("auditEvents_created_idx").on(table.createdAt),
  })
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Class = typeof classes.$inferSelect;
export type ClassMember = typeof classMembers.$inferSelect;
export type InviteToken = typeof inviteTokens.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
