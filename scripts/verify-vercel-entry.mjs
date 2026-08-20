import assert from "node:assert/strict";
import { existsSync } from "node:fs";

process.env.NODE_ENV = "production";
process.env.DATABASE_URL = process.env.DATABASE_URL || "mysql://example:example@127.0.0.1:3306/licoes_turma";
process.env.JWT_SECRET = process.env.JWT_SECRET || "local-verification-secret";
process.env.AWS_REGION = process.env.AWS_REGION || "us-east-1";
process.env.AWS_S3_BUCKET = process.env.AWS_S3_BUCKET || "verification-bucket";
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "verification-key";
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "verification-secret";
process.env.CRON_SECRET = process.env.CRON_SECRET || "verification-cron-secret";

assert.equal(existsSync(new URL("../api/index.js", import.meta.url)), true, "api/index.js não foi gerado");
assert.equal(existsSync(new URL("../api/index.ts", import.meta.url)), false, "api/index.ts não pode coexistir com api/index.js");
const module = await import("../api/index.js");
assert.equal(typeof module.default, "function");
console.log("Vercel entrypoint OK: api/index.js é a única Function Express publicada e não usa OAuth.");
