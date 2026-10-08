import { z } from "zod";
import { credentials, hashPassword, verifyPassword } from "./auth.js";
import { transaction } from "./db.js";
import { audit } from "./audit.js";
import { HttpError } from "./http.js";

const passwordInput = z
  .object({
    currentPassword: credentials.shape.password,
    newPassword: credentials.shape.password,
    confirmPassword: credentials.shape.password,
  })
  .strict()
  .refine((input) => input.newPassword === input.confirmPassword);

export async function changePassword(
  actorId: string,
  targetId: string,
  sessionHash: string,
  body: unknown,
) {
  const input = passwordInput.parse(body);
  const passwordHash = await hashPassword(input.newPassword);
  await transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM User WHERE id = ${actorId} FOR UPDATE`;
    const actor = await tx.user.findUniqueOrThrow({ where: { id: actorId } });
    const currentSession = await tx.session.findUnique({
      where: { tokenHash: sessionHash },
    });
    if (
      !actor.active ||
      !currentSession ||
      currentSession.userId !== actorId ||
      currentSession.expiresAt <= new Date()
    )
      throw new HttpError(401, "Sesi berakhir. Silakan masuk kembali.");
    if (!(await verifyPassword(input.currentPassword, actor.passwordHash)))
      throw new HttpError(403, "Kata sandi saat ini tidak sesuai.");
    await tx.$queryRaw`SELECT id FROM User WHERE id = ${targetId} FOR UPDATE`;
    const target = await tx.user.findUniqueOrThrow({ where: { id: targetId } });
    if (
      actorId !== targetId &&
      (actor.role !== "ADMIN" || target.role === "ADMIN")
    )
      throw new HttpError(
        403,
        "Reset hanya diizinkan untuk akun petugas dan pelanggan.",
      );
    if (await verifyPassword(input.newPassword, target.passwordHash))
      throw new HttpError(
        422,
        "Kata sandi baru harus berbeda dari kata sandi sebelumnya.",
      );
    await tx.user.update({ where: { id: targetId }, data: { passwordHash } });
    await tx.session.deleteMany({ where: { userId: targetId } });
    await audit(
      actorId,
      actorId === targetId ? "CHANGE_PASSWORD" : "RESET_PASSWORD",
      "User",
      targetId,
      null,
      null,
      "Kata sandi diperbarui dan seluruh sesi akun dicabut",
      tx,
      actor.role,
    );
  });
}

/** Only the operator with server/database access can recover a locked-out admin. */
export async function recoverAdmin(
  email: string | undefined,
  password: string | undefined,
) {
  const input = credentials.parse({ email, password });
  const passwordHash = await hashPassword(input.password);
  await transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { email: input.email } });
    if (!user?.active || user.role !== "ADMIN")
      throw new HttpError(404, "Akun admin aktif tidak ditemukan.");
    await tx.$queryRaw`SELECT id FROM User WHERE id = ${user.id} FOR UPDATE`;
    await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
    await tx.session.deleteMany({ where: { userId: user.id } });
    await audit(
      user.id,
      "RECOVER_ADMIN_PASSWORD",
      "User",
      user.id,
      null,
      null,
      "Pemulihan kata sandi admin melalui operator server; seluruh sesi dicabut",
      tx,
    );
  });
}
