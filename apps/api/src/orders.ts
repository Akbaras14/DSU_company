import { createHash } from "node:crypto";
import { z } from "zod";
import { Prisma, type OrderStatus } from "@prisma/client";
import { db, lockCustomer, transaction, type Transaction } from "./db.js";
import { config } from "./config.js";
import { HttpError } from "./http.js";
import { audit } from "./audit.js";
import { productIdSchema, quantitySchema, stockAvailable } from "./catalog.js";

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(100),
  phone: z
    .string()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .pipe(
      z
        .string()
        .regex(/^(?:\+62|62|0)[0-9]{8,13}$/, "Nomor telepon tidak valid."),
    ),
  address: z.string().trim().min(8, "Alamat minimal 8 karakter.").max(500),
});
const checkoutContactSchema = contactSchema.extend({
  address: z.string().trim().max(500),
  postalCode: z
    .string()
    .regex(/^(?:|\d{5})$/, "Kode pos harus terdiri dari 5 angka."),
});
export const checkoutSchema = z
  .object({
    contact: checkoutContactSchema,
    fulfillmentMethod: z.enum(["DELIVERY", "PICKUP"]),
    key: z.string().uuid(),
    lines: z
      .array(
        z.object({
          productId: productIdSchema,
          quantity: quantitySchema,
          unitPrice: z.number().int().nonnegative(),
        }),
      )
      .min(1)
      .max(100),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.fulfillmentMethod !== "DELIVERY") return;
    if (input.contact.address.length < 8)
      context.addIssue({
        code: "custom",
        message: "Alamat minimal 8 karakter.",
        path: ["contact", "address"],
      });
    if (!/^\d{5}$/.test(input.contact.postalCode))
      context.addIssue({
        code: "custom",
        message: "Kode pos harus terdiri dari 5 angka.",
        path: ["contact", "postalCode"],
      });
    if (
      `${input.contact.address}, Kode Pos ${input.contact.postalCode}`.length >
      500
    )
      context.addIssue({
        code: "custom",
        message: "Alamat dan kode pos maksimal 500 karakter.",
        path: ["contact", "address"],
      });
  });
const includeOrder = {
  items: true,
  payment: true,
  events: { orderBy: { createdAt: "asc" as const } },
};
type FullOrder = Prisma.OrderGetPayload<{ include: typeof includeOrder }>;

/** WhatsApp is a handoff only. Opening its link cannot change a saved order's status. */
export function presentOrder(order: FullOrder) {
  const total = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(order.total + order.shippingCost);
  const fulfillment =
    order.fulfillmentMethod === "DELIVERY"
      ? `Kirim ke: ${order.contactAddress}`
      : `Ambil di nursery: ${order.pickupAddress}`;
  const text = `Halo CV. Delta Sinergi Utama, saya ingin mengonfirmasi pesanan ${order.id}.\nNama: ${order.contactName}\n${order.items.map((line) => `- ${line.name}: ${line.quantity} tanaman`).join("\n")}\nTotal: ${total}\n${fulfillment}. Mohon konfirmasi ketersediaan, jadwal, biaya pengiriman jika ada, dan instruksi pembayaran.`;
  return {
    id: order.id,
    createdAt: order.createdAt,
    expiresAt: order.expiresAt,
    status: order.status,
    total: order.total,
    items: order.items.map(({ productId, name, quantity, unitPrice }) => ({
      productId,
      name,
      quantity,
      unitPrice,
    })),
    contact: {
      name: order.contactName,
      phone: order.contactPhone,
      address: order.contactAddress,
    },
    fulfillmentMethod: order.fulfillmentMethod,
    trackingNumber: order.trackingNumber,
    shippingCost: order.shippingCost,
    payment: order.payment,
    pickupAddress: order.pickupAddress,
    whatsappUrl: `https://wa.me/${order.whatsappNumber}?text=${encodeURIComponent(text)}`,
    events: order.events.map(({ status, reason, createdAt }) => ({
      status,
      reason,
      createdAt,
    })),
  };
}
export async function orders(userId?: string) {
  return (
    await db.order.findMany({
      where: userId ? { userId } : {},
      include: includeOrder,
      orderBy: { createdAt: "desc" },
      take: 100,
    })
  ).map(presentOrder);
}

