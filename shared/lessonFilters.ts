export const LESSON_SUBJECTS = [
  "Matemática",
  "Português",
  "História",
  "Geografia",
  "Ciências",
  "Inglês",
  "Educação Física",
  "Artes",
  "Ensino Religioso",
  "Outra",
] as const;

export type LessonPeriod = "active" | "week" | "all" | "expired";

export function buildLessonFilter(period: LessonPeriod, subject: string, now = new Date()) {
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  return {
    subject: subject === "all" ? undefined : subject,
    from: period === "week" ? weekAgo : undefined,
    to: undefined,
    includeExpired: period === "all",
    expiredOnly: period === "expired",
  };
}
