import type { Request, Response } from "express";
import { purgeExpiredLessons } from "./db";

export async function purgeExpiredHandler(req: Request, res: Response) {
  const configuredSecret = process.env.CRON_SECRET;
  const authorization = req.headers.authorization;
  const suppliedSecret = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
  if (!configuredSecret || !suppliedSecret || suppliedSecret !== configuredSecret) {
    return res.status(401).json({ error: "cron_unauthorized" });
  }

  try {
    const result = await purgeExpiredLessons();
    return res.json({ ok: true, ...result });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "cleanup_failed",
      timestamp: new Date().toISOString(),
    });
  }
}