/** Reserves approved stock in one serializable MySQL transaction and snapshots prices. */
export async function checkout(
  userId: string,
  input: z.infer<typeof checkoutSchema>,
) {
  const requestHash = createHash("sha256")
    .update(
      JSON.stringify({
        contact: input.contact,
        fulfillmentMethod: input.fulfillmentMethod,
        lines: [...input.lines].sort((a, b) =>
          a.productId.localeCompare(b.productId),
        ),
      }),
    )
    .digest("hex");
  const result = await transaction(async (tx) => {
    await lockCustomer(tx, userId);
    const previous = await tx.order.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey: input.key } },
      include: includeOrder,
    });
    if (previous) {
      if (previous.requestHash !== requestHash)
        throw new HttpError(
          409,
          "Referensi checkout sudah dipakai untuk data berbeda.",
        );
      return previous;
    }
    const rows = await tx.cartItem.findMany({
      where: { userId },
      include: {
        product: { include: { batches: { orderBy: { id: "asc" } } } },
      },
      orderBy: { productId: "asc" },
    });
    if (!rows.length) throw new HttpError(409, "Keranjang masih kosong.");
    if (
      rows.length !== input.lines.length ||
      rows.some(
        (row) =>
          !input.lines.some(
            (line) =>
              line.productId === row.productId &&
              line.quantity === row.quantity &&
              line.unitPrice ===
                (row.product.discountPrice ?? row.product.price),
          ),
      )
    )
      throw new HttpError(
        409,
        "Isi keranjang atau harga berubah. Periksa kembali sebelum checkout.",
      );
    let total = 0;
    const allocations: { batchId: string; quantity: number }[] = [];
    for (const row of rows) {
      if (
        !row.product.published ||
        row.quantity > stockAvailable(row.product.batches)
      )
        throw new HttpError(409, `Stok ${row.product.name} tidak mencukupi.`);
      total += row.quantity * (row.product.discountPrice ?? row.product.price);
      let remaining = row.quantity;
      for (const batch of row.product.batches) {
        const quantity = Math.min(remaining, stockAvailable([batch]));
        if (quantity <= 0) continue;
        const updated = await tx.batch.updateMany({
          where: {
            id: batch.id,
            reserved: batch.reserved,
            approved: batch.approved,
          },
          data: {
            reserved: { increment: quantity },
            ...(batch.publishedStock !== null
              ? { publishedStock: { decrement: quantity } }
              : {}),
          },
        });
        if (updated.count !== 1)
          throw new HttpError(409, "Stok berubah. Silakan ulangi checkout.");
        allocations.push({ batchId: batch.id, quantity });
        await tx.inventoryTransaction.create({
          data: {
            reference: `RESERVE:${input.key}:${batch.id}`,
            batchId: batch.id,
            actorId: userId,
            kind: "RESERVATION",
            quantity,
            beforeQuantity: batch.reserved,
            afterQuantity: batch.reserved + quantity,
            reason: `Reservasi checkout ${input.key}`,
          },
        });
        remaining -= quantity;
        if (!remaining) break;
      }
      if (remaining) throw new HttpError(409, "Stok belum dapat dialokasikan.");
    }
    if (!Number.isSafeInteger(total) || total > 2147483647)
      throw new HttpError(422, "Nilai pesanan melebihi batas transaksi.");
    const settings = await tx.systemSettings.findUnique({ where: { id: 1 } });
    const order = await tx.order.create({
      data: {
        userId,
        idempotencyKey: input.key,
        requestHash,
        total,
        contactName: input.contact.name,
        contactPhone: input.contact.phone,
        contactAddress:
          input.fulfillmentMethod === "DELIVERY"
            ? `${input.contact.address}, Kode Pos ${input.contact.postalCode}`
            : "Ambil di tempat pembibitan",
        fulfillmentMethod: input.fulfillmentMethod,
        whatsappNumber: config.WHATSAPP_NUMBER,
        pickupAddress: settings?.address || config.PICKUP_ADDRESS,
        status: "PENDING_PAYMENT",
        expiresAt: new Date(
          Date.now() +
            (settings?.paymentTimeoutHours ?? config.RESERVATION_HOURS) *
              3600000,
        ),
        items: {
          create: rows.map(({ product, quantity }) => ({
            productId: product.id,
            name: product.name,
            unitPrice: product.discountPrice ?? product.price,
            quantity,
          })),
        },
        reservations: { create: allocations },
        events: {
          create: {
            status: "PENDING_PAYMENT",
            actorId: userId,
            reason:
              "Pesanan dibuat; stok direservasi sampai pembayaran diverifikasi.",
          },
        },
      },
      include: includeOrder,
    });
    await tx.cartItem.deleteMany({ where: { userId } });
    await audit(
      userId,
      "NEW_ORDER",
      "Order",
      order.id,
      null,
      { status: order.status, total: order.total },
      "Checkout dan reservasi stok",
      tx,
      "PELANGGAN",
    );
    return order;
  });
  return presentOrder(result);
}

