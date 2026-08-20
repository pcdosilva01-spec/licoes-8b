import { describe, expect, it } from "vitest";
import { buildLessonFilter, LESSON_SUBJECTS } from "../shared/lessonFilters";

describe("filtros do caderno", () => {
  const now = new Date("2026-08-19T12:00:00.000Z");

  it("mantém uma lista de matérias em português", () => {
    expect(LESSON_SUBJECTS).toContain("Matemática");
    expect(LESSON_SUBJECTS).toContain("Português");
    expect(LESSON_SUBJECTS.length).toBeGreaterThan(5);
  });

  it("calcula a janela de uma semana atrás", () => {
    const filter = buildLessonFilter("week", "História", now);
    expect(filter.subject).toBe("História");
    expect(filter.from).toEqual(new Date("2026-08-12T12:00:00.000Z"));
    expect(filter.expiredOnly).toBe(false);
  });

  it("solicita somente lições expiradas", () => {
    const filter = buildLessonFilter("expired", "all", now);
    expect(filter.subject).toBeUndefined();
    expect(filter.expiredOnly).toBe(true);
    expect(filter.includeExpired).toBe(false);
  });

  it("inclui expiradas no modo todas", () => {
    const filter = buildLessonFilter("all", "all", now);
    expect(filter.includeExpired).toBe(true);
    expect(filter.expiredOnly).toBe(false);
  });
});
