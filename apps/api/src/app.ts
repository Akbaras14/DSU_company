import express from "express";
import { rateLimit } from "express-rate-limit";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db, transaction } from "./db.js";
import { updateProfile } from "./profile.js";
import { storeSettings } from "./config.js";
import {
  credentials,
  registration,
  userSelect,
  hashPassword,
  verifyPassword,
  session,
  openSession,
  requireRole,
  logout,
} from "./auth.js";
import {
  catalog,
  cart,
  changeCart,
  removeCart,
  productIdSchema,
  quantitySchema,
} from "./catalog.js";
import {
  checkout,
  checkoutSchema,
  orders,
  transitionOrder,
  expireOrders,
} from "./orders.js";
import { errorHandler, HttpError, sameOrigin } from "./http.js";
import { nursery, observe, assign, requestReadiness } from "./nursery.js";
import { management } from "./management.js";
import { insights } from "./insights.js";
import { media } from "./media.js";
import { allPayments, reviewPayment, submitPayment } from "./payments.js";
import { audit } from "./audit.js";
import { changePassword } from "./passwords.js";

export const app = express();
app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.set({
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Request-Id": randomUUID(),
  });
  next();
});
app.use(sameOrigin);
app.use("/api/v1/media", express.json({ limit: "7mb" }));
app.use(express.json({ limit: "64kb" }));
const limiter = (limit: number) =>
  rateLimit({
    windowMs: 15 * 60000,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
      error: "Terlalu banyak percobaan. Silakan coba beberapa saat lagi.",
    },
  });
const locationQuery = z
  .object({
    level: z.enum(["provinces", "regencies", "districts", "villages"]),
    parent: z
      .string()
      .regex(/^\d{2,10}$/)
      .optional(),
  })
  .strict()
  .refine((input) => input.level === "provinces" || input.parent, {
    message: "Wilayah induk diperlukan.",
    path: ["parent"],
  });