export const transitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PENDING_PAYMENT: ["CANCELLED", "EXPIRED"],
  WAITING_VERIFICATION: ["CANCELLED"],
  PAYMENT_REJECTED: ["CANCELLED", "EXPIRED"],
  PAID: ["PROCESSING"],
  READY_TO_SHIP: ["SHIPPED"],
  PENDING_CONFIRMATION: ["CONFIRMED", "CANCELLED", "EXPIRED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["READY_FOR_PICKUP", "READY_TO_SHIP", "SHIPPED"],
  READY_FOR_PICKUP: ["COMPLETED", "CANCELLED"],
  SHIPPED: ["COMPLETED"],
};

export async function closeReservations(
  tx: Transaction,
  orderId: string,
  actorId: string,
  fulfill: boolean,
) {
  const reservations = await tx.reservation.findMany({
    where: { orderId, status: "ACTIVE" },
    orderBy: { batchId: "asc" },
  });
  for (const entry of reservations) {
    const changed = await tx.batch.updateMany({
      where: {
        id: entry.batchId,
        reserved: { gte: entry.quantity },
        approved: { gte: entry.quantity },
        physical: { gte: entry.quantity },
      },
      data: {
        reserved: { decrement: entry.quantity },
        ...(fulfill
          ? {
              physical: { decrement: entry.quantity },
              approved: { decrement: entry.quantity },
              sold: { increment: entry.quantity },
            }
          : { publishedStock: { increment: entry.quantity } }),
      },
    });
    if (changed.count !== 1)
      throw new HttpError(
        409,
        "Stok perlu direkonsiliasi sebelum pesanan diproses.",
      );
    await tx.inventoryTransaction.create({
      data: {
        reference: `${fulfill ? "FULFILL" : "RELEASE"}:${entry.id}`,
        batchId: entry.batchId,
        actorId,
        kind: fulfill ? "SALE" : "RESERVATION_RELEASE",
        quantity: entry.quantity,
        reason: `${fulfill ? "Pembayaran diverifikasi" : "Reservasi dilepas"}: ${orderId}`,
      },
    });
    const batch = await tx.batch.findUniqueOrThrow({
      where: { id: entry.batchId },
    });
    if (fulfill)
      await tx.batch.update({
        where: { id: batch.id },
        data: { status: batch.physical === 0 ? "SOLD_OUT" : "PARTIALLY_SOLD" },
      });
  }
  await tx.reservation.updateMany({
    where: { orderId, status: "ACTIVE" },
    data: { status: fulfill ? "FULFILLED" : "RELEASED" },
  });
}

