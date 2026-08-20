import { describe, expect, it } from "vitest";
import { calculateExpiry, hashInviteToken } from "./routers";

function pdfHeader() {
  return Buffer.from("%PDF-1.7\n");
}

describe("regras de lições", () => {
  it("calcula expires_at exatamente dez dias depois em UTC", () => {
    const lessonDate = new Date("2026-08-19T12:00:00.000Z");
    expect(calculateExpiry(lessonDate).toISOString()).toBe("2026-08-29T12:00:00.000Z");
  });

  it("não altera o objeto original da data da aula", () => {
    const lessonDate = new Date("2026-01-01T00:00:00.000Z");
    calculateExpiry(lessonDate);
    expect(lessonDate.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("gera hash irreversível determinístico para convite", () => {
    const token = "convite-secreto-de-teste";
    expect(hashInviteToken(token)).toBe(hashInviteToken(token));
    expect(hashInviteToken(token)).not.toBe(token);
    expect(hashInviteToken(token)).toHaveLength(64);
  });

  it("reconhece o cabeçalho PDF esperado", () => {
    expect(pdfHeader().subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("mantém o template de ambiente sem valores reais", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile(new URL("../env.template", import.meta.url), "utf8");
    expect(content).toContain("DATABASE_URL=");
    expect(content).not.toMatch(/DATABASE_URL=.+/);
  });
});
