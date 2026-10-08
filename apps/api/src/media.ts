import { Router } from "express";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { session } from "./auth.js";
import { HttpError } from "./http.js";

export const media = Router();
const directory = new URL("../uploads/", import.meta.url);
media.post("/", async (req, res) => {
  const current = await session(req);
  if (!current || req.get("x-csrf-token") !== current.csrfToken)
    throw new HttpError(403, "Sesi unggahan tidak valid.");
  const input = z
    .object({
      purpose: z.enum(["plant", "monitoring", "payment"]),
      data: z
        .string()
        .max(7000000)
        .regex(/^[A-Za-z0-9+/]+={0,2}$/),
    })
    .strict()
    .parse(req.body);
  if (
    (input.purpose === "plant" && current.user.role !== "ADMIN") ||
    (input.purpose === "monitoring" && current.user.role !== "PETUGAS") ||
    (input.purpose === "payment" && current.user.role !== "PELANGGAN")
  )
    throw new HttpError(403, "Unggahan tidak sesuai peran akun.");
  const bytes = Buffer.from(input.data, "base64");
  if (!bytes.length || bytes.length > 5 * 1024 * 1024)
    throw new HttpError(422, "Ukuran foto maksimal 5 MB.");
  const extension =
    bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a"
      ? "png"
      : bytes.subarray(0, 3).toString("hex") === "ffd8ff"
        ? "jpg"
        : bytes.toString("ascii", 0, 4) === "RIFF" &&
            bytes.toString("ascii", 8, 12) === "WEBP"
          ? "webp"
          : null;
  if (!extension)
    throw new HttpError(422, "Foto harus berformat PNG, JPEG, atau WebP.");
  await mkdir(directory, { recursive: true });
  const id = `${randomUUID()}.${extension}`;
  await writeFile(new URL(id, directory), bytes, { flag: "wx" });
  await writeFile(
    new URL(`${id}.json`, directory),
    JSON.stringify({ ownerId: current.user.id, purpose: input.purpose }),
    { flag: "wx" },
  );
  res.status(201).json({ url: `/api/v1/media/${id}` });
});
media.get("/:id", async (req, res) => {
  const id = z
    .string()
    .regex(/^[a-f0-9-]{36}\.(?:png|jpg|webp)$/)
    .parse(req.params.id);
  let metadata: { ownerId: string; purpose: string };
  try {
    metadata = JSON.parse(
      await readFile(new URL(`${id}.json`, directory), "utf8"),
    );
  } catch {
    throw new HttpError(404, "Foto tidak ditemukan.");
  }
  if (metadata.purpose !== "plant") {
    const current = await session(req);
    if (
      !current ||
      (current.user.role !== "ADMIN" && current.user.id !== metadata.ownerId)
    )
      throw new HttpError(403, "Anda tidak memiliki akses ke foto ini.");
  }
  res.sendFile(fileURLToPath(new URL(id, directory)));
});
export async function requireMedia(
  url: string,
  purpose: string,
  ownerId: string,
) {
  const id = /^\/api\/v1\/media\/([a-f0-9-]{36}\.(?:png|jpg|webp))$/.exec(
    url,
  )?.[1];
  if (!id)
    throw new HttpError(422, "Unggah foto melalui aplikasi terlebih dahulu.");
  let metadata: { ownerId: string; purpose: string };
  try {
    metadata = JSON.parse(
      await readFile(new URL(`${id}.json`, directory), "utf8"),
    );
  } catch {
    throw new HttpError(422, "Unggahan tidak ditemukan.");
  }
  if (metadata.purpose !== purpose || metadata.ownerId !== ownerId)
    throw new HttpError(403, "Unggahan bukan milik akun Anda.");
}
