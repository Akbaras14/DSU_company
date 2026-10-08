import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || "mysql://root@127.0.0.1:3306/db_dsu_test";
process.env.NODE_ENV = "test";
process.env.WEB_ORIGIN = "http://localhost:3001";
if (!new URL(process.env.DATABASE_URL).pathname.endsWith("_test"))
  throw new Error("Pengujian hanya boleh memakai database berakhiran _test.");
const { app } = await import("../src/app.js");
const { db } = await import("../src/db.js");
const { hashPassword } = await import("../src/auth.js");
const { expireOrders } = await import("../src/orders.js");

test("Customer MySQL: persistent identity, ownership, atomic stock and WhatsApp confirmation", async (t) => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
  const suffix = randomUUID().slice(0, 8);
  const productId = `test-${suffix}`;
  const batchId = `batch-${suffix}`;
  const userIds: string[] = [];
  const contact = {
    name: "Customer Uji",
    phone: "081234567890",
    address: "Alamat khusus pengujian lokal",
  };
  const password = "Customer-test-2026!";
  type Client = { cookie: string; csrf: string; id: string };
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
    return { res, data: await res.json() };
  }
  async function account(name: string): Promise<Client> {
    const client = { cookie: "", csrf: "", id: "" };
    const { res, data } = await call(client, "/auth/register", {
      email: `${name}-${suffix}@example.test`,
      password,
      name,
    });
    assert.equal(res.status, 201);
    assert.match(res.headers.get("set-cookie") || "", /HttpOnly/i);
    assert.equal(data.user.role, "PELANGGAN");
    assert.equal(data.user.passwordHash, undefined);
    client.cookie = res.headers.get("set-cookie")!.split(";")[0];
    client.csrf = data.csrfToken;
    client.id = data.user.id;
    userIds.push(client.id);
    return client;
  }
  let first: Client, second: Client, admin: Client;
  async function verifyPayment(id: string) {
    const order = await db.order.findUniqueOrThrow({ where: { id } });
    const payment = await db.payment.create({ data: { orderId: id, amount: order.total, method: "Transfer pengujian", proofUrl: "/fixture" } });
    await db.order.update({ where: { id }, data: { status: "WAITING_VERIFICATION" } });
    assert.equal((await call(admin, `/admin/payments/${payment.id}/review`, { status: "VERIFIED", reason: "Dana pengujian diterima" })).res.status, 200);
  }
  let winning: Client,
    other: Client,
    orderId = "";
  const key = randomUUID();
  const payload = {
    contact: { ...contact, postalCode: "12345" },
    fulfillmentMethod: "DELIVERY",
    key,
    lines: [{ productId, quantity: 2, unitPrice: 85000 }],
  };
  try {
    await db.product.create({
      data: {
        id: productId,
        name: "Tanaman khusus uji",
        description: "Fixture database pengujian",
        category: "Uji",
        published: true,
        price: 85000,
        batches: {
          create: {
            id: batchId,
            location: "Area uji",
            physical: 2,
            approved: 2,
            status: "READY_FOR_SALE",
            publishedStock: 2,
          },
        },
      },
    });
    first = await account("pertama");
    second = await account("kedua");
    const adminUser = await db.user.create({
      data: {
        email: `admin-${suffix}@example.test`,
        name: "Admin uji",
        role: "ADMIN",
        passwordHash: await hashPassword(password),
      },
    });
    userIds.push(adminUser.id);
    const login = await call({ cookie: "", csrf: "", id: "" }, "/auth/login", {
      email: adminUser.email,
      password,
    });
    admin = {
      cookie: login.res.headers.get("set-cookie")!.split(";")[0],
      csrf: login.data.csrfToken,
      id: adminUser.id,
    };
    await t.test(
      "sessions survive reads; forged roles and missing CSRF are rejected",
      async () => {
        const read = await call(first, "/auth/session");
        assert.equal(read.data.user.id, first.id);
        assert.equal(
          (
            await call(
              first,
              "/customer/cart",
              { productId, quantity: 1, mode: "add" },
              "POST",
              "invalid",
            )
          ).res.status,
          403,
        );
        assert.equal((await call(first, "/admin/orders")).res.status, 403);
        assert.equal(
          (
            await call(first, "/auth/register", {
              name: "Escalate",
              email: `bad-${suffix}@example.test`,
              password,
              role: "ADMIN",
            })
          ).res.status,
          422,
        );
        assert.equal(
          (await call(first, "/customer/profile", contact, "PATCH")).res.status,
          200,
        );
        assert.equal(
          (await call(first, "/auth/session")).data.user.phone,
          contact.phone,
        );
      },
    );
    await t.test(
      "profile address persists and rejects incomplete or mismatched regions",
      async () => {
        await db.province.createMany({
          data: [{ id: "31", name: "DKI JAKARTA" }],
          skipDuplicates: true,
        });
        await db.regency.createMany({
          data: [
            { id: "3171", provinceId: "31", name: "KOTA JAKARTA SELATAN" },
          ],
          skipDuplicates: true,
        });
        await db.district.createMany({
          data: [{ id: "3171010", regencyId: "3171", name: "JAGAKARSA" }],
          skipDuplicates: true,
        });
        await db.village.createMany({
          data: [{ id: "3171010001", districtId: "3171010", name: "CIPEDAK" }],
          skipDuplicates: true,
        });
        const address = {
          ...contact,
          provinceId: "31",
          regencyId: "3171",
          districtId: "3171010",
          villageId: "3171010001",
          postalCode: "12630",
        };
        assert.equal(
          (
            await call(
              first,
              "/customer/profile",
              { ...address, villageId: "" },
              "PATCH",
            )
          ).res.status,
          422,
        );
        assert.equal(
          (
            await call(
              first,
              "/customer/profile",
              { ...address, provinceId: "32" },
              "PATCH",
            )
          ).res.status,
          400,
        );
        assert.equal(
          (await call(first, "/customer/profile", address, "PATCH")).res.status,
          200,
        );
        const saved = (await call(first, "/auth/session")).data.user;
        for (const key of Object.keys(address) as (keyof typeof address)[])
          assert.equal(saved[key], address[key]);
        assert.equal(
          (await call(second, "/auth/session")).data.user.villageId,
          "",
        );
      },
    );
    await t.test(
      "two simultaneous checkouts cannot oversell the last approved stock",
      async () => {
        for (const client of [first, second])
          assert.equal(
            (
              await call(client, "/customer/cart", {
                productId,
                quantity: 2,
                mode: "set",
              })
            ).res.status,
            200,
          );
        assert.equal(
          (
            await call(first, "/customer/checkout", {
              ...payload,
              key: randomUUID(),
              contact: { ...payload.contact, postalCode: "12" },
            })
          ).res.status,
          422,
        );
        const responses = await Promise.all([
          call(first, "/customer/checkout", payload),
          call(second, "/customer/checkout", { ...payload, key: randomUUID() }),
        ]);
        assert.deepEqual(responses.map((r) => r.res.status).sort(), [201, 409]);
        const winner = responses.findIndex((r) => r.res.status === 201);
        winning = winner === 0 ? first : second;
        other = winner === 0 ? second : first;
        orderId = responses[winner].data.id;
        const stock = await db.batch.findUniqueOrThrow({
          where: { id: batchId },
        });
        assert.equal(stock.reserved, 2);
        assert.equal(stock.physical, 2);
        assert.equal(responses[winner].data.status, "PENDING_PAYMENT");
        assert.equal(responses[winner].data.fulfillmentMethod, "DELIVERY");
        assert.match(
          responses[winner].data.whatsappUrl,
          /^https:\/\/wa.me\/6285893802972\?text=/,
        );
      },
    );
    await t.test(
      "checkout retries, ownership and cancellation preserve stock",
      async () => {
        const stored = await db.order.findUniqueOrThrow({
          where: { id: orderId },
        });
        const retry = await call(winning, "/customer/checkout", {
          ...payload,
          key: stored.idempotencyKey,
        });
        assert.equal(retry.res.status, 201);
        assert.equal(retry.data.id, orderId);
        assert.equal(
          (
            await call(other, `/customer/orders/${orderId}/cancel`, {
              reason: "Tidak berhak membatalkan",
            })
          ).res.status,
          404,
        );
        assert.equal((await call(other, "/customer/orders")).data.length, 0);
        for (let i = 0; i < 2; i++)
          assert.equal(
            (
              await call(winning, `/customer/orders/${orderId}/cancel`, {
                reason: "Pengujian pembatalan",
              })
            ).res.status,
            200,
          );
        const stock = await db.batch.findUniqueOrThrow({
          where: { id: batchId },
        });
        assert.equal(stock.reserved, 0);
        assert.equal(stock.physical, 2);
      },
    );
    await t.test(
      "expired WhatsApp confirmations release reservations exactly once",
      async () => {
        const created = await call(other, "/customer/checkout", {
          ...payload,
          key: randomUUID(),
        });
        assert.equal(created.res.status, 201);
        await db.order.update({
          where: { id: created.data.id },
          data: { expiresAt: new Date(Date.now() - 1000) },
        });
        await expireOrders();
        await expireOrders();
        assert.equal(
          (await db.order.findUniqueOrThrow({ where: { id: created.data.id } }))
            .status,
          "EXPIRED",
        );
        const stock = await db.batch.findUniqueOrThrow({
          where: { id: batchId },
        });
        assert.equal(stock.reserved, 0);
        assert.equal(stock.physical, 2);
      },
    );
    await t.test(
      "pickup orders need no tracking number and cannot be shipped",
      async () => {
        await call(first, "/customer/cart", {
          productId,
          quantity: 1,
          mode: "set",
        });
        const created = await call(first, "/customer/checkout", {
          ...payload,
          key: randomUUID(),
          fulfillmentMethod: "PICKUP",
          lines: [{ productId, quantity: 1, unitPrice: 85000 }],
        });
        assert.equal(created.res.status, 201);
        const path = `/admin/orders/${created.data.id}/status`;
        await verifyPayment(created.data.id);
        for (const status of ["PROCESSING"])
          assert.equal(
            (
              await call(admin, path, {
                status,
                reason: "Pengambilan langsung di pembibitan",
              })
            ).res.status,
            200,
          );
        assert.equal(
          (
            await call(admin, path, {
              status: "SHIPPED",
              trackingNumber: "RESI-TIDAK-SESUAI",
              reason: "Pesanan ambil di tempat bukan pengiriman",
            })
          ).res.status,
          409,
        );
        const ready = await call(admin, path, {
          status: "READY_FOR_PICKUP",
          reason: "Tanaman siap diambil pelanggan",
        });
        assert.equal(ready.res.status, 200);
        assert.equal(ready.data.trackingNumber, null);
        assert.equal(
          (
            await call(admin, path, {
              status: "CANCELLED",
              reason: "Pelanggan membatalkan pengambilan",
            })
          ).res.status,
          409,
        );
        assert.equal((await call(admin, path, { status: "COMPLETED", reason: "Tanaman diambil pelanggan" })).res.status, 200);
      },
    );
    await t.test(
      "admin shipping requires tracking and fulfillment deducts inventory once",
      async () => {
        await db.batch.update({ where: { id: batchId }, data: { physical: 2, approved: 2, reserved: 0, publishedStock: 2, status: "READY_FOR_SALE" } });
        await call(first, "/customer/cart", {
          productId,
          quantity: 2,
          mode: "set",
        });
        const stalePrice = await call(first, "/customer/checkout", {
          ...payload,
          key: randomUUID(),
          lines: [{ productId, quantity: 2, unitPrice: 1 }],
        });
        assert.equal(stalePrice.res.status, 409);
        const created = await call(first, "/customer/checkout", {
          ...payload,
          key: randomUUID(),
        });
        assert.equal(created.res.status, 201);
        const path = `/admin/orders/${created.data.id}/status`;
        assert.equal(
          (
            await call(admin, path, {
              status: "COMPLETED",
              reason: "Invalid skip",
            })
          ).res.status,
          409,
        );
        await verifyPayment(created.data.id);
        for (const status of [
          "PROCESSING",
          "SHIPPED",
          "COMPLETED",
          "COMPLETED",
        ]) {
          if (status === "SHIPPED") {
            for (const trackingNumber of [undefined, "   "]) {
              const rejected = await call(admin, path, {
                status,
                reason: "Hasil konfirmasi WhatsApp pengujian",
                ...(trackingNumber === undefined ? {} : { trackingNumber }),
              });
              assert.equal(rejected.res.status, 400);
              assert.match(rejected.data.error, /Nomor resi wajib/);
            }
            assert.equal(
              (
                await call(admin, path, {
                  status: "READY_FOR_PICKUP",
                  reason: "Metode pengiriman tidak sesuai",
                })
              ).res.status,
              409,
            );
          }
          assert.equal(
            (
              await call(admin, path, {
                status,
                reason: "Hasil konfirmasi WhatsApp pengujian",
                ...(status === "SHIPPED"
                  ? { trackingNumber: "  DSU-RESI-123456  " }
                  : {}),
              })
            ).res.status,
            200,
          );
        }
        const saved = await call(first, "/customer/orders");
        assert.equal(
          saved.data.find(
            (order: { id: string }) => order.id === created.data.id,
          ).trackingNumber,
          "DSU-RESI-123456",
        );
        const stock = await db.batch.findUniqueOrThrow({
          where: { id: batchId },
        });
        assert.equal(stock.physical, 0);
        assert.equal(stock.approved, 0);
        assert.equal(stock.reserved, 0);
        assert.equal(
          await db.inventoryTransaction.count({ where: { batchId, kind: "SALE" } }),
          2,
        );
        await assert.rejects(
          db.batch.update({ where: { id: batchId }, data: { approved: 1 } }),
        );
      },
    );
    await t.test("logout revokes the server session", async () => {
      assert.equal((await call(first, "/auth/logout", {})).res.status, 200);
      assert.equal((await call(first, "/customer/cart")).res.status, 401);
    });
  } finally {
    const ids = (
      await db.order.findMany({
        where: { userId: { in: userIds } },
        select: { id: true },
      })
    ).map((o) => o.id);
    await db.orderEvent.deleteMany({ where: { orderId: { in: ids } } });
    await db.orderItem.deleteMany({ where: { orderId: { in: ids } } });
    await db.reservation.deleteMany({ where: { orderId: { in: ids } } });
    await db.payment.deleteMany({ where: { orderId: { in: ids } } });
    await db.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
    await db.inventoryTransaction.deleteMany({ where: { batchId } });
    await db.order.deleteMany({ where: { id: { in: ids } } });
    await db.cartItem.deleteMany({ where: { userId: { in: userIds } } });
    await db.session.deleteMany({ where: { userId: { in: userIds } } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
    await db.batch.deleteMany({ where: { id: batchId } });
    await db.product.deleteMany({ where: { id: productId } });
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await db.$disconnect();
  }
});
