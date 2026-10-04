import { readFile } from "node:fs/promises";
import { db, transaction } from "../apps/api/src/db.js";
import { config } from "../apps/api/src/config.js";

type DummyProduct = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  imageUrl?: string;
  published: boolean;
  batches: {
    id: string;
    location: string;
    physical: number;
    approved: number;
  }[];
};

try {
  const url = new URL(config.DATABASE_URL);
  if (
    config.NODE_ENV !== "development" ||
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    url.pathname !== "/db_dsu"
  )
    throw new Error(
      "Data dummy hanya boleh dimasukkan ke database lokal db_dsu.",
    );
  const input = JSON.parse(
    await readFile(
      new URL("../data/catalog-dummy.json", import.meta.url),
      "utf8",
    ),
  ) as { products: DummyProduct[] };
  if (
    input.products.length !== 10 ||
    input.products.some(
      (p) =>
        !p.id.startsWith("dummy-") ||
        p.batches.some((b) => b.approved > b.physical),
    )
  )
    throw new Error("Diperlukan 10 produk dummy dengan stok valid.");
  const admin = await db.user.findFirst({
    where: { role: "ADMIN", active: true },
    select: { id: true },
  });
  if (!admin)
    throw new Error("Admin lokal aktif diperlukan untuk audit stok dummy.");
  let added = 0;
  await transaction(async (tx) => {
    for (const { batches, ...product } of input.products) {
      if (await tx.product.findUnique({ where: { id: product.id } })) continue;
      await tx.product.create({
        data: {
          ...product,
          batches: {
            create: batches.map((batch) => ({
              ...batch,
              transactions: {
                create: {
                  actorId: admin.id,
                  kind: "RECEIPT",
                  quantity: batch.physical,
                  reference: `DUMMY:${batch.id}`,
                  reason:
                    "Stok simulasi untuk pengujian lokal; bukan inventori perusahaan.",
                },
              },
            })),
          },
        },
      });
      added++;
    }
  });
  console.info(
    `${added} produk dummy ditambahkan; data dan stok yang sudah ada tidak diubah.`,
  );
  console.info(
    `Jumlah produk dummy tersedia: ${await db.product.count({ where: { id: { in: input.products.map((p) => p.id) } } })}.`,
  );
} finally {
  await db.$disconnect();
}
