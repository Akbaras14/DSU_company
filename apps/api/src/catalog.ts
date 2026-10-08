import { z } from "zod";
import { db, lockCustomer, transaction } from "./db.js";
import { HttpError } from "./http.js";

export const productIdSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
export const quantitySchema = z.number().int().min(1).max(1000000);
export const stockAvailable = (
  batches: {
    approved: number;
    reserved: number;
    publishedStock?: number | null;
    status?: string;
  }[],
) =>
  batches.reduce(
    (sum, batch) =>
      sum +
      (batch.status &&
      !["READY_FOR_SALE", "PARTIALLY_SOLD"].includes(batch.status)
        ? 0
        : Math.max(
            0,
            Math.min(
              batch.approved - batch.reserved,
              batch.publishedStock ?? batch.approved,
            ),
          )),
    0,
  );

export async function catalog() {
  // ponytail: a nursery catalog is capped at 500 products; add paged browsing above this ceiling.
  const products = await db.product.findMany({
    where: { published: true },
    include: { batches: true },
    orderBy: { name: "asc" },
    take: 500,
  });
  return products
    .filter((product) => product.active)
    .map(({ batches, ...product }) => ({
      ...product,
      price: product.discountPrice ?? product.price,
      batchIds: [],
      available: stockAvailable(batches),
    }));
}
export async function cart(userId: string) {
  const rows = await db.cartItem.findMany({
    where: { userId },
    include: { product: { include: { batches: true } } },
    orderBy: { productId: "asc" },
  });
  return rows.map(({ product, quantity }) => ({
    productId: product.id,
    name: product.name,
    unitPrice: product.discountPrice ?? product.price,
    quantity,
    imageUrl: product.imageUrl,
    available:
      product.published && product.active ? stockAvailable(product.batches) : 0,
  }));
}

/** Cart writes are owned by the authenticated user and never reserve stock. */
export async function changeCart(
  userId: string,
  productId: string,
  quantity: number,
  mode: "add" | "set",
) {
  await transaction(async (tx) => {
    await lockCustomer(tx, userId);
    const product = await tx.product.findUnique({
      where: { id: productId },
      include: { batches: true },
    });
    if (!product?.published)
      throw new HttpError(404, "Tanaman tidak tersedia.");
    const existing = await tx.cartItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    const next =
      mode === "add" ? quantity + (existing?.quantity ?? 0) : quantity;
    if (next > stockAvailable(product.batches))
      throw new HttpError(409, `Stok ${product.name} tidak mencukupi.`);
    await tx.cartItem.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId, quantity: next },
      update: { quantity: next },
    });
  });
  return cart(userId);
}
export async function removeCart(userId: string, productId: string) {
  await transaction(async (tx) => {
    await lockCustomer(tx, userId);
    await tx.cartItem.deleteMany({ where: { userId, productId } });
  });
  return cart(userId);
}
