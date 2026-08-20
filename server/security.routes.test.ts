import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";
import type { TrpcContext } from "./_core/context";

const user = {
  id: 7,
  openId: "security-test-user",
  name: "Aluno de teste",
  email: "aluno@example.com",
  loginMethod: "manus",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function caller() {
  const ctx = {
    user,
    req: {} as TrpcContext["req"],
    res: { cookie: vi.fn(), clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  } as TrpcContext;
  return appRouter.createCaller(ctx);
}

const membership = (role: "member" | "admin" = "member", classId = 12) => ({
  member: { id: 1, userId: user.id, classId, role, status: "active" as const, joinedAt: new Date() },
  class: { id: classId, name: "Turma de teste", archivedAt: null, createdAt: new Date(), updatedAt: new Date() },
});

describe("segurança de procedimentos", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("cria uma conta local pelo nome e emite cookie de sessão", async () => {
    vi.spyOn(db, "upsertUser").mockResolvedValue(undefined);
    vi.spyOn(db, "getUserByOpenId").mockResolvedValue({ ...user, id: 22, openId: "local:novo-aluno", name: "Maria Souza", loginMethod: "local" } as any);
    vi.spyOn(db, "getFixedClass").mockResolvedValue({ id: 12, name: "8º B", archivedAt: null, createdAt: new Date(), updatedAt: new Date() } as any);
    const addMember = vi.spyOn(db, "addMember").mockResolvedValue(undefined);
    const result = await caller().auth.register({ name: "Maria Souza" });
    expect(result.name).toBe("Maria Souza");
    expect(addMember).toHaveBeenCalledWith(22, 12);
  });

  it("retorna o nome do autor junto com as lições", async () => {
    vi.spyOn(db, "getMembership").mockResolvedValue(membership("member") as any);
    vi.spyOn(db, "listLessons").mockResolvedValue([{ id: 1, classId: 12, title: "Revisão", authorName: "Maria Souza" }] as any);
    const result = await caller().lessons.list({ classId: 12, period: "active" });
    expect(result[0]?.authorName).toBe("Maria Souza");
  });

  it("salva o nome obrigatório do aluno", async () => {
    const updateName = vi.spyOn(db, "updateUserName").mockResolvedValue(undefined);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined);
    const result = await caller().auth.setName({ name: "  João Silva  " });
    expect(result).toEqual({ success: true, name: "João Silva" });
    expect(updateName).toHaveBeenCalledWith(user.id, "João Silva");
  });

  it("rejeita nome curto no cadastro", async () => {
    await expect(caller().auth.setName({ name: "A" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("cria somente a sala fixa 8º B", async () => {
    vi.spyOn(db, "getMemberships").mockResolvedValue([]);
    const createClass = vi.spyOn(db, "createClassForUser").mockResolvedValue({ id: 12, name: "8º B", createdAt: new Date(), updatedAt: new Date(), archivedAt: null } as any);
    const result = await caller().classes.create({});
    expect(result.name).toBe("8º B");
    expect(createClass).toHaveBeenCalledWith(user.id, "8º B");
  });

  it("bloqueia acesso administrativo para membro comum", async () => {
    vi.spyOn(db, "getMembership").mockResolvedValue(membership("member") as any);
    await expect(caller().classes.members({ classId: 12 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("não consulta lição sem validar vínculo com a turma", async () => {
    vi.spyOn(db, "getMembership").mockResolvedValue(undefined);
    const getLesson = vi.spyOn(db, "getLessonForClass");
    await expect(caller().lessons.get({ classId: 99, id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(getLesson).not.toHaveBeenCalled();
  });

  it("aceita convite válido usando o hash do token e associa o usuário", async () => {
    vi.spyOn(db, "getInviteByHash").mockResolvedValue({ id: 4, classId: 12, tokenHash: "hash", expiresAt: new Date(Date.now() + 60_000), revokedAt: null, maxUses: 10, usedCount: 0, createdBy: 1, createdAt: new Date() } as any);
    vi.spyOn(db, "getClassById").mockResolvedValue({ id: 12, name: "8º B", archivedAt: null, createdAt: new Date(), updatedAt: new Date() } as any);
    const addMember = vi.spyOn(db, "addMember").mockResolvedValue(undefined);
    const increment = vi.spyOn(db, "incrementInviteUsage").mockResolvedValue(undefined);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined);
    const result = await caller().classes.join({ token: "token-secreto" });
    expect(result.success).toBe(true);
    expect(addMember).toHaveBeenCalledWith(user.id, 12);
    expect(increment).toHaveBeenCalledWith(4);
  });

  it("recusa convite de outra turma mesmo que o token seja válido", async () => {
    vi.spyOn(db, "getInviteByHash").mockResolvedValue({ id: 4, classId: 99, tokenHash: "hash", expiresAt: new Date(Date.now() + 60_000), revokedAt: null, maxUses: 10, usedCount: 0, createdBy: 1, createdAt: new Date() } as any);
    vi.spyOn(db, "getClassById").mockResolvedValue(undefined);
    await expect(caller().classes.join({ token: "token-secreto" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("recusa convite expirado sem adicionar membro", async () => {
    vi.spyOn(db, "getInviteByHash").mockResolvedValue({ id: 4, classId: 12, tokenHash: "hash", expiresAt: new Date(Date.now() - 60_000), revokedAt: null, maxUses: 10, usedCount: 0, createdBy: 1, createdAt: new Date() } as any);
    const addMember = vi.spyOn(db, "addMember");
    await expect(caller().classes.join({ token: "token-secreto" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(addMember).not.toHaveBeenCalled();
  });
});
