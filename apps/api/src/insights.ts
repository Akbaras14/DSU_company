import { Router } from "express";
import { plantAgeDays } from "@dsu/contracts";
import { z } from "zod";
import { db } from "./db.js";
import { HttpError } from "./http.js";
export const insights = Router();

async function data() {
  const [
    products,
    batches,
    observations,
    orders,
    approvals,
    payments,
    settings,
  ] = await Promise.all([
    db.product.findMany(),
    db.batch.findMany({
      include: { product: true, assignee: { select: { name: true } } },
    }),
    db.observation.findMany({
      include: {
        observer: { select: { name: true } },
        batch: { include: { product: true } },
      },
      orderBy: { observedAt: "desc" },
    }),
    db.order.findMany({
      include: { items: true, payment: true },
      orderBy: { createdAt: "desc" },
    }),
    db.readinessApproval.findMany({ where: { status: "PENDING" } }),
    db.payment.findMany({ where: { status: "WAITING" } }),
    db.systemSettings.findUniqueOrThrow({ where: { id: 1 } }),
  ]);
  return {
    products,
    batches,
    observations,
    orders,
    approvals,
    payments,
    settings,
  };
}
function alerts(source: Awaited<ReturnType<typeof data>>) {
  const rows: {
    key: string;
    kind: string;
    title: string;
    href: string;
    createdAt: string;
  }[] = [];
  const add = (
    key: string,
    kind: string,
    title: string,
    href: string,
    date: Date,
  ) => rows.push({ key, kind, title, href, createdAt: date.toISOString() });
  for (const row of source.approvals)
    add(
      `approval:${row.id}`,
      "READY_FOR_SALE_REQUEST",
      `Review kesiapan jual ${row.batchId}`,
      "/admin/approval",
      row.createdAt,
    );
  for (const row of source.payments)
    add(
      `payment:${row.id}:${row.paidAt.getTime()}`,
      "PAYMENT_RECEIVED",
      `Verifikasi pembayaran ${row.orderId}`,
      "/admin/pembayaran",
      row.paidAt,
    );
  for (const row of source.orders.filter((o) =>
    ["PENDING_PAYMENT", "PENDING_CONFIRMATION"].includes(o.status),
  ))
    add(
      `order:${row.id}`,
      "NEW_ORDER",
      `Pesanan baru ${row.id}`,
      "/admin/pesanan",
      row.createdAt,
    );
  for (const row of source.products.filter((p) => p.active)) {
    const available = source.batches
      .filter((b) => b.productId === row.id && b.status !== "ARCHIVED")
      .reduce((sum, b) => sum + b.physical - b.reserved, 0);
    if (available <= row.minimumStock)
      add(
        `low:${row.id}:${row.updatedAt.getTime()}`,
        "LOW_STOCK",
        `${row.name}: stok rendah (${available})`,
        "/admin/inventory",
        row.updatedAt,
      );
  }
  for (const batch of source.batches.filter((b) => b.status !== "ARCHIVED")) {
    const last = source.observations.find((o) => o.batchId === batch.id);
    if (last?.health === "CRITICAL")
      add(
        `critical:${last.id}`,
        "PLANT_CRITICAL",
        `Kondisi kritis ${batch.id}`,
        "/admin/monitoring",
        last.observedAt,
      );
    const date = last?.observedAt ?? batch.enteredAt;
    if (
      Date.now() - date.getTime() >
      source.settings.monitoringIntervalDays * 86400000
    )
      add(
        `overdue:${batch.id}:${date.getTime()}`,
        "MONITORING_OVERDUE",
        `${batch.id} belum dipantau sesuai interval`,
        "/admin/monitoring",
        date,
      );
  }
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
insights.get("/dashboard", async (req, res) => {
  const source = await data(),
    period = z
      .enum(["7", "30", "month", "year"])
      .parse(req.query.period ?? "30");
  const day = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Jakarta",
  });
  const start =
    period === "year"
      ? `${day.slice(0, 4)}-01-01`
      : period === "month"
        ? `${day.slice(0, 7)}-01`
        : new Date(
            Date.now() - (Number(period) - 1) * 86400000,
          ).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  const sales = source.orders.filter(
    (o) =>
      o.payment?.status === "VERIFIED" &&
      !["CANCELLED", "EXPIRED"].includes(o.status) &&
      (o.payment.reviewedAt ?? o.createdAt) >=
        new Date(`${start}T00:00:00+07:00`),
  );
  const grouped = new Map<
    string,
    { date: string; transactions: number; revenue: number; plants: number }
  >();
  for (const order of sales) {
    const date = (
        order.payment!.reviewedAt ?? order.createdAt
      ).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }),
      row = grouped.get(date) ?? {
        date,
        transactions: 0,
        revenue: 0,
        plants: 0,
      };
    row.transactions++;
    row.revenue += order.total;
    row.plants += order.items.reduce((sum, line) => sum + line.quantity, 0);
    grouped.set(date, row);
  }
  const active = source.batches.filter((b) => b.status !== "ARCHIVED");
  const totals = active.reduce(
    (sum, b) => ({
      physical: sum.physical + b.physical,
      ready: sum.ready + b.approved - b.reserved,
      monitoring: sum.monitoring + b.physical - b.approved,
      reserved: sum.reserved + b.reserved,
      sold: sum.sold + b.sold,
      damaged: sum.damaged + b.damaged + b.dead,
    }),
    { physical: 0, ready: 0, monitoring: 0, reserved: 0, sold: 0, damaged: 0 },
  );
  const notifications = alerts(source),
    activity = await db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  res.json({
    metrics: {
      plants: source.products.filter((p) => p.active).length,
      batches: active.length,
      ...totals,
      low: notifications.filter((n) => n.kind === "LOW_STOCK").length,
      newOrders: notifications.filter((n) => n.kind === "NEW_ORDER").length,
      payments: source.payments.length,
      approvals: source.approvals.length,
    },
    notifications,
    sales: [...grouped.values()].sort((a, b) => a.date.localeCompare(b.date)),
    activity,
  });
});
insights.get("/notifications", async (_req, res) => {
  const [source, reads] = await Promise.all([
    data(),
    db.notificationRead.findMany({ where: { userId: res.locals.userId } }),
  ]);
  res.json(
    alerts(source).map((row) => ({
      ...row,
      read: reads.some((r) => r.notificationKey === row.key),
    })),
  );
});
insights.post("/notifications/read", async (req, res) => {
  const input = z
    .object({ keys: z.array(z.string().max(150)).max(1000) })
    .strict()
    .parse(req.body);
  await db.notificationRead.createMany({
    data: input.keys.map((notificationKey) => ({
      notificationKey,
      userId: res.locals.userId,
    })),
    skipDuplicates: true,
  });
  res.json({ ok: true });
});
insights.get("/reports", async (req, res) => {
  const query = z
    .object({
      type: z.enum(["inventory", "monitoring", "sales", "movements"]),
      from: z.iso.date().optional(),
      to: z.iso.date().optional(),
    })
    .strict()
    .parse(req.query);
  const from = query.from
      ? new Date(`${query.from}T00:00:00+07:00`)
      : new Date(0),
    to = query.to ? new Date(`${query.to}T23:59:59.999+07:00`) : new Date();
  if (from > to) throw new HttpError(422, "Rentang tanggal tidak valid.");
  const source = await data();
  const rows =
    query.type === "inventory"
      ? source.batches.map((b) => ({
          batch: b.id,
          plant: b.product.name,
          location: b.location,
          plantedAt: b.plantedAt?.toISOString().slice(0, 10) ?? null,
          ageDays: plantAgeDays(b.plantedAt?.toISOString() ?? null),
          status: b.status,
          total: b.physical + b.sold + b.damaged + b.dead,
          available: b.physical - b.reserved,
          ready: b.approved - b.reserved,
          reserved: b.reserved,
          sold: b.sold,
          damaged: b.damaged,
          dead: b.dead,
          minimum: b.product.minimumStock,
        }))
      : query.type === "monitoring"
        ? source.observations
            .filter((o) => o.observedAt >= from && o.observedAt <= to)
            .map((o) => ({
              date: o.observedAt.toISOString(),
              plant: o.batch.product.name,
              batch: o.batchId,
              staff: o.observer.name,
              health: o.health,
              condition: o.condition,
              samples: o.sampleCount,
              notes: o.notes,
              readiness: o.batch.status,
            }))
        : query.type === "movements"
          ? (
              await db.inventoryTransaction.findMany({
                where: { createdAt: { gte: from, lte: to } },
                orderBy: { createdAt: "desc" },
              })
            ).map((m) => ({
              date: m.createdAt.toISOString(),
              batch: m.batchId,
              kind: m.kind,
              quantity: m.quantity,
              before: m.beforeQuantity,
              after: m.afterQuantity,
              reason: m.reason,
            }))
          : source.orders
              .filter((o) => o.createdAt >= from && o.createdAt <= to)
              .map((o) => ({
                date: o.createdAt.toISOString(),
                order: o.id,
                customer: o.contactName,
                status: o.status,
                payment: o.payment?.status ?? "UNPAID",
                plants: o.items.reduce((sum, i) => sum + i.quantity, 0),
                revenue:
                  o.payment?.status === "VERIFIED" &&
                  !["CANCELLED", "EXPIRED"].includes(o.status)
                    ? o.total
                    : 0,
                shipping: o.shippingCost,
                products: o.items
                  .map((i) => `${i.name} (${i.quantity})`)
                  .join("; "),
              }));
  res.json(rows);
});
insights.get("/search", async (req, res) => {
  const q = z.string().trim().min(2).max(100).parse(req.query.q);
  const [plants, batches, orders, users] = await Promise.all([
    db.product.findMany({
      where: { OR: [{ id: { contains: q } }, { name: { contains: q } }] },
      take: 10,
    }),
    db.batch.findMany({ where: { id: { contains: q } }, take: 10 }),
    db.order.findMany({ where: { id: { contains: q } }, take: 10 }),
    db.user.findMany({
      where: {
        role: { not: "ADMIN" },
        OR: [{ name: { contains: q } }, { email: { contains: q } }],
      },
      select: { id: true, name: true, role: true },
      take: 10,
    }),
  ]);
  res.json([
    ...plants.map((p) => ({ id: p.id, label: p.name, href: "/admin/tanaman" })),
    ...batches.map((b) => ({ id: b.id, label: b.id, href: "/admin/batch" })),
    ...orders.map((o) => ({ id: o.id, label: o.id, href: "/admin/pesanan" })),
    ...users.map((u) => ({
      id: u.id,
      label: u.name,
      href: u.role === "PETUGAS" ? "/admin/petugas" : "/admin/pelanggan",
    })),
  ]);
});
