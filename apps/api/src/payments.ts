import { z } from "zod";
import { db, transaction } from "./db.js";
import { HttpError } from "./http.js";
import { audit } from "./audit.js";
import { requireMedia } from "./media.js";
import { closeReservations } from "./orders.js";

export async function submitPayment(
  orderId: string,
  userId: string,
  body: unknown,
) {
  const input = z
    .object({
      amount: z.number().int().positive().max(2147483647),
      method: z.string().trim().min(2).max(100),
      proofUrl: z.string().max(500),
    })
    .strict()
    .parse(body);
  await requireMedia(input.proofUrl, "payment", userId);
  return transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM \`Order\` WHERE id = ${orderId} FOR UPDATE`;
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });
    if (!order || order.userId !== userId)
      throw new HttpError(404, "Pesanan tidak ditemukan.");
    if (
      ![
        "PENDING_PAYMENT",
        "PAYMENT_REJECTED",
        "PENDING_CONFIRMATION",
        "CONFIRMED",
      ].includes(order.status) ||
      order.expiresAt <= new Date()
    )
      throw new HttpError(
        409,
        "Pesanan tidak menerima pembayaran atau sudah kedaluwarsa.",
      );
    if (input.amount !== order.total + order.shippingCost)
      throw new HttpError(422, "Nominal harus sama dengan total tagihan.");
    const payment = await tx.payment.upsert({
      where: { orderId },
      create: { ...input, orderId },
      update: {
        ...input,
        status: "WAITING",
        reason: "",
        paidAt: new Date(),
        reviewedAt: null,
        verifiedBy: null,
      },
    });
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "WAITING_VERIFICATION",
        events: {
          create: {
            status: "WAITING_VERIFICATION",
            actorId: userId,
            reason: "Bukti pembayaran dikirim pelanggan.",
          },
        },
      },
    });
    await audit(
      userId,
      "PAYMENT_RECEIVED",
      "Payment",
      payment.id,
      order.payment,
      payment,
      "Bukti pembayaran menunggu verifikasi",
      tx,
      "PELANGGAN",
    );
    return payment;
  });
}
export async function reviewPayment(
  id: string,
  actorId: string,
  body: unknown,
) {
  const input = z
    .object({
      status: z.enum(["VERIFIED", "REJECTED"]),
      reason: z.string().trim().min(5).max(1000),
    })
    .strict()
    .parse(body);
  const lookup = await db.payment.findUniqueOrThrow({ where: { id } });
  return transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM \`Order\` WHERE id = ${lookup.orderId} FOR UPDATE`;
    const before = await tx.payment.findUniqueOrThrow({
      where: { id },
      include: { order: true },
    });
    if (
      before.status !== "WAITING" ||
      before.order.status !== "WAITING_VERIFICATION"
    )
      throw new HttpError(
        409,
        "Pembayaran sudah ditinjau atau pesanan tidak aktif.",
      );
    if (before.amount !== before.order.total + before.order.shippingCost)
      throw new HttpError(409, "Nominal pembayaran tidak sesuai tagihan.");
    const row = await tx.payment.update({
      where: { id },
      data: { ...input, verifiedBy: actorId, reviewedAt: new Date() },
    });
    if (input.status === "VERIFIED")
      await closeReservations(tx, before.orderId, actorId, true);
    const status = input.status === "VERIFIED" ? "PAID" : "PAYMENT_REJECTED";
    await tx.order.update({
      where: { id: before.orderId },
      data: {
        status,
        events: { create: { status, actorId, reason: input.reason } },
      },
    });
    await audit(
      actorId,
      input.status === "VERIFIED" ? "VERIFY_PAYMENT" : "REJECT_PAYMENT",
      "Payment",
      id,
      before,
      row,
      input.reason,
      tx,
    );
    return row;
  });
}
export const allPayments = () =>
  db.payment.findMany({
    include: {
      order: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: true,
        },
      },
    },
    orderBy: { paidAt: "desc" },
  });
