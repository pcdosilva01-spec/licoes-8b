const DEVELOPMENT_ENV = ["DATABASE_URL"] as const;
const PRODUCTION_CORE_ENV = ["DATABASE_URL", "JWT_SECRET"] as const;

/**
 * Validates only dependencies required to boot the API and authenticate users.
 * Optional integrations such as S3 and Cron are validated at the operation
 * boundary so a missing PDF/cleanup configuration cannot take down auth.me.
 */
export function validateRequiredEnv() {
  const required = process.env.NODE_ENV === "production" ? PRODUCTION_CORE_ENV : DEVELOPMENT_ENV;
  const missing = required.filter(key => !process.env[key]?.trim());
  if (missing.length > 0) {
    const message = `Configuração incompleta. Variáveis ausentes: ${missing.join(", ")}`;
    if (process.env.NODE_ENV === "production") throw new Error(message);
    console.warn(`[Config] ${message}. O servidor iniciou em modo limitado.`);
  }
}
