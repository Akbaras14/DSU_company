import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { db } from "../apps/api/src/db.js";
import { config } from "../apps/api/src/config.js";
import { hashPassword } from "../apps/api/src/auth.js";

/** One-time local setup. Credentials are random and written only to an ignored local file. */
try {
  const url = new URL(config.DATABASE_URL);
  if (config.NODE_ENV !== "development" || !["localhost", "127.0.0.1"].includes(url.hostname) || url.pathname !== "/db_dsu")
    throw new Error("Bootstrap ini hanya untuk database pengembangan lokal db_dsu.");
  if (await db.user.count({ where: { role: "ADMIN" } })) {
    console.info("Akun admin sudah tersedia; tidak diubah.");
  } else {
    const password = randomBytes(24).toString("base64url");
    const email = "admin@dsu.local";
    const path = new URL("../.env.admin.local", import.meta.url);
    await writeFile(path, `ADMIN_EMAIL="${email}"\nADMIN_NAME="Admin DSU"\nADMIN_PASSWORD="${password}"\n`, { flag: "wx", mode: 0o600 });
    await db.user.create({ data: { email, name: "Admin DSU", passwordHash: await hashPassword(password), role: "ADMIN" } });
    console.info("Admin lokal dibuat. Kredensial tersimpan di .env.admin.local (tidak ditampilkan di log).");
  }
} finally { await db.$disconnect(); }