app.use("/api/v1", limiter(600));
app.use("/api/v1/media", limiter(60), media);
app.get("/api/v1/health", async (_req, res) => {
  await db.$queryRaw`SELECT 1`;
  res.json({ ok: true });
});
app.get("/api/v1/settings", async (_req, res) => {
  const settings = await db.systemSettings.findUnique({ where: { id: 1 } });
  res.json({
    ...storeSettings(),
    ...(settings
      ? {
          companyName: settings.companyName,
          logoUrl: settings.logoUrl,
          pickupAddress: settings.address || storeSettings().pickupAddress,
          reservationHours: settings.paymentTimeoutHours,
          minimumStock: settings.minimumStock,
        }
      : {}),
  });
});
app.get("/api/v1/locations", async (req, res) => {
  const { level, parent } = locationQuery.parse(req.query);
  const select = { id: true, name: true } as const;
  const rows =
    level === "provinces"
      ? await db.province.findMany({ select, orderBy: { name: "asc" } })
      : level === "regencies"
        ? await db.regency.findMany({
            where: { provinceId: parent },
            select,
            orderBy: { name: "asc" },
          })
        : level === "districts"
          ? await db.district.findMany({
              where: { regencyId: parent },
              select,
              orderBy: { name: "asc" },
            })
          : await db.village.findMany({
              where: { districtId: parent },
              select,
              orderBy: { name: "asc" },
            });
  res.set("Cache-Control", "public, max-age=86400").json(rows);
});
app.get("/api/v1/catalog", async (_req, res) => {
  await expireOrders();
  res.json(await catalog());
});
app.get("/api/v1/auth/session", async (req, res) => {
  const current = await session(req);
  if (!current) {
    res.json({ user: null, csrfToken: null });
    return;
  }
  const { active: _active, ...user } = current.user;
  res.json({ user, csrfToken: current.csrfToken });
});
app.post("/api/v1/auth/register", limiter(10), async (req, res) => {
  const input = registration.parse(req.body);
  const passwordHash = await hashPassword(input.password);
  const user = await db.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: "PELANGGAN",
    },
    select: userSelect,
  });
  res
    .status(201)
    .json({
      user,
      csrfToken: await openSession(user.id, req, res, passwordHash),
    });
});
app.post("/api/v1/auth/login", limiter(20), async (req, res) => {
  const input = credentials.parse(req.body);
  const user = await db.user.findUnique({ where: { email: input.email } });
  // Spend the same scrypt work for unknown accounts to reduce timing-based enumeration.
  const valid = await verifyPassword(
    input.password,
    user?.passwordHash ?? `${"0".repeat(32)}:${"0".repeat(128)}`,
  );
  if (!user?.active || !valid)
    throw new HttpError(401, "Surel atau kata sandi salah.");
  await audit(
    user.id,
    "LOGIN",
    "User",
    user.id,
    null,
    { email: user.email },
    "Login berhasil",
    db,
    user.role,
  );
  const {
    passwordHash: _hash,
    active: _active,
    createdAt: _date,
    ...publicUser
  } = user;
  res.json({
    user: publicUser,
    csrfToken: await openSession(user.id, req, res, user.passwordHash),
  });
});
app.post("/api/v1/auth/logout", logout);
app.post("/api/v1/auth/password", limiter(10), async (req, res) => {
  const current = await session(req);
  if (!current) throw new HttpError(401, "Silakan masuk ke akun Anda.");
  if (req.get("x-csrf-token") !== current.csrfToken)
    throw new HttpError(403, "Sesi keamanan berubah. Muat ulang halaman.");
  await changePassword(
    current.userId,
    current.userId,
    current.tokenHash,
    req.body,
  );
  res.json({ ok: true });
});
app.use("/api/v1/customer", requireRole("PELANGGAN"));
app.post("/api/v1/customer/orders/:id/payment", limiter(30), async (req, res) =>
  res
    .status(201)
    .json(
      await submitPayment(
        z.string().uuid().parse(req.params.id),
        res.locals.userId,
        req.body,
      ),
    ),
);
app.get("/api/v1/customer/cart", async (_req, res) =>
  res.json(await cart(res.locals.userId)),
);
app.post("/api/v1/customer/cart", async (req, res) => {
  const input = z
    .object({
      productId: productIdSchema,
      quantity: quantitySchema,
      mode: z.enum(["add", "set"]),
    })
    .strict()
    .parse(req.body);
  res.json(
    await changeCart(
      res.locals.userId,
      input.productId,
      input.quantity,
      input.mode,
    ),
  );
});
app.delete("/api/v1/customer/cart/:id", async (req, res) =>
  res.json(
    await removeCart(res.locals.userId, productIdSchema.parse(req.params.id)),
  ),
);
app.get("/api/v1/customer/orders", async (_req, res) => {
  await expireOrders();
  res.json(await orders(res.locals.userId));
});
app.post("/api/v1/customer/checkout", limiter(30), async (req, res) => {
  await expireOrders();
  res
    .status(201)
    .json(await checkout(res.locals.userId, checkoutSchema.parse(req.body)));
});
app.post("/api/v1/customer/orders/:id/cancel", async (req, res) => {
  const { reason } = z
    .object({ reason: z.string().trim().min(5).max(500) })
    .parse(req.body);
  res.json(
    await transitionOrder(
      z.string().uuid().parse(req.params.id),
      res.locals.userId,
      "CANCELLED",
      reason,
      true,
    ),
  );
});
app.patch("/api/v1/customer/profile", async (req, res) => {
  res.json(await updateProfile(res.locals.userId, req.body));
});
app.use("/api/v1/petugas", requireRole("PETUGAS"));
app.post("/api/v1/petugas/batches/:id/readiness", async (req, res) =>
  res
    .status(201)
    .json(
      await requestReadiness(
        productIdSchema.parse(req.params.id),
        res.locals.userId,
        req.body,
      ),
    ),
);
app.get("/api/v1/petugas/approvals", async (_req, res) =>
  res.json(
    await db.readinessApproval.findMany({
      where: { requestedBy: res.locals.userId },
      orderBy: { createdAt: "desc" },
    }),
  ),
);
app.get("/api/v1/petugas/nursery", async (_req, res) =>
  res.json(await nursery(res.locals.userId)),
);
app.post("/api/v1/petugas/batches/:id/observations", async (req, res) =>
  res
    .status(201)
    .json(
      await observe(
        productIdSchema.parse(req.params.id),
        res.locals.userId,
        req.body,
      ),
    ),
);
app.use("/api/v1/admin", requireRole("ADMIN"));
app.post("/api/v1/admin/users/:id/password", limiter(10), async (req, res) => {
  await changePassword(
    res.locals.userId,
    z.string().uuid().parse(req.params.id),
    res.locals.sessionHash,
    req.body,
  );
  res.json({ ok: true });
});
app.use("/api/v1/admin", management, insights);
app.get("/api/v1/admin/payments", async (_req, res) =>
  res.json(await allPayments()),
);
app.post("/api/v1/admin/payments/:id/review", async (req, res) =>
  res.json(
    await reviewPayment(
      z.string().uuid().parse(req.params.id),
      res.locals.userId,
      req.body,
    ),
  ),
);
app.get("/api/v1/admin/staff", async (_req, res) =>
  res.json(
    await db.user.findMany({
      where: { role: "PETUGAS" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        active: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    }),
  ),
);
app.post("/api/v1/admin/staff", limiter(30), async (req, res) => {
  const input = registration
    .extend({
      phone: z
        .string()
        .max(20)
        .regex(/^(?:|\+?\d{8,15})$/)
        .default(""),
    })
    .parse(req.body);
  const user = await transaction(async (tx) => {
    const row = await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: await hashPassword(input.password),
        role: "PETUGAS",
        phone: input.phone,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        active: true,
        createdAt: true,
      },
    });
    await audit(
      res.locals.userId,
      "CREATE_USER",
      "User",
      row.id,
      null,
      row,
      "Membuat akun petugas",
      tx,
    );
    return row;
  });
  res.status(201).json(user);
});
app.get("/api/v1/admin/nursery", async (_req, res) =>
  res.json({
    ...(await nursery()),
    staff: await db.user.findMany({
      where: { role: "PETUGAS", active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  }),
);
app.patch("/api/v1/admin/batches/:id/assignment", async (req, res) =>
  res.json(
    await assign(
      productIdSchema.parse(req.params.id),
      req.body,
      res.locals.userId,
    ),
  ),
);
app.get("/api/v1/admin/orders", async (_req, res) => {
  await expireOrders();
  res.json(await orders());
});
app.post("/api/v1/admin/orders/:id/status", async (req, res) => {
  const input = z
    .object({
      status: z.enum([
        "CONFIRMED",
        "READY_TO_SHIP",
        "PROCESSING",
        "READY_FOR_PICKUP",
        "SHIPPED",
        "COMPLETED",
        "CANCELLED",
      ]),
      reason: z.string().trim().min(5).max(500),
      trackingNumber: z.string().trim().max(100).optional(),
    })
    .strict()
    .parse(req.body);
  res.json(
    await transitionOrder(
      z.string().uuid().parse(req.params.id),
      res.locals.userId,
      input.status,
      input.reason,
      false,
      input.trackingNumber,
    ),
  );
});
app.use((_req, res) =>
  res.status(404).json({ error: "Endpoint tidak ditemukan." }),
);
app.use(errorHandler);
