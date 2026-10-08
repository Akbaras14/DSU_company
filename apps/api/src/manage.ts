import { readFile } from "node:fs/promises";
import { z } from "zod";
import { db, transaction } from "./db.js";
import { registration, hashPassword } from "./auth.js";
import { productIdSchema } from "./catalog.js";
import { recoverAdmin } from "./passwords.js";

/** Operator-only import/bootstrap. Never inserts fictional inventory or overwrites existing stock. */
try {
  if (process.argv[2] === "admin") {
    const input = registration.parse({
      name: process.env.ADMIN_NAME,
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    });
    await db.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: await hashPassword(input.password),
        role: "ADMIN",
      },
    });
    console.info("Akun admin berhasil dibuat.");
  } else if (process.argv[2] === "reset-admin") {
    await recoverAdmin(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
    console.info("Kata sandi admin diperbarui. Seluruh sesi lama dicabut.");
  } else if (process.argv[2] === "catalog") {
    const path = process.argv[3];
    if (!path)
      throw new Error("Berikan lokasi JSON katalog aktual sebagai argumen.");
    const stock = z.number().int().nonnegative().max(1000000);
    const input = z
      .object({
        adminEmail: z.email(),
        products: z
          .array(
            z.object({
              id: productIdSchema,
              name: z.string().min(2).max(150),
              category: z.string().min(2).max(100),
              description: z.string().max(10000),
              price: z.number().int().nonnegative().max(2147483647),
              imageUrl: z
                .string()
                .regex(/^\/images\/[a-zA-Z0-9/_-]+\.(jpg|jpeg|png|webp)$/)
                .nullable()
                .optional(),
              published: z.boolean(),
              batches: z
                .array(
                  z
                    .object({
                      id: productIdSchema,
                      location: z.string().min(2).max(150),
                      physical: stock,
                      approved: stock,
                    })
                    .refine(
                      (b) => b.approved <= b.physical,
                      "Stok siap jual melebihi fisik.",
                    ),
                )
                .min(1),
            }),
          )
          .min(1),
      })
      .parse(JSON.parse(await readFile(path, "utf8")) as unknown);
    const admin = await db.user.findUnique({
      where: { email: input.adminEmail },
    });
    if (!admin?.active || admin.role !== "ADMIN")
      throw new Error("Akun admin aktif diperlukan untuk audit penerimaan.");
    await transaction(async (tx) => {
      for (const { batches, ...product } of input.products) {
        await tx.product.create({
          data: {
            ...product,
            batches: {
              create: batches.map((batch) => ({
                ...batch,
                transactions: batch.physical
                  ? {
                      create: {
                        actorId: admin.id,
                        kind: "RECEIPT",
                        quantity: batch.physical,
                        reference: `OPENING:${batch.id}`,
                        reason:
                          "Penerimaan awal dari data persediaan aktual; kesiapan jual disahkan admin pengimpor.",
                      },
                    }
                  : undefined,
              })),
            },
          },
        });
      }
    });
    console.info(`${input.products.length} produk aktual berhasil diimpor.`);
  } else
    throw new Error("Perintah: admin, reset-admin, atau catalog <file.json>");
} catch (error) {
  console.error(
    error instanceof z.ZodError
      ? "Data konfigurasi/import tidak valid."
      : error instanceof Error
        ? error.message
        : "Operasi gagal.",
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
