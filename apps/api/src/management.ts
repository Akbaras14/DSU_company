import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db, transaction } from "./db.js";
import { HttpError } from "./http.js";
import { audit } from "./audit.js";
import { productIdSchema } from "./catalog.js";

export const management = Router();
const text = (max: number) => z.string().trim().max(max);
const count = z.number().int().nonnegative().max(1000000);
const money = z.number().int().nonnegative().max(2147483647);
management.delete("/:entity/:id", async (req, res, next) => {
  const entity = req.params.entity;
  if (
    ![
      "products",
      "categories",
      "nursery-locations",
      "batches",
      "users",
    ].includes(entity)
  )
    return next();
  const id = (
    entity === "users" || entity === "categories"
      ? z.string().uuid()
      : productIdSchema
  ).parse(req.params.id);
  await transaction(async (tx) => {
    let before: unknown;
    let model: string;
    const used = () =>
      new HttpError(
        409,
        "Data masih digunakan atau memiliki histori operasional. Nonaktifkan atau arsipkan data sebagai gantinya.",
      );
    switch (entity) {
      case "products": {
        const row = await tx.product.findUniqueOrThrow({ where: { id } });
        if (
          (await tx.batch.count({ where: { productId: id } })) ||
          (await tx.orderItem.count({ where: { productId: id } })) ||
          (await tx.cartItem.count({ where: { productId: id } }))
        )
          throw used();
        before = row;
        model = "Product";
        await tx.product.delete({ where: { id } });
        break;
      }
      case "categories": {
        const row = await tx.category.findUniqueOrThrow({ where: { id } });
        if (await tx.product.count({ where: { category: row.name } }))
          throw used();
        before = row;
        model = "Category";
        await tx.category.delete({ where: { id } });
        break;
      }
      case "nursery-locations": {
        const row = await tx.nurseryLocation.findUniqueOrThrow({
          where: { id },
        });
        if (await tx.batch.count({ where: { location: row.name } }))
          throw used();
        before = row;
        model = "NurseryLocation";
        await tx.nurseryLocation.delete({ where: { id } });
        break;
      }
      case "batches": {
        const row = await tx.batch.findUniqueOrThrow({ where: { id } });
        if (
          !["DRAFT", "MONITORING"].includes(row.status) ||
          row.approved ||
          row.reserved ||
          row.sold ||
          row.damaged ||
          row.dead ||
          row.publishedStock ||
          (await tx.observation.count({ where: { batchId: id } })) ||
          (await tx.readinessApproval.count({ where: { batchId: id } })) ||
          (await tx.reservation.count({ where: { batchId: id } })) ||
          (await tx.inventoryTransaction.count({
            where: { batchId: id, kind: { not: "INITIAL_STOCK" } },
          }))
        )
          throw used();
        before = row;
        model = "Batch";
        await tx.inventoryTransaction.deleteMany({
          where: { batchId: id, kind: "INITIAL_STOCK" },
        });
        await tx.batch.delete({ where: { id } });
        break;
      }
      default: {
        const row = await tx.user.findUniqueOrThrow({
          where: { id },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            active: true,
          },
        });
        if (row.role === "ADMIN" || id === res.locals.userId)
          throw new HttpError(
            403,
            "Akun admin tidak dapat dihapus melalui halaman ini.",
          );
        if (
          (await tx.order.count({ where: { userId: id } })) ||
          (await tx.batch.count({ where: { assignedTo: id } })) ||
          (await tx.observation.count({ where: { observedBy: id } })) ||
          (await tx.readinessApproval.count({
            where: { OR: [{ requestedBy: id }, { reviewedBy: id }] },
          })) ||
          (await tx.payment.count({ where: { verifiedBy: id } })) ||
          (await tx.orderEvent.count({ where: { actorId: id } })) ||
          (await tx.inventoryTransaction.count({ where: { actorId: id } })) ||
          (await tx.auditLog.count({ where: { actorId: id } }))
        )
          throw used();
        before = row;
        model = "User";
        await tx.notificationRead.deleteMany({ where: { userId: id } });
        await tx.user.delete({ where: { id } });
      }
    }
    await audit(
      res.locals.userId,
      "DELETE_ENTITY",
      model,
      id,
      before,
      null,
      "Menghapus data yang tidak memiliki dependensi atau histori operasional",
      tx,
    );
  });
  res.json({ success: true });
});
management.patch("/orders/:id/shipping", async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const input = z
    .object({ shippingCost: money, reason: text(500).min(5) })
    .strict()
    .parse(req.body);
  res.json(
    await transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM \`Order\` WHERE id = ${id} FOR UPDATE`;
      const before = await tx.order.findUniqueOrThrow({
        where: { id },
        include: { payment: true },
      });
      if (
        before.fulfillmentMethod !== "DELIVERY" ||
        ![
          "PENDING_PAYMENT",
          "PAYMENT_REJECTED",
          "PENDING_CONFIRMATION",
        ].includes(before.status)
      )
        throw new HttpError(
          409,
          "Ongkir hanya dapat diubah sebelum pembayaran diajukan.",
        );
      if (before.total + input.shippingCost > 2147483647)
        throw new HttpError(400, "Total tagihan terlalu besar.");
      const row = await tx.order.update({
        where: { id },
        data: { shippingCost: input.shippingCost },
      });
      await audit(
        res.locals.userId,
        "UPDATE_SHIPPING_COST",
        "Order",
        id,
        { shippingCost: before.shippingCost },
        { shippingCost: row.shippingCost },
        input.reason,
        tx,
      );
      return row;
    }),
  );
});
const photo = z
  .string()
  .regex(
    /^\/(?:images\/[a-zA-Z0-9/_-]+\.(?:jpg|jpeg|png|webp)|api\/v1\/media\/[a-f0-9-]+\.(?:jpg|png|webp))$/,
  )
  .nullable();
