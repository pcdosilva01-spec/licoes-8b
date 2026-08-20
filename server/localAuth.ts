import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { parse } from "cookie";

export const LOCAL_SESSION_COOKIE = "oitavo_b_local_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function secret() {
  return process.env.JWT_SECRET || "oitavo-b-local-development-secret";
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createLocalSessionToken(openId: string) {
  const payload = `${openId}.${Date.now() + SESSION_TTL_SECONDS * 1000}`;
  const encoded = encode(payload);
  return `${encoded}.${sign(encoded)}`;
}

export function verifyLocalSessionToken(token: string | undefined) {
  if (!token) return undefined;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return undefined;
  const expected = sign(encoded);
  const actual = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actual.length !== expectedBuffer.length || !timingSafeEqual(actual, expectedBuffer)) return undefined;
  const decoded = Buffer.from(encoded, "base64url").toString("utf8");
  const separator = decoded.lastIndexOf(".");
  if (separator <= 0) return undefined;
  const openId = decoded.slice(0, separator);
  const expiresAt = Number(decoded.slice(separator + 1));
  if (!openId || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) return undefined;
  return openId;
}

export function getLocalSessionOpenId(req: Request) {
  return verifyLocalSessionToken(parse(req.headers.cookie || "")[LOCAL_SESSION_COOKIE]);
}

export function setLocalSessionCookie(req: Request, res: Response, openId: string) {
  res.cookie(LOCAL_SESSION_COOKIE, createLocalSessionToken(openId), {
    httpOnly: true,
    secure: req.protocol === "https" || req.headers?.["x-forwarded-proto"] === "https",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS * 1000,
  });
}

export function clearLocalSessionCookie(res: Response) {
  res.clearCookie(LOCAL_SESSION_COOKIE, { httpOnly: true, sameSite: "lax", path: "/" });
}

export function createLocalOpenId() {
  return `local:${randomBytes(24).toString("base64url")}`;
}
