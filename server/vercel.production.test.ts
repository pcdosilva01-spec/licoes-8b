import { afterEach, describe, expect, it } from "vitest";
import { validateRequiredEnv } from "./envValidation";
import { storagePut } from "./storage";
import { parseMySqlConnectionString } from "@shared/mysqlConnection";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("conexões e produção Vercel", () => {
  it("converte a URL MySQL em opções com SSL compatível com mysql2", () => {
    const options = parseMySqlConnectionString("mysql://user:pass@host:4000/db");
    expect(options.host).toBe("host");
    expect(options.port).toBe(4000);
    expect(options.user).toBe("user");
    expect(options.password).toBe("pass");
    expect(options.database).toBe("db");
    expect(options.ssl).toEqual({ minVersion: "TLSv1.2", rejectUnauthorized: true });
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
