import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { db } from "../apps/api/src/db.js";
import { config } from "../apps/api/src/config.js";
import { hashPassword, registration, verifyPassword } from "../apps/api/src/auth.js";

/** Local setup; credentials stay in an ignored file and existing accounts are preserved. */
try {
  const url = new URL(config.DATABASE_URL);
  if (config.NODE_ENV !== "development" || !["localhost", "127.0.0.1"].includes(url.hostname) || url.pathname !== "/db_dsu")
    throw new Error("Bootstrap ini hanya untuk database pengembangan lokal db_dsu.");
  const email = "petugas@dsu.local";
  if (await db.user.findUnique({ where: { email } })) {
    throw new Error("Email petugas@dsu.local sudah digunakan; akun tidak diubah.");
  }
  const input = registration.parse({ name: "Petugas DSU", email, password: randomBytes(24).toString("base64url") });
  await writeFile(new URL("../.env.petugas.local", import.meta.url), `PETUGAS_EMAIL="${input.email}"\nPETUGAS_NAME="${input.name}"\nPETUGAS_PASSWORD="${input.password}"\n`, { flag: "wx", mode: 0o600 });
  const user = await db.user.create({ data: { name: input.name, email: input.email, passwordHash: await hashPassword(input.password), role: "PETUGAS" } });
  const saved = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  assert.equal(saved.role, "PETUGAS");
  assert.equal(saved.active, true);
  assert.ok(await verifyPassword(input.password, saved.passwordHash));
  console.info("Akun petugas dibuat dan diverifikasi. Kredensial tersimpan di .env.petugas.local.");
} finally {
  await db.$disconnect();
}