const productInput = z
  .object({
    id: productIdSchema,
    name: text(150).min(2),
    category: text(100).min(2),
    variety: text(100),
    description: text(10000),
    unit: text(30).min(1),
    imageUrl: photo,
    minimumStock: count,
    active: z.boolean(),
    parameters: z
      .array(z.object({ name: text(100).min(1), unit: text(30).min(1) }))
      .max(20),
  })
  .strict();
const categoryInput = z
  .object({ name: text(100).min(2), active: z.boolean() })
  .strict();
const locationInput = z
  .object({
    id: productIdSchema,
    name: text(150).min(2),
    description: text(1000),
    capacity: count,
    active: z.boolean(),
  })
  .strict();
const batchInput = z
  .object({
    id: productIdSchema,
    productId: productIdSchema,
    location: text(150).min(2),
    assignedTo: z.string().uuid().nullable(),
    enteredAt: z.iso.date(),
    plantedAt: z.iso.date().nullable(),
    physical: count,
    notes: text(1000),
    status: z.enum(["DRAFT", "MONITORING"]),
  })
  .strict();

management.get("/products", async (_req, res) =>
  res.json(
    await db.product.findMany({
      include: { batches: true },
      orderBy: { name: "asc" },
    }),
  ),
);
management.post("/products", async (req, res) => {
  const input = productInput.parse(req.body);
  const result = await transaction(async (tx) => {
    if (
      !(await tx.category.findFirst({
        where: { name: input.category, active: true },
      }))
    )
      throw new HttpError(400, "Pilih kategori aktif.");
    const settings = await tx.systemSettings.findUnique({ where: { id: 1 } });
    const row = await tx.product.create({
      data: {
        ...input,
        price: 0,
        minimumStock: input.minimumStock ?? settings?.minimumStock ?? 5,
      },
    });
    await audit(
      res.locals.userId,
      "CREATE_PLANT",
      "Product",
      row.id,
      null,
      row,
      "Menambah master tanaman",
      tx,
    );
    return row;
  });
  res.status(201).json(result);
});
management.patch("/products/:id", async (req, res) => {
  const input = productInput.omit({ id: true }).parse(req.body);
  res.json(
    await transaction(async (tx) => {
      const id = productIdSchema.parse(req.params.id),
        before = await tx.product.findUniqueOrThrow({ where: { id } });
      if (
        !(await tx.category.findFirst({
          where: { name: input.category, active: true },
        }))
      )
        throw new HttpError(400, "Pilih kategori aktif.");
      const row = await tx.product.update({
        where: { id },
        data: {
          ...input,
          ...(!input.active
            ? { published: false, catalogStatus: "UNPUBLISHED" as const }
            : {}),
        },
      });
      await audit(
        res.locals.userId,
        "UPDATE_PLANT",
        "Product",
        id,
        before,
        row,
        "Mengubah tanaman; histori tetap disimpan",
        tx,
      );
      return row;
    }),
  );
});
management.get("/categories", async (_req, res) => {
  const [rows, products] = await Promise.all([
    db.category.findMany({ orderBy: { name: "asc" } }),
    db.product.groupBy({ by: ["category"], _count: true }),
  ]);
  res.json(
    rows.map((row) => ({
      ...row,
      plantCount:
        products.find((product) => product.category === row.name)?._count ?? 0,
    })),
  );
});
management.post("/categories", async (req, res) => {
  res.status(201).json(
    await transaction(async (tx) => {
      const row = await tx.category.create({
        data: categoryInput.parse(req.body),
      });
      await audit(
        res.locals.userId,
        "CREATE_CATEGORY",
        "Category",
        row.id,
        null,
        row,
        "Menambah kategori",
        tx,
      );
      return row;
    }),
  );
});
management.patch("/categories/:id", async (req, res) => {
  const input = categoryInput.parse(req.body),
    id = z.string().uuid().parse(req.params.id);
  res.json(
    await transaction(async (tx) => {
      const before = await tx.category.findUniqueOrThrow({ where: { id } });
      const row = await tx.category.update({ where: { id }, data: input });
      await tx.product.updateMany({
        where: { category: before.name },
        data: {
          category: row.name,
          ...(!row.active
            ? { published: false, catalogStatus: "UNPUBLISHED" }
            : {}),
        },
      });
      await audit(
        res.locals.userId,
        "UPDATE_CATEGORY",
        "Category",
        id,
        before,
        row,
        "Mengubah kategori",
        tx,
      );
      return row;
    }),
  );
});
management.get("/nursery-locations", async (_req, res) =>
  res.json(await db.nurseryLocation.findMany({ orderBy: { name: "asc" } })),
);
management.post("/nursery-locations", async (req, res) =>
  res.status(201).json(
    await transaction(async (tx) => {
      const row = await tx.nurseryLocation.create({
        data: locationInput.parse(req.body),
      });
      await audit(
        res.locals.userId,
        "CREATE_LOCATION",
        "NurseryLocation",
        row.id,
        null,
        row,
        "Menambah lokasi pembibitan",
        tx,
      );
      return row;
    }),
  ),
);
management.patch("/nursery-locations/:id", async (req, res) => {
  const input = locationInput.omit({ id: true }).parse(req.body),
    id = productIdSchema.parse(req.params.id);
  res.json(
    await transaction(async (tx) => {
      const before = await tx.nurseryLocation.findUniqueOrThrow({
        where: { id },
      });
      const occupancy = await tx.batch.aggregate({
        where: { location: before.name, status: { not: "ARCHIVED" } },
        _sum: { physical: true },
      });
      if (input.capacity && (occupancy._sum.physical ?? 0) > input.capacity)
        throw new HttpError(
          409,
          "Kapasitas lebih kecil dari jumlah tanaman di lokasi.",
        );
      const row = await tx.nurseryLocation.update({
        where: { id },
        data: input,
      });
      await tx.batch.updateMany({
        where: { location: before.name },
        data: { location: row.name },
      });
      await audit(
        res.locals.userId,
        "UPDATE_LOCATION",
        "NurseryLocation",
        id,
        before,
        row,
        "Mengubah lokasi pembibitan",
        tx,
      );
      return row;
    }),
  );
});
management.get("/batches", async (_req, res) =>
  res.json(
    await db.batch.findMany({
      include: {
        product: true,
        assignee: { select: { id: true, name: true } },
        observations: { orderBy: { observedAt: "desc" } },
        transactions: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { enteredAt: "desc" },
    }),
  ),
);
management.post("/batches", async (req, res) => {
  const input = batchInput.parse(req.body);
  res.status(201).json(
    await transaction(async (tx) => {
      const plant = await tx.product.findUnique({
        where: { id: input.productId },
      });
      if (!plant?.active) throw new HttpError(400, "Pilih tanaman aktif.");
      const location = await tx.nurseryLocation.findFirst({
        where: { name: input.location, active: true },
      });
      if (!location) throw new HttpError(400, "Pilih lokasi pembibitan aktif.");
      const occupancy = await tx.batch.aggregate({
        where: { location: location.name, status: { not: "ARCHIVED" } },
        _sum: { physical: true },
      });
      if (
        location.capacity &&
        (occupancy._sum.physical ?? 0) + input.physical > location.capacity
      )
        throw new HttpError(409, "Kapasitas lokasi tidak mencukupi.");
      if (
        input.assignedTo &&
        !(await tx.user.findFirst({
          where: { id: input.assignedTo, role: "PETUGAS", active: true },
        }))
      )
        throw new HttpError(400, "Pilih petugas aktif.");
      const row = await tx.batch.create({
        data: {
          ...input,
          enteredAt: new Date(input.enteredAt),
          plantedAt: input.plantedAt ? new Date(input.plantedAt) : null,
          initialQuantity: input.physical,
          transactions: {
            create: {
              reference: `INITIAL:${input.id}`,
              actorId: res.locals.userId,
              kind: "INITIAL_STOCK",
              quantity: input.physical,
              beforeQuantity: 0,
              afterQuantity: input.physical,
              reason: "Penerimaan awal kelompok",
            },
          },
        },
      });
      await audit(
        res.locals.userId,
        "CREATE_BATCH",
        "Batch",
        row.id,
        null,
        row,
        "Penerimaan awal dan penugasan kelompok",
        tx,
      );
      return row;
    }),
  );
});
management.patch("/batches/:id", async (req, res) => {
  const id = productIdSchema.parse(req.params.id);
  const input = batchInput
    .omit({ id: true, productId: true, physical: true, status: true })
    .extend({ status: z.enum(["DRAFT", "MONITORING", "ARCHIVED"]).optional() })
    .parse(req.body);
  res.json(
    await transaction(async (tx) => {
      const before = await tx.batch.findUniqueOrThrow({ where: { id } });
      if (input.status === "ARCHIVED" && before.reserved)
        throw new HttpError(
          409,
          "Kelompok dengan reservasi aktif tidak dapat diarsipkan.",
        );
      if (input.status && input.status !== "ARCHIVED" && before.approved)
        throw new HttpError(
          409,
          "Kelompok siap jual harus melalui alur approval untuk perubahan kesiapan.",
        );
      if (
        input.assignedTo &&
        !(await tx.user.findFirst({
          where: { id: input.assignedTo, role: "PETUGAS", active: true },
        }))
      )
        throw new HttpError(400, "Pilih petugas aktif.");
      const location = await tx.nurseryLocation.findFirst({
        where: { name: input.location, active: true },
      });
      if (!location) throw new HttpError(400, "Pilih lokasi aktif.");
      const occupancy = await tx.batch.aggregate({
        where: {
          location: input.location,
          id: { not: id },
          status: { not: "ARCHIVED" },
        },
        _sum: { physical: true },
      });
      if (
        location.capacity &&
        (occupancy._sum.physical ?? 0) + before.physical > location.capacity
      )
        throw new HttpError(409, "Kapasitas lokasi tidak mencukupi.");
      const row = await tx.batch.update({
        where: { id },
        data: {
          ...input,
          enteredAt: new Date(input.enteredAt),
          plantedAt: input.plantedAt ? new Date(input.plantedAt) : null,
        },
      });
      await audit(
        res.locals.userId,
        "UPDATE_BATCH",
        "Batch",
        id,
        before,
        row,
        "Mengubah penugasan, lokasi atau status kelompok",
        tx,
      );
      return row;
    }),
  );
});
management.post("/batches/:id/inventory", async (req, res) => {
  const id = productIdSchema.parse(req.params.id);
  const input = z
    .object({
      kind: z.enum(["STOCK_IN", "ADJUSTMENT", "DAMAGED", "DEAD", "RETURN"]),
      quantity: count,
      reason: text(1000).min(5),
    })
    .strict()
    .parse(req.body);
  res.json(
    await transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM Batch WHERE id = ${id} FOR UPDATE`;
      const before = await tx.batch.findUniqueOrThrow({ where: { id } });
      if (before.status === "ARCHIVED")
        throw new HttpError(
          409,
          "Kelompok diarsipkan tidak dapat diubah stoknya.",
        );
      const after =
        input.kind === "ADJUSTMENT"
          ? input.quantity
          : before.physical +
            (["STOCK_IN", "RETURN"].includes(input.kind)
              ? input.quantity
              : -input.quantity);
      if (after < before.reserved || after > 1000000)
        throw new HttpError(
          409,
          "Koreksi stok tidak boleh negatif atau mengurangi reservasi aktif.",
        );
      if (input.kind === "RETURN" && input.quantity > before.sold)
        throw new HttpError(409, "Jumlah retur melebihi tanaman terjual.");
      const approved = Math.min(before.approved, after);
      const row = await tx.batch.update({
        where: { id },
        data: {
          physical: after,
          approved,
          ...(before.publishedStock !== null
            ? {
                publishedStock: Math.min(
                  before.publishedStock,
                  approved - before.reserved,
                ),
              }
            : {}),
          ...(input.kind === "DAMAGED"
            ? { damaged: { increment: input.quantity } }
            : {}),
          ...(input.kind === "DEAD"
            ? { dead: { increment: input.quantity } }
            : {}),
          ...(input.kind === "RETURN"
            ? { sold: { decrement: input.quantity } }
            : {}),
        },
      });
      await tx.inventoryTransaction.create({
        data: {
          reference: randomUUID(),
          batchId: id,
          actorId: res.locals.userId,
          kind: input.kind,
          quantity: after - before.physical,
          beforeQuantity: before.physical,
          afterQuantity: after,
          reason: input.reason,
        },
      });
      await audit(
        res.locals.userId,
        "STOCK_ADJUSTMENT",
        "Batch",
        id,
        before,
        row,
        input.reason,
        tx,
      );
      return row;
    }),
  );
});
management.get("/movements", async (_req, res) =>
  res.json(
    await db.inventoryTransaction.findMany({ orderBy: { createdAt: "desc" } }),
  ),
);
management.get("/monitoring", async (_req, res) =>
  res.json(
    await db.observation.findMany({
      include: {
        batch: { include: { product: true } },
        observer: { select: { id: true, name: true } },
      },
      orderBy: { observedAt: "desc" },
    }),
  ),
);
management.get("/approvals", async (_req, res) =>
  res.json(
    await db.readinessApproval.findMany({
      include: {
        batch: {
          include: {
            product: true,
            assignee: { select: { name: true } },
            observations: { orderBy: { observedAt: "asc" } },
          },
        },
        observation: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ),
);
management.post("/approvals/:id/review", async (req, res) => {
  const id = z.string().uuid().parse(req.params.id),
    input = z
      .object({
        status: z.enum(["APPROVED", "REJECTED"]),
        reason: text(1000).min(5),
      })
      .strict()
      .parse(req.body);
  res.json(
    await transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM ReadinessApproval WHERE id = ${id} FOR UPDATE`;
      const before = await tx.readinessApproval.findUniqueOrThrow({
        where: { id },
        include: { batch: true },
      });
      if (before.status !== "PENDING")
        throw new HttpError(409, "Pengajuan sudah ditinjau.");
      if (
        input.status === "APPROVED" &&
        (before.batch.status === "ARCHIVED" ||
          before.quantity > before.batch.physical - before.batch.approved)
      )
        throw new HttpError(
          409,
          "Stok kelompok berubah; pengajuan perlu direkonsiliasi.",
        );
      const row = await tx.readinessApproval.update({
        where: { id },
        data: {
          ...input,
          reviewedBy: res.locals.userId,
          reviewedAt: new Date(),
        },
      });
      await tx.batch.update({
        where: { id: before.batchId },
        data: {
          status:
            before.batch.status === "ARCHIVED"
              ? "ARCHIVED"
              : input.status === "APPROVED"
                ? "READY_FOR_SALE"
                : before.batch.approved > 0
                  ? "READY_FOR_SALE"
                  : "MONITORING",
          ...(input.status === "APPROVED"
            ? { approved: { increment: before.quantity } }
            : {}),
        },
      });
      await audit(
        res.locals.userId,
        input.status === "APPROVED" ? "APPROVE_READINESS" : "REJECT_READINESS",
        "ReadinessApproval",
        id,
        before,
        row,
        input.reason,
        tx,
      );
      return row;
    }),
  );
});
management.patch("/products/:id/catalog", async (req, res) => {
  const id = productIdSchema.parse(req.params.id);
  const input = z
    .object({
      price: money,
      discountPrice: money.nullable(),
      description: text(10000),
      imageUrl: photo,
      featured: z.boolean(),
      published: z.boolean(),
      batches: z
        .array(z.object({ id: productIdSchema, publishedStock: count }))
        .max(500),
    })
    .strict()
    .parse(req.body);
  res.json(
    await transaction(async (tx) => {
      const before = await tx.product.findUniqueOrThrow({
        where: { id },
        include: { batches: true },
      });
      if (input.discountPrice !== null && input.discountPrice > input.price)
        throw new HttpError(
          422,
          "Harga diskon tidak boleh melebihi harga awal.",
        );
      if (
        input.published &&
        (!before.active ||
          !(await tx.category.findFirst({
            where: { name: before.category, active: true },
          })))
      )
        throw new HttpError(
          409,
          "Tanaman dan kategori harus aktif sebelum publikasi.",
        );
      if (new Set(input.batches.map((b) => b.id)).size !== input.batches.length)
        throw new HttpError(422, "Kelompok tidak boleh duplikat.");
      let published = 0;
      for (const batch of before.batches) {
        const quantity =
          input.batches.find((entry) => entry.id === batch.id)
            ?.publishedStock ?? 0;
        if (
          quantity > batch.approved - batch.reserved ||
          (quantity &&
            !["READY_FOR_SALE", "PARTIALLY_SOLD"].includes(batch.status))
        )
          throw new HttpError(
            409,
            "Stok publik harus berasal dari kelompok siap jual dan tidak melebihi stok tersedia.",
          );
        await tx.batch.update({
          where: { id: batch.id },
          data: { publishedStock: quantity },
        });
        published += quantity;
      }
      if (
        input.batches.some(
          (entry) => !before.batches.some((b) => b.id === entry.id),
        )
      )
        throw new HttpError(422, "Kelompok bukan milik tanaman ini.");
      if (input.published && !published)
        throw new HttpError(
          409,
          "Pilih minimal satu kelompok siap jual dengan stok publik.",
        );
      const { batches: _batches, ...fields } = input;
      const row = await tx.product.update({
        where: { id },
        data: {
          ...fields,
          catalogStatus: input.published ? "PUBLISHED" : "UNPUBLISHED",
          publishedAt: input.published ? new Date() : before.publishedAt,
        },
      });
      await audit(
        res.locals.userId,
        input.published ? "PUBLISH_CATALOG" : "UNPUBLISH_CATALOG",
        "Product",
        id,
        before,
        row,
        "Mengubah harga dan publikasi katalog",
        tx,
      );
      return row;
    }),
  );
});
management.get("/customers", async (_req, res) =>
  res.json(
    await db.user.findMany({
      where: { role: "PELANGGAN" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        active: true,
        createdAt: true,
        orders: {
          include: { items: true, payment: true },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { name: "asc" },
    }),
  ),
);
management.patch("/users/:id", async (req, res) => {
  const id = z.string().uuid().parse(req.params.id),
    input = z
      .object({
        name: text(100).min(2),
        email: z
          .email()
          .max(191)
          .transform((v) => v.toLowerCase()),
        phone: text(20).regex(/^(?:|\+?\d{8,15})$/),
        active: z.boolean(),
      })
      .strict()
      .parse(req.body);
  const select = {
    id: true,
    name: true,
    email: true,
    phone: true,
    active: true,
    role: true,
  } as const;
  res.json(
    await transaction(async (tx) => {
      const before = await tx.user.findUniqueOrThrow({ where: { id }, select });
      if (before.role === "ADMIN")
        throw new HttpError(
          403,
          "Halaman ini hanya mengelola petugas dan pelanggan.",
        );
      const row = await tx.user.update({ where: { id }, data: input, select });
      if (!row.active) await tx.session.deleteMany({ where: { userId: id } });
      await audit(
        res.locals.userId,
        "UPDATE_USER",
        "User",
        id,
        before,
        row,
        "Mengubah profil atau status akun",
        tx,
      );
      return row;
    }),
  );
});
management.get("/audit", async (_req, res) =>
  res.json(await db.auditLog.findMany({ orderBy: { createdAt: "desc" } })),
);
export const settingsInput = z
  .object({
    companyName: text(150).min(2),
    logoUrl: z
      .string()
      .regex(/^\/(?:images\/|api\/v1\/media\/)[a-zA-Z0-9/_.-]+$/),
    address: text(500),
    phone: text(30),
    email: z.union([z.email().max(191), z.literal("")]),
    minimumStock: count,
    paymentTimeoutHours: z.number().int().min(1).max(168),
    monitoringIntervalDays: z.number().int().min(1).max(365),
    allowCustomerCancellation: z.boolean(),
  })
  .strict();
management.get("/settings", async (_req, res) =>
  res.json(await db.systemSettings.findUniqueOrThrow({ where: { id: 1 } })),
);
management.patch("/settings", async (req, res) =>
  res.json(
    await transaction(async (tx) => {
      const input = settingsInput.parse(req.body),
        before = await tx.systemSettings.findUniqueOrThrow({
          where: { id: 1 },
        }),
        row = await tx.systemSettings.update({ where: { id: 1 }, data: input });
      await audit(
        res.locals.userId,
        "UPDATE_SETTINGS",
        "SystemSettings",
        "1",
        before,
        row,
        "Mengubah pengaturan operasional",
        tx,
      );
      return row;
    }),
  ),
);
