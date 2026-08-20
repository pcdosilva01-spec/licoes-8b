import { createHash, randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { clearLocalSessionCookie, createLocalOpenId, setLocalSessionCookie } from "./localAuth";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { storageGetSignedUrl, storagePut } from "./storage";
import { validatePdfBuffer } from "./pdfValidation";
import * as db from "./db";
import { addAuditEvent } from "./db";
import { attachments, lessons } from "../drizzle/schema";
import { FIXED_CLASS_NAME } from "@shared/class";

const idSchema = z.number().int().positive();
const dateSchema = z.coerce.date();
const textSchema = (max: number) => z.string().trim().min(1).max(max);

export function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function requireDatabase<T>(value: T | undefined): T {
  if (value === undefined || value === null) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
  }
  return value;
}

async function requireMembership(userId: number, classId: number, admin = false) {
  const membership = await db.getMembership(userId, classId);
  if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "Você não pertence a esta turma." });
  if (admin && membership.member.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem realizar esta ação." });
  }
  return membership;
}

export function calculateExpiry(lessonDate: Date) {
  const expiry = new Date(lessonDate);
  expiry.setUTCDate(expiry.getUTCDate() + 10);
  return expiry;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    register: publicProcedure
      .input(z.object({ name: z.string().trim().min(2, "Digite seu nome completo.").max(80) }))
      .mutation(async ({ ctx, input }) => {
        const openId = createLocalOpenId();
        await db.upsertUser({ openId, name: input.name, loginMethod: "local", role: "user" });
        const user = await db.getUserByOpenId(openId);
        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível criar a conta local. Configure o banco de dados." });
        const fixedClass = await db.getFixedClass();
        if (fixedClass) await db.addMember(user.id, fixedClass.id);
        else await db.createClassForUser(user.id, FIXED_CLASS_NAME);
        setLocalSessionCookie(ctx.req, ctx.res, openId);
        return user;
      }),
    setName: protectedProcedure
      .input(z.object({ name: z.string().trim().min(2, "Digite seu nome completo.").max(80) }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserName(ctx.user.id, input.name);
        await db.addAuditEvent({ actorUserId: ctx.user.id, eventType: "profile_name_updated" });
        return { success: true, name: input.name } as const;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      clearLocalSessionCookie(ctx.res);
      return { success: true } as const;
    }),
  }),

  classes: router({
    mine: protectedProcedure.query(async ({ ctx }) => {
      return db.getMemberships(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({}))
      .mutation(async ({ ctx }) => {
        const existing = await db.getMemberships(ctx.user.id);
        if (existing.length > 0) throw new TRPCError({ code: "CONFLICT", message: "Você já participa do 8º B." });
        return requireDatabase(await db.createClassForUser(ctx.user.id, FIXED_CLASS_NAME));
      }),

    join: protectedProcedure
      .input(z.object({ token: textSchema(200) }))
      .mutation(async ({ ctx, input }) => {
        const invite = await db.getInviteByHash(hashInviteToken(input.token));
        const invitedClass = invite ? await db.getClassById(invite.classId) : undefined;
        if (!invite || !invitedClass || invite.revokedAt || invite.expiresAt <= new Date() || invite.usedCount >= invite.maxUses) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Este convite é inválido, expirou ou foi revogado." });
        }
        await db.addMember(ctx.user.id, invite.classId);
        await db.incrementInviteUsage(invite.id);
        await addAuditEvent({ classId: invite.classId, actorUserId: ctx.user.id, eventType: "member_joined" });
        return { success: true, classId: invite.classId };
      }),

    members: protectedProcedure
      .input(z.object({ classId: idSchema }))
      .query(async ({ ctx, input }) => {
        await requireMembership(ctx.user.id, input.classId, true);
        return db.getClassMembers(input.classId);
      }),

    setMemberStatus: protectedProcedure
      .input(z.object({ classId: idSchema, userId: idSchema, status: z.enum(["active", "inactive"]) }))
      .mutation(async ({ ctx, input }) => {
        await requireMembership(ctx.user.id, input.classId, true);
        if (input.userId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Você não pode desativar a própria conta." });
        await db.setMemberStatus(input.classId, input.userId, input.status);
        return { success: true };
      }),

    rotateInvite: protectedProcedure
      .input(z.object({ classId: idSchema, expiresInDays: z.number().int().min(1).max(90).default(30) }))
      .mutation(async ({ ctx, input }) => {
        await requireMembership(ctx.user.id, input.classId, true);
        await db.revokeInvites(input.classId);
        const token = randomBytes(32).toString("base64url");
        const expiresAt = new Date(Date.now() + input.expiresInDays * 86400000);
        await db.createInvite(input.classId, ctx.user.id, hashInviteToken(token), expiresAt);
        await addAuditEvent({ classId: input.classId, actorUserId: ctx.user.id, eventType: "invite_rotated" });
        return { token, expiresAt, invitePath: `/?invite=${encodeURIComponent(token)}` };
      }),
  }),

  lessons: router({
    list: protectedProcedure
      .input(z.object({ classId: idSchema, subject: z.string().trim().max(80).optional(), from: dateSchema.optional(), to: dateSchema.optional(), includeExpired: z.boolean().optional(), expiredOnly: z.boolean().optional() }))
      .query(async ({ ctx, input }) => {
        await requireMembership(ctx.user.id, input.classId);
        return db.listLessons(input.classId, input);
      }),

    get: protectedProcedure
      .input(z.object({ classId: idSchema, id: idSchema }))
      .query(async ({ ctx, input }) => {
        await requireMembership(ctx.user.id, input.classId);
        const lesson = await db.getLessonForClass(input.classId, input.id);
        if (!lesson) throw new TRPCError({ code: "NOT_FOUND", message: "Lição não encontrada ou expirada." });
        const files = await db.listAttachments(input.classId, input.id);
        return { lesson, attachments: files.map(item => item.attachment) };
      }),

    create: protectedProcedure
      .input(z.object({
        classId: idSchema,
        subject: textSchema(80),
        title: textSchema(180),
        description: z.string().trim().max(5000).optional().nullable(),
        lessonDate: dateSchema,
        dueDate: dateSchema.optional().nullable(),
        teacherName: z.string().trim().max(120).optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        await requireMembership(ctx.user.id, input.classId);
        const lessonDate = new Date(input.lessonDate);
        const expiresAt = calculateExpiry(lessonDate);
        const id = requireDatabase(await db.createLesson({
          classId: input.classId,
          subject: input.subject,
          title: input.title,
          description: input.description || null,
          lessonDate,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          teacherName: input.teacherName || null,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
          expiresAt,
        }));
        await addAuditEvent({ classId: input.classId, actorUserId: ctx.user.id, eventType: "lesson_created", objectId: id });
        return { id, expiresAt };
      }),

    update: protectedProcedure
      .input(z.object({
        classId: idSchema,
        id: idSchema,
        subject: textSchema(80),
        title: textSchema(180),
        description: z.string().trim().max(5000).optional().nullable(),
        lessonDate: dateSchema,
        dueDate: dateSchema.optional().nullable(),
        teacherName: z.string().trim().max(120).optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        await requireMembership(ctx.user.id, input.classId);
        const lesson = await db.getLessonForClass(input.classId, input.id);
        if (!lesson) throw new TRPCError({ code: "NOT_FOUND", message: "Lição não encontrada ou expirada." });
        const lessonDate = new Date(input.lessonDate);
        const expiresAt = calculateExpiry(lessonDate);
        await db.updateLesson(input.classId, input.id, {
          subject: input.subject,
          title: input.title,
          description: input.description || null,
          lessonDate,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          teacherName: input.teacherName || null,
          updatedBy: ctx.user.id,
          expiresAt,
        });
        await addAuditEvent({ classId: input.classId, actorUserId: ctx.user.id, eventType: "lesson_updated", objectId: input.id });
        return { success: true };
      }),

    remove: protectedProcedure
      .input(z.object({ classId: idSchema, id: idSchema }))
      .mutation(async ({ ctx, input }) => {
        await requireMembership(ctx.user.id, input.classId);
        const lesson = await db.getLessonForClass(input.classId, input.id);
        if (!lesson) throw new TRPCError({ code: "NOT_FOUND", message: "Lição não encontrada ou expirada." });
        await db.deleteLesson(input.classId, input.id);
        await addAuditEvent({ classId: input.classId, actorUserId: ctx.user.id, eventType: "lesson_deleted", objectId: input.id });
        return { success: true };
      }),

    uploadPdf: protectedProcedure
      .input(z.object({ classId: idSchema, lessonId: idSchema, fileName: textSchema(255), mimeType: z.string().max(120), base64: z.string().min(1).max(14_000_000) }))
      .mutation(async ({ ctx, input }) => {
        await requireMembership(ctx.user.id, input.classId);
        const lesson = await db.getLessonForClass(input.classId, input.lessonId);
        if (!lesson) throw new TRPCError({ code: "NOT_FOUND", message: "Lição não encontrada ou expirada." });
        if (input.mimeType !== "application/pdf" || !input.fileName.toLowerCase().endsWith(".pdf")) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Envie somente um arquivo PDF." });
        }
        const buffer = Buffer.from(input.base64, "base64");
        if (!validatePdfBuffer(buffer)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "O PDF é inválido, contém ações não permitidas ou excede o limite de 10 MB." });
        }
        const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "anexo.pdf";
        const storageKey = `classes/${input.classId}/lessons/${input.lessonId}/${randomBytes(24).toString("hex")}-${safeName}`;
        const uploaded = await storagePut(storageKey, buffer, "application/pdf");
        const checksum = createHash("sha256").update(buffer).digest("hex");
        const attachmentId = requireDatabase(await db.createAttachment({ lessonId: input.lessonId, storageKey: uploaded.key, originalName: safeName, mimeType: "application/pdf", byteSize: buffer.length, sha256: checksum }));
        await addAuditEvent({ classId: input.classId, actorUserId: ctx.user.id, eventType: "pdf_uploaded", objectId: attachmentId });
        return { id: attachmentId, name: safeName };
      }),

    downloadPdf: protectedProcedure
      .input(z.object({ classId: idSchema, lessonId: idSchema, attachmentId: idSchema }))
      .query(async ({ ctx, input }) => {
        await requireMembership(ctx.user.id, input.classId);
        const lesson = await db.getLessonForClass(input.classId, input.lessonId);
        if (!lesson) throw new TRPCError({ code: "NOT_FOUND", message: "Lição não encontrada ou expirada." });
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
        const rows = await dbInstance.select({ attachment: attachments }).from(attachments).where(and(eq(attachments.id, input.attachmentId), eq(attachments.lessonId, input.lessonId))).limit(1);
        const attachment = rows[0]?.attachment;
        if (!attachment) throw new TRPCError({ code: "NOT_FOUND", message: "Arquivo não encontrado." });
        const url = await storageGetSignedUrl(attachment.storageKey);
        return { url, name: attachment.originalName };
      }),
  }),
});

export type AppRouter = typeof appRouter;
