import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || "mysql://root@127.0.0.1:3306/db_dsu_test";
process.env.NODE_ENV = "test";
process.env.WEB_ORIGIN = "http://localhost:3001";
if (!new URL(process.env.DATABASE_URL).pathname.endsWith("_test"))
  throw new Error("Database pengujian wajib berakhiran _test.");
const { app } = await import("../src/app.js");
const { db } = await import("../src/db.js");
const { hashPassword } = await import("../src/auth.js");

test("Petugas: role, CSRF, assignment ownership, validation and persistent observations", async () => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
  const suffix = randomUUID().slice(0, 8);
  const productId = `staff-${suffix}`,
    batchId = `staff-batch-${suffix}`;
  const ids: string[] = [];
  type Client = { cookie: string; csrf: string; id: string };
  const guest = { cookie: "", csrf: "", id: "" };
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
      ...(method === "GET" ? {} : { body: JSON.stringify(body) }),
    });
    return { res, data: await res.json() };
  }
  async function account(
    role: "ADMIN" | "PETUGAS" | "PELANGGAN",
    name: string,
  ) {
    const password = "Petugas-test-2026!";
    const user = await db.user.create({
      data: {
        email: `${name}-${suffix}@example.test`,
        name,
        role,
        passwordHash: await hashPassword(password),
      },
    });
    ids.push(user.id);
    const login = await call(guest, "/auth/login", {
      email: user.email,
      password,
    });
    assert.equal(login.res.status, 200);
    return {
      cookie: login.res.headers.get("set-cookie")!.split(";")[0],
      csrf: login.data.csrfToken as string,
      id: user.id,
    };
  }
  try {
    const admin = await account("ADMIN", "admin"),
      staff = await account("PETUGAS", "staff"),
      other = await account("PETUGAS", "other"),
      customer = await account("PELANGGAN", "customer");
    const newStaff = {
      name: "Petugas baru",
      email: `NEW-${suffix}@example.test`,
      password: "Petugas-baru-2026!",
    };
    assert.equal((await call(guest, "/admin/staff")).res.status, 401);
    assert.equal((await call(staff, "/admin/staff")).res.status, 403);
    assert.equal(
      (await call(customer, "/admin/staff", newStaff)).res.status,
      403,
    );
    assert.equal((await call(staff, "/admin/staff", newStaff)).res.status, 403);
    assert.equal(
      (await call(admin, "/admin/staff", newStaff, "POST", "")).res.status,
      403,
    );
    assert.equal(
      (await call(admin, "/admin/staff", { ...newStaff, password: "short" }))
        .res.status,
      422,
    );
    assert.equal(
      (await call(admin, "/admin/staff", { ...newStaff, email: "invalid" })).res
        .status,
      422,
    );
    assert.equal(
      (await call(admin, "/admin/staff", { ...newStaff, role: "ADMIN" })).res
        .status,
      422,
    );
    const created = await call(admin, "/admin/staff", newStaff);
    assert.equal(created.res.status, 201);
    ids.push(created.data.id);
    assert.equal(created.data.email, newStaff.email.toLowerCase());
    assert.equal(created.data.passwordHash, undefined);
    assert.equal(created.data.password, undefined);
    assert.equal(created.res.headers.get("set-cookie"), null);
    assert.equal((await call(admin, "/auth/session")).data.user.role, "ADMIN");
    assert.equal((await call(admin, "/admin/staff", newStaff)).res.status, 409);
    assert.equal(
      await db.user.count({ where: { email: newStaff.email.toLowerCase() } }),
      1,
    );
    const staffLogin = await call(guest, "/auth/login", {
      email: newStaff.email,
      password: newStaff.password,
    });
    assert.equal(staffLogin.res.status, 200);
    assert.equal(staffLogin.data.user.role, "PETUGAS");
    const listed = (await call(admin, "/admin/staff")).data;
    assert.ok(
      listed.some((user: { id: string }) => user.id === created.data.id),
    );
    assert.ok(
      !listed.some(
        (user: { id: string }) =>
          user.id === customer.id || user.id === admin.id,
      ),
    );
    assert.ok(
      listed.every(
        (user: Record<string, unknown>) => !user.passwordHash && !user.password,
      ),
    );
    await db.product.create({
      data: {
        id: productId,
        name: "Tanaman uji petugas",
        category: "Uji",
        description: "Fixture",
        price: 100,
        batches: {
          create: {
            id: batchId,
            location: "Area uji",
            physical: 10,
            approved: 4,
          },
        },
      },
    });
    assert.equal((await call(guest, "/petugas/nursery")).res.status, 401);
    assert.equal((await call(customer, "/petugas/nursery")).res.status, 403);
    assert.equal((await call(staff, "/admin/nursery")).res.status, 403);
    assert.equal(
      (await call(staff, "/petugas/nursery")).data.batches.some(
        (b: { id: string }) => b.id === batchId,
      ),
      false,
    );
    const assignment = `/admin/batches/${batchId}/assignment`;
    assert.equal(
      (await call(admin, assignment, { assignedTo: staff.id }, "PATCH", "")).res
        .status,
      403,
    );
    assert.equal(
      (await call(admin, assignment, { assignedTo: customer.id }, "PATCH")).res
        .status,
      400,
    );
    assert.equal(
      (await call(admin, assignment, { assignedTo: staff.id }, "PATCH")).res
        .status,
      200,
    );
    const read = (await call(staff, "/petugas/nursery")).data;
    assert.equal(
      read.batches.find((b: { id: string }) => b.id === batchId).physical,
      10,
    );
    assert.equal(
      read.batches.find((b: { id: string }) => b.id === batchId).plantedAt,
      null,
    );
    const path = `/petugas/batches/${batchId}/observations`;
    const input = {
      method: "Sampel acak",
      condition: "Sehat",
      notes: "Catatan lapangan",
      heights: [42, 45, 39],
    };
    assert.equal((await call(other, path, input)).res.status, 404);
    assert.equal((await call(staff, path, input, "POST", "")).res.status, 403);
    assert.equal(
      (await call(staff, path, { ...input, heights: [] })).res.status,
      422,
    );
    assert.equal(
      (await call(staff, path, { ...input, heights: [-1] })).res.status,
      422,
    );
    assert.equal(
      (await call(staff, path, { ...input, observedBy: other.id })).res.status,
      422,
    );
    const saved = await call(staff, path, input);
    assert.equal(saved.res.status, 201);
    assert.equal(saved.data.observedBy, staff.id);
    assert.equal(saved.data.sampleCount, 3);
    const monitored = (await call(admin, "/admin/nursery")).data;
    assert.ok(
      monitored.batches.some(
        (batch: { id: string; assignedTo: string }) =>
          batch.id === batchId && batch.assignedTo === staff.id,
      ),
    );
    assert.ok(
      monitored.observations.some(
        (observation: { id: string; observedBy: string }) =>
          observation.id === saved.data.id &&
          observation.observedBy === staff.id,
      ),
    );
    assert.equal(
      (await call(staff, "/petugas/nursery")).data.observations.some(
        (o: { id: string }) => o.id === saved.data.id,
      ),
      true,
    );
    assert.equal(
      (await db.observation.findUniqueOrThrow({ where: { id: saved.data.id } }))
        .notes,
      input.notes,
    );
    assert.equal(
      (await db.batch.findUniqueOrThrow({ where: { id: batchId } })).approved,
      4,
    );
    await call(admin, assignment, { assignedTo: other.id }, "PATCH");
    assert.equal((await call(staff, path, input)).res.status, 404);
    assert.equal(
      (await call(staff, "/petugas/nursery")).data.observations.some(
        (o: { id: string }) => o.id === saved.data.id,
      ),
      false,
    );
    assert.equal(
      (await call(other, "/petugas/nursery")).data.observations.some(
        (o: { id: string }) => o.id === saved.data.id,
      ),
      false,
    );
    await call(admin, assignment, { assignedTo: null }, "PATCH");
    assert.equal(
      (await db.batch.findUniqueOrThrow({ where: { id: batchId } })).assignedTo,
      null,
    );
  } finally {
    await db.observation.deleteMany({ where: { batchId } });
    await db.batch.deleteMany({ where: { id: batchId } });
    await db.product.deleteMany({ where: { id: productId } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await db.$disconnect();
  }
});