/** Locks the order to make cancellation, expiry and fulfillment safe to retry. */
export async function transitionOrder(
  id: string,
  actorId: string,
  status: OrderStatus,
  reason: string,
  customer = false,
  trackingNumber?: string,
) {
  const order = await transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM \`Order\` WHERE id = ${id} FOR UPDATE`;
    const current = await tx.order.findUnique({
      where: { id },
      include: includeOrder,
    });
    if (!current || (customer && current.userId !== actorId))
      throw new HttpError(404, "Pesanan tidak ditemukan.");
    if (current.status === status) return current;
    if (status === "CANCELLED" && current.payment?.status === "VERIFIED") throw new HttpError(409, "Pesanan yang telah dibayar memerlukan proses retur sebelum pembatalan.");
    if (
      customer &&
      (status !== "CANCELLED" ||
        ![
          "PENDING_CONFIRMATION",
          "PENDING_PAYMENT",
          "PAYMENT_REJECTED",
        ].includes(current.status))
    )
      throw new HttpError(
        409,
        "Hubungi admin untuk membatalkan pesanan yang sudah dikonfirmasi.",
      );
    if (customer) {
      const settings = await tx.systemSettings.findUnique({ where: { id: 1 } });
      if (settings && !settings.allowCustomerCancellation)
        throw new HttpError(
          403,
          "Pembatalan pelanggan dinonaktifkan; hubungi admin.",
        );
    }
    if (
      [
        "PROCESSING",
        "READY_TO_SHIP",
        "SHIPPED",
        "READY_FOR_PICKUP",
        "COMPLETED",
      ].includes(status) &&
      current.payment?.status !== "VERIFIED"
    )
      throw new HttpError(
        409,
        "Pembayaran harus diverifikasi sebelum pesanan diproses.",
      );
    if (!transitions[current.status]?.includes(status))
      throw new HttpError(409, "Perubahan status pesanan tidak diizinkan.");
    if (
      (["SHIPPED", "READY_TO_SHIP"].includes(status) &&
        current.fulfillmentMethod !== "DELIVERY") ||
      (status === "READY_FOR_PICKUP" &&
        current.fulfillmentMethod === "DELIVERY")
    )
      throw new HttpError(
        409,
        "Status tidak sesuai dengan metode pemenuhan pesanan.",
      );
    const tracking = trackingNumber?.trim() || current.trackingNumber;
    if (
      current.fulfillmentMethod === "DELIVERY" &&
      ["SHIPPED", "COMPLETED"].includes(status) &&
      !tracking
    )
      throw new HttpError(
        400,
        "Nomor resi wajib diisi untuk pesanan pengiriman.",
      );
    if (tracking && tracking.length > 100)
      throw new HttpError(400, "Nomor resi maksimal 100 karakter.");
    if (status === "EXPIRED" && current.expiresAt > new Date())
      throw new HttpError(409, "Reservasi belum kedaluwarsa.");
    if (status === "CONFIRMED" && current.expiresAt <= new Date())
      throw new HttpError(409, "Reservasi sudah kedaluwarsa.");
    if (["CANCELLED", "EXPIRED", "COMPLETED"].includes(status))
      await closeReservations(tx, id, actorId, status === "COMPLETED");
    const result = await tx.order.update({
      where: { id },
      data: {
        status,
        ...(current.fulfillmentMethod === "DELIVERY" && tracking
          ? { trackingNumber: tracking }
          : {}),
        events: { create: { status, reason, actorId } },
      },
      include: includeOrder,
    });
    await audit(
      actorId,
      "ORDER_STATUS",
      "Order",
      id,
      { status: current.status },
      { status },
      reason,
      tx,
      customer ? "PELANGGAN" : "ADMIN",
    );
    return result;
  });
  return presentOrder(order);
}
export async function expireOrders() {
  const stale = await db.order.findMany({
    where: {
      status: {
        in: ["PENDING_CONFIRMATION", "PENDING_PAYMENT", "PAYMENT_REJECTED"],
      },
      expiresAt: { lte: new Date() },
    },
    select: { id: true },
    take: 100,
  });
  for (const order of stale) {
    try {
      await transitionOrder(
        order.id,
        "system",
        "EXPIRED",
        "Batas konfirmasi WhatsApp berakhir.",
      );
    } catch (error) {
      if (!(error instanceof HttpError && error.status === 409)) throw error;
    }
  }
  await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
