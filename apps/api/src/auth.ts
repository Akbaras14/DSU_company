import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import type { Request, RequestHandler, Response } from "express";
import type { Role } from "@prisma/client";
import { z } from "zod";
import { db, transaction } from "./db.js";
import { config } from "./config.js";
import { HttpError } from "./http.js";

const scrypt = promisify(scryptCallback);
const cookieName = "dsu_auth";
export const credentials = z.object({
  email: z
    .email("Alamat surel tidak valid.")
    .max(191)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(10, "Kata sandi minimal 10 karakter.").max(128),
});
export const registration = credentials
  .extend({ name: z.string().trim().min(2).max(100) })
  .strict();
export const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  phone: true,
  address: true,
  provinceId: true,
  regencyId: true,
  districtId: true,
  villageId: true,
  postalCode: true,
} as const;

/** Uses salted scrypt; only the encoded hash is stored. */
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const [salt, hash] = encoded.split(":");
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
const readToken = (req: Request) =>
  req.headers.cookie
    ?.split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);

/** Creates an opaque, server-revocable session; no identity is trusted from browser cookies. */
export async function openSession(
  userId: string,
  req: Request,
  res: Response,
  expectedPasswordHash: string,
) {
  const previous = readToken(req);
  const token = randomBytes(32).toString("hex");
  const csrfToken = randomBytes(32).toString("hex");
  let maxAge = 7 * 86400000;
  await transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM User WHERE id = ${userId} FOR UPDATE`;
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user?.active || user.passwordHash !== expectedPasswordHash)
      throw new HttpError(401, "Kredensial berubah. Silakan masuk kembali.");
    maxAge = user.role === "PELANGGAN" ? 7 * 86400000 : 8 * 3600000;
    if (previous)
      await tx.session.deleteMany({
        where: { tokenHash: tokenHash(previous) },
      });
    await tx.session.create({
      data: {
        userId,
        tokenHash: tokenHash(token),
        csrfToken,
        expiresAt: new Date(Date.now() + maxAge),
      },
    });
  });
  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  return csrfToken;
}
export async function session(req: Request) {
  const token = readToken(req);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const value = await db.session.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: { user: { select: { ...userSelect, active: true } } },
  });
  return value && value.expiresAt > new Date() && value.user.active
    ? value
    : null;
}
export const requireRole =
  (role: Role): RequestHandler =>
  async (req, res, next) => {
    const value = await session(req);
    if (!value) throw new HttpError(401, "Silakan masuk ke akun Anda.");
    if (value.user.role !== role)
      throw new HttpError(403, "Anda tidak memiliki akses ke halaman ini.");
    if (
      !["GET", "HEAD"].includes(req.method) &&
      req.get("x-csrf-token") !== value.csrfToken
    )
      throw new HttpError(403, "Sesi keamanan berubah. Muat ulang halaman.");
    res.locals.userId = value.user.id;
    res.locals.sessionHash = value.tokenHash;
    next();
  };
export async function logout(req: Request, res: Response) {
  const value = await session(req);
  if (value && req.get("x-csrf-token") !== value.csrfToken)
    throw new HttpError(403, "Sesi keamanan berubah.");
  if (value)
    await db.session.deleteMany({ where: { tokenHash: value.tokenHash } });
  res.clearCookie(cookieName, {
    path: "/",
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "lax",
  });
  res.json({ ok: true });
}
