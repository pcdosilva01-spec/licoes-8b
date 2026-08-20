import { afterEach, describe, expect, it } from "vitest";
import { validateRequiredEnv } from "./envValidation";
import { storagePut } from "./storage";
import { ensureMySqlTls } from "@shared/mysqlConnection";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("conexões e produção Vercel", () => {
  it("habilita TLS em URLs MySQL sem duplicar ssl", () => {
    expect(ensureMySqlTls("mysql://user:pass@host:4000/db")).toBe("mysql://user:pass@host:4000/db?ssl=true");
    expect(ensureMySqlTls("mysql://user:pass@host:4000/db?ssl=true")).toBe("mysql://user:pass@host:4000/db?ssl=true");
    expect(ensureMySqlTls("mysql://user:pass@host:4000/db?charset=utf8mb4")).toBe("mysql://user:pass@host:4000/db?charset=utf8mb4&ssl=true");
  });
  it("permite inicializar a API com banco e JWT mesmo sem variáveis AWS", () => {
    process.env.NODE_ENV = "production";
    process.env.DATABASE_URL = "mysql://user:password@localhost:3306/database";
    process.env.JWT_SECRET = "test-secret";
    delete process.env.AWS_REGION;
    delete process.env.AWS_S3_BUCKET;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.CRON_SECRET;

    expect(() => validateRequiredEnv()).not.toThrow();
  });

  it("mantém o erro de configuração restrito à operação de storage", async () => {
    delete process.env.AWS_S3_BUCKET;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;

    await expect(storagePut("lessons/test.pdf", Buffer.from("%PDF-1.7"), "application/pdf"))
      .rejects.toThrow("Storage não configurado");
  });
});
