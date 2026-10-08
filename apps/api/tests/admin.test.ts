import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { unlink } from "node:fs/promises";
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || "mysql://root@127.0.0.1:3306/db_dsu_test";
process.env.NODE_ENV = "test";
process.env.WEB_ORIGIN = "http://localhost:3001";
if (!new URL(process.env.DATABASE_URL).pathname.endsWith("_test"))
  throw new Error("Pengujian wajib memakai database _test.");
const { app } = await import("../src/app.js"),
  { db } = await import("../src/db.js"),
  { hashPassword } = await import("../src/auth.js");

test("Admin specification: nursery → monitoring → approval → catalog → payment → fulfillment, immutable audit and RBAC", async () => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`,
    suffix = randomUUID().slice(0, 8),
    productId = `admin-plant-${suffix}`,
    batchId = `admin-batch-${suffix}`,
    locationId = `admin-loc-${suffix}`,
    category = `Admin kategori ${suffix}`;
  const users: string[] = [],
    uploads: string[] = [];
  let categoryId = "";
  type Client = { id: string; cookie: string; csrf: string };
  const guest: Client = { id: "", cookie: "", csrf: "" },
    password = "Admin-end-to-end-2026!";
  async function call(
    client: Client,
    path: string,
    body?: unknown,
    method = body === undefined ? "GET" : "POST",
    csrf = client.csrf,
  ) {
    const res = await fetch(base + path, {
      method,
      headers: {
        Cookie: client.cookie,
        Origin: process.env.WEB_ORIGIN!,
        "X-DSU-Client": "web",
        "X-CSRF-Token": csrf,
        "Content-Type": "application/json",
      },
      ...(method === "GET" ? {} : { body: JSON.stringify(body ?? {}) }),
    });
    return {
      status: res.status,
      data: res.headers.get("content-type")?.includes("application/json")
        ? await res.json()
        : await res.text(),
    };
  }
  async function login(email: string): Promise<Client> {
    const res = await fetch(base + "/auth/login", {
      method: "POST",
      headers: {
        Origin: process.env.WEB_ORIGIN!,
        "X-DSU-Client": "web",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    return {
      id: data.user.id,
      cookie: res.headers.get("set-cookie")!.split(";")[0],
      csrf: data.csrfToken,
    };
  }
  try {
    const adminRow = await db.user.create({
      data: {
        name: "Admin pengujian",
        email: `admin-${suffix}@admin.example.test`,
        role: "ADMIN",
        passwordHash: await hashPassword(password),
      },
    });
    users.push(adminRow.id);
    const admin = await login(adminRow.email);
    const staffResult = await call(admin, "/admin/staff", {
      name: "Petugas pengujian",
      email: `staff-${suffix}@admin.example.test`,
      password,
      phone: "081234567890",
    });
    assert.equal(staffResult.status, 201);
    users.push(staffResult.data.id);
    const staff = await login(staffResult.data.email);
    const customerRow = await db.user.create({
      data: {
        name: "Pelanggan pengujian",
        email: `customer-${suffix}@admin.example.test`,
        passwordHash: await hashPassword(password),
      },
    });
    users.push(customerRow.id);
    const customer = await login(customerRow.email);
    assert.equal((await call(staff, "/admin/products")).status, 403);
    assert.equal((await call(guest, "/admin/audit")).status, 401);
    const protectedRoutes = [
      "products",
      "categories",
      "nursery-locations",
      "batches",
      "monitoring",
      "movements",
      "approvals",
      "catalog",
      "payments",
      "orders",
      "staff",
      "customers",
      "nursery",
      "dashboard",
      "reports",
      "audit",
      "settings",
      "notifications",
    ];
    for (const route of protectedRoutes) {
      for (const client of [staff, customer])
        assert.equal(
          (await call(client, `/admin/${route}`)).status,
          403,
          route,
        );
      assert.equal((await call(guest, `/admin/${route}`)).status, 401, route);
    }
    assert.equal(
      (await call(admin, "/admin/settings", {}, "PATCH", "invalid")).status,
      403,
    );
    assert.equal((await call(customer, "/petugas/nursery")).status, 403);
    assert.equal((await call(staff, "/customer/orders")).status, 403);
    const adminSession = await db.session.findFirstOrThrow({
      where: { userId: admin.id },
    });
    assert.ok(adminSession.expiresAt.getTime() - Date.now() <= 8 * 3600000);
    assert.ok(adminSession.expiresAt.getTime() - Date.now() > 7 * 3600000);
    assert.equal(
      (
        await call(
          admin,
          `/admin/users/${staff.id}`,
          {
            name: "Petugas pengujian",
            email: staffResult.data.email,
            phone: "",
            active: true,
            role: "ADMIN",
          },
          "PATCH",
        )
      ).status,
      422,
    );
    assert.equal(
      (await db.user.findUniqueOrThrow({ where: { id: staff.id } })).role,
      "PETUGAS",
    );
    const createdCategory = await call(admin, "/admin/categories", {
      name: category,
      active: true,
    });
    assert.equal(createdCategory.status, 201);
    categoryId = createdCategory.data.id;
    assert.equal(
      (
        await call(admin, "/admin/nursery-locations", {
          id: locationId,
          name: locationId,
          description: "Area pengujian",
          capacity: 100,
          active: true,
        })
      ).status,
      201,
    );
    assert.equal(
      (
        await call(admin, "/admin/products", {
          id: productId,
          name: "Monstera uji admin",
          category,
          variety: "Deliciosa",
          description: "Tanaman pengujian",
          unit: "tanaman",
          imageUrl: null,
          minimumStock: 5,
          active: true,
          parameters: [
            { name: "Tinggi", unit: "cm" },
            { name: "Jumlah daun", unit: "daun" },
          ],
        })
      ).status,
      201,
    );
    assert.equal(
      (
        await call(admin, "/admin/batches", {
          id: batchId,
          productId,
          location: locationId,
          assignedTo: staff.id,
          enteredAt: "2026-10-05",
          plantedAt: null,
          physical: 12,
          notes: "Penerimaan pengujian",
          status: "MONITORING",
        })
      ).status,
      201,
    );
    // Deletion keeps dependent records and rejects non-admin mutations.
    for (const path of [
      `/admin/products/${productId}`,
      `/admin/categories/${categoryId}`,
      `/admin/nursery-locations/${locationId}`,
      `/admin/users/${staff.id}`,
    ]) {
      assert.equal((await call(admin, path, {}, "DELETE")).status, 409);
    }
    assert.equal(
      (await call(staff, `/admin/products/${productId}`, {}, "DELETE")).status,
      403,
    );
    assert.equal(
      (await call(guest, `/admin/products/${productId}`, {}, "DELETE")).status,
      401,
    );
    assert.equal(
      (await call(admin, `/admin/users/${admin.id}`, {}, "DELETE")).status,
      403,
    );
    assert.equal(
      (
        await call(
          admin,
          `/admin/products/${productId}`,
          {},
          "DELETE",
          "invalid",
        )
      ).status,
      403,
    );
    assert.equal(
      (await call(admin, "/admin/users/invalid", {}, "DELETE")).status,
      422,
    );
    const unusedProduct = await db.product.create({
      data: {
        id: `delete-${suffix}`,
        name: "Tanaman sementara",
        category,
        description: "",
        price: 0,
      },
    });
    const unusedCategory = await db.category.create({
      data: { name: `delete-${suffix}` },
    });
    const unusedLocation = await db.nurseryLocation.create({
      data: { id: `delete-${suffix}`, name: `delete-${suffix}` },
    });
    const unusedUser = await db.user.create({
      data: {
        name: "Pelanggan sementara",
        email: `delete-${suffix}@example.test`,
        passwordHash: "unused",
      },
    });
    users.push(unusedUser.id);
    const unusedBatchId = `delete-${suffix}`;
    assert.equal(
      (
        await call(admin, "/admin/batches", {
          id: unusedBatchId,
          productId: unusedProduct.id,
          location: unusedLocation.name,
          assignedTo: null,
          enteredAt: "2026-10-05",
          plantedAt: null,
          physical: 1,
          notes: "Salah input",
          status: "DRAFT",
        })
      ).status,
      201,
    );
    assert.equal(
      (await call(admin, `/admin/batches/${unusedBatchId}`, {}, "DELETE"))
        .status,
      200,
    );
    assert.equal(
      await db.inventoryTransaction.count({
        where: { batchId: unusedBatchId },
      }),
      0,
    );
    for (const path of [
      `/admin/products/${unusedProduct.id}`,
      `/admin/categories/${unusedCategory.id}`,
      `/admin/nursery-locations/${unusedLocation.id}`,
      `/admin/users/${unusedUser.id}`,
    ]) {
      assert.equal((await call(admin, path, {}, "DELETE")).status, 200);
      assert.equal((await call(admin, path, {}, "DELETE")).status, 404);
    }
    assert.equal(
      await db.auditLog.count({
        where: { actorId: admin.id, action: "DELETE_ENTITY" },
      }),
      5,
    );
    const listing = {
      price: 1000,
      discountPrice: null,
      description: "Produk pengujian",
      imageUrl: null,
      featured: false,
      published: true,
      batches: [{ id: batchId, publishedStock: 10 }],
    };
    assert.equal(
      (
        await call(
          admin,
          `/admin/products/${productId}/catalog`,
          listing,
          "PATCH",
        )
      ).status,
      409,
    );
    const observed = await call(
      staff,
      `/petugas/batches/${batchId}/observations`,
      {
        method: "Sampel acak",
        condition: "Sehat",
        notes: "Siap ditinjau",
        heights: [42, 44],
        leafCounts: [10, 12],
        health: "HEALTHY",
      },
    );
    assert.equal(observed.status, 201);
    assert.equal(
      (await call(admin, `/admin/batches/${batchId}`, {}, "DELETE")).status,
      409,
    );
    assert.equal(
      (await call(admin, `/petugas/batches/${batchId}/observations`, {}))
        .status,
      403,
    );
    const readiness = await call(
      staff,
      `/petugas/batches/${batchId}/readiness`,
      {
        observationId: observed.data.id,
        quantity: 12,
        reason: "Sampel sehat siap jual",
      },
    );
    assert.equal(readiness.status, 201);
    assert.equal(
      (
        await call(staff, `/admin/approvals/${readiness.data.id}/review`, {
          status: "APPROVED",
          reason: "Tanaman sehat",
        })
      ).status,
      403,
    );
    const reviews = await Promise.all([
      call(admin, `/admin/approvals/${readiness.data.id}/review`, {
        status: "APPROVED",
        reason: "Tanaman memenuhi hasil review",
      }),
      call(admin, `/admin/approvals/${readiness.data.id}/review`, {
        status: "APPROVED",
        reason: "Tanaman memenuhi hasil review",
      }),
    ]);
    assert.deepEqual(reviews.map((r) => r.status).sort(), [200, 409]);
    assert.equal(
      (await db.batch.findUniqueOrThrow({ where: { id: batchId } })).approved,
      12,
    );
    assert.equal(
      (
        await call(
          admin,
          `/admin/products/${productId}/catalog`,
          { ...listing, batches: [{ id: batchId, publishedStock: 13 }] },
          "PATCH",
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await call(
          admin,
          `/admin/products/${productId}/catalog`,
          listing,
          "PATCH",
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await call(customer, "/customer/cart", {
          productId,
          quantity: 3,
          mode: "set",
        })
      ).status,
      200,
    );
    const order = await call(customer, "/customer/checkout", {
      contact: {
        name: "Pelanggan uji",
        phone: "081234567890",
        address: "Alamat lengkap pengujian",
        postalCode: "12345",
      },
      fulfillmentMethod: "DELIVERY",
      key: randomUUID(),
      lines: [{ productId, quantity: 3, unitPrice: 1000 }],
    });
    assert.equal(order.status, 201);
    assert.equal(order.data.status, "PENDING_PAYMENT");
    assert.equal(
      (
        await call(
          admin,
          `/admin/orders/${order.data.id}/shipping`,
          { shippingCost: 5000, reason: "Tarif pengiriman disepakati" },
          "PATCH",
        )
      ).status,
      200,
    );
    const billedOrders = await call(customer, "/customer/orders");
    const billedOrder = billedOrders.data.find(
      (row: { id: string }) => row.id === order.data.id,
    );
    assert.equal(billedOrder.shippingCost, 5000);
    assert.match(decodeURIComponent(billedOrder.whatsappUrl), /8\.000/);
    assert.equal(
      (
        await call(
          customer,
          `/admin/orders/${order.data.id}/shipping`,
          { shippingCost: 0, reason: "Tarif tidak diizinkan" },
          "PATCH",
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await call(
          admin,
          `/admin/orders/${order.data.id}/shipping`,
          { shippingCost: 0, reason: "Pickup diganti tarif nol" },
          "PATCH",
        )
      ).status,
      200,
    );
    assert.equal(
      (await db.batch.findUniqueOrThrow({ where: { id: batchId } })).reserved,
      3,
    );
    assert.equal(
      (
        await call(admin, `/admin/orders/${order.data.id}/status`, {
          status: "PROCESSING",
          reason: "Belum membayar",
        })
      ).status,
      409,
    );
    const png =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j4KkAAAAASUVORK5CYII=";
    const upload = await call(customer, "/media", {
      purpose: "payment",
      data: png,
    });
    assert.equal(upload.status, 201);
    uploads.push(upload.data.url.split("/").pop());
    assert.equal(
      (await call(guest, upload.data.url.replace("/api/v1", ""))).status,
      403,
    );
    assert.equal(
      (await call(admin, upload.data.url.replace("/api/v1", ""))).status,
      200,
    );
    const paid = await call(
      customer,
      `/customer/orders/${order.data.id}/payment`,
      { amount: 3000, method: "Transfer", proofUrl: upload.data.url },
    );
    assert.equal(paid.status, 201);
    assert.equal(
      (
        await call(
          admin,
          `/admin/orders/${order.data.id}/shipping`,
          { shippingCost: 1000, reason: "Perubahan sesudah pembayaran" },
          "PATCH",
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await call(admin, `/admin/payments/${paid.data.id}/review`, {
          status: "REJECTED",
          reason: "Bukti belum terbaca",
        })
      ).status,
      200,
    );
    assert.equal(
      (await db.batch.findUniqueOrThrow({ where: { id: batchId } })).reserved,
      3,
    );
    assert.equal(
      (
        await call(customer, `/customer/orders/${order.data.id}/payment`, {
          amount: 3000,
          method: "Transfer",
          proofUrl: upload.data.url,
        })
      ).status,
      201,
    );
    const confirmations = await Promise.all([
      call(admin, `/admin/payments/${paid.data.id}/review`, {
        status: "VERIFIED",
        reason: "Dana diterima sesuai tagihan",
      }),
      call(admin, `/admin/payments/${paid.data.id}/review`, {
        status: "VERIFIED",
        reason: "Dana diterima sesuai tagihan",
      }),
    ]);
    assert.deepEqual(confirmations.map((r) => r.status).sort(), [200, 409]);
    const stock = await db.batch.findUniqueOrThrow({ where: { id: batchId } });
    assert.equal(stock.physical, 9);
    assert.equal(stock.reserved, 0);
    assert.equal(stock.sold, 3);
    assert.equal(stock.publishedStock, 7);
    for (const status of ["PROCESSING", "READY_TO_SHIP"])
      assert.equal(
        (
          await call(admin, `/admin/orders/${order.data.id}/status`, {
            status,
            reason: "Pemrosesan pengujian",
          })
        ).status,
        200,
      );
    assert.equal(
      (
        await call(admin, `/admin/orders/${order.data.id}/status`, {
          status: "SHIPPED",
          reason: "Pengiriman tanpa resi",
        })
      ).status,
      400,
    );
    for (const status of ["SHIPPED", "COMPLETED", "COMPLETED"])
      assert.equal(
        (
          await call(admin, `/admin/orders/${order.data.id}/status`, {
            status,
            reason: "Pengiriman selesai",
            trackingNumber: "DSU-TEST-123",
          })
        ).status,
        200,
      );
    assert.equal(
      (await db.batch.findUniqueOrThrow({ where: { id: batchId } })).sold,
      3,
    );
    assert.equal(
      await db.inventoryTransaction.count({ where: { batchId, kind: "SALE" } }),
      1,
    );
    assert.equal(
      (
        await call(admin, `/admin/batches/${batchId}/inventory`, {
          kind: "DEAD",
          quantity: 2,
          reason: "Dua tanaman mati di area",
        })
      ).status,
      200,
    );
    const damaged = await db.batch.findUniqueOrThrow({
      where: { id: batchId },
    });
    assert.equal(damaged.dead, 2);
    assert.equal(damaged.physical, 7);
    assert.equal(
      (
        await call(admin, `/admin/batches/${batchId}/inventory`, {
          kind: "ADJUSTMENT",
          quantity: -1,
          reason: "Koreksi invalid",
        })
      ).status,
      422,
    );
    assert.equal(
      (await call(admin, "/admin/reports?type=inventory")).status,
      200,
    );
    const sales = await call(admin, "/admin/reports?type=sales");
    assert.ok(
      sales.data.some(
        (row: { order: string; revenue: number }) =>
          row.order === order.data.id && row.revenue === 3000,
      ),
    );
    const audits = await call(admin, "/admin/audit");
    assert.ok(
      audits.data.some(
        (row: { action: string; entityId: string }) =>
          row.entityId === batchId && row.action === "STOCK_ADJUSTMENT",
      ),
    );
    assert.equal(
      (await call(admin, "/admin/audit", { action: "FORGED" }, "PATCH")).status,
      404,
    );
    assert.equal((await call(admin, "/admin/dashboard?period=7")).status, 200);
    const notifications = await call(admin, "/admin/notifications");
    assert.equal(notifications.status, 200);
    if (notifications.data.length) {
      const key =
        notifications.data.find((n: { key: string }) =>
          n.key.startsWith(`low:${productId}:`),
        )?.key ?? notifications.data[0].key;
      assert.equal(
        (await call(admin, "/admin/notifications/read", { keys: [key] }))
          .status,
        200,
      );
      assert.ok(
        (await call(admin, "/admin/notifications")).data.some(
          (n: { key: string; read: boolean }) => n.key === key && n.read,
        ),
      );
    }
    assert.equal(
      (
        await call(
          admin,
          `/admin/users/${staff.id}`,
          {
            name: "Petugas dinonaktifkan",
            email: staffResult.data.email,
            phone: "081234567890",
            active: false,
          },
          "PATCH",
        )
      ).status,
      200,
    );
    assert.equal((await call(staff, "/petugas/nursery")).status, 401);
    assert.equal(
      (
        await call(
          admin,
          `/admin/batches/${batchId}/assignment`,
          { assignedTo: staff.id },
          "PATCH",
        )
      ).status,
      400,
    );
  } finally {
    const orders = await db.order.findMany({
        where: { userId: { in: users } },
        select: { id: true },
      }),
      ids = orders.map((o) => o.id);
    await db.payment.deleteMany({ where: { orderId: { in: ids } } });
    await db.orderEvent.deleteMany({ where: { orderId: { in: ids } } });
    await db.orderItem.deleteMany({ where: { orderId: { in: ids } } });
    await db.reservation.deleteMany({ where: { orderId: { in: ids } } });
    await db.order.deleteMany({ where: { id: { in: ids } } });
    await db.readinessApproval.deleteMany({ where: { batchId } });
    await db.observation.deleteMany({ where: { batchId } });
    await db.inventoryTransaction.deleteMany({ where: { batchId } });
    await db.batch.deleteMany({ where: { id: batchId } });
    await db.product.deleteMany({ where: { id: productId } });
    await db.nurseryLocation.deleteMany({ where: { id: locationId } });
    if (categoryId) await db.category.deleteMany({ where: { id: categoryId } });
    await db.notificationRead.deleteMany({ where: { userId: { in: users } } });
    await db.auditLog.deleteMany({ where: { actorId: { in: users } } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    for (const id of uploads) {
      assert.match(id, /^[a-f0-9-]{36}\.(png|jpg|webp)$/);
      await unlink(new URL(`../uploads/${id}`, import.meta.url));
      await unlink(new URL(`../uploads/${id}.json`, import.meta.url));
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await db.$disconnect();
  }
});
