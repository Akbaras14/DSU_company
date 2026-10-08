import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { Request, Response } from "express";
import type { User } from "@prisma/client";

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || "mysql://root@127.0.0.1:3306/db_dsu_test";
process.env.NODE_ENV = "test";
process.env.WEB_ORIGIN = "http://localhost:3001";
if (!new URL(process.env.DATABASE_URL).pathname.endsWith("_test"))
  throw new Error("Database pengujian wajib berakhiran _test.");
const { app } = await import("../src/app.js");
const { db } = await import("../src/db.js");
const { hashPassword, verifyPassword, openSession } =
  await import("../src/auth.js");
const { recoverAdmin } = await import("../src/passwords.js");

test("Password recovery: validation, RBAC, CSRF, revocation, concurrent changes, operator recovery and secret-free audit", async () => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
  const suffix = randomUUID();
  const ids: string[] = [];
  const oldPassword = "Old-password-test-2026!",
    newPassword = "New-password-test-2026!";
  const oldHash = await hashPassword(oldPassword);
  type Client = { cookie: string; csrf: string };
  const guest = { cookie: "", csrf: "" };
  async function call(
    client: Client,
    path: string,
    body?: unknown,
    csrf = client.csrf,
  ) {
    const response = await fetch(base + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Cookie: client.cookie,
        Origin: process.env.WEB_ORIGIN!,
        "X-DSU-Client": "web",
        "X-CSRF-Token": csrf,
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { response, data: await response.json() };
  }
  async function login(email: string, password = oldPassword): Promise<Client> {
    const { response, data } = await call(guest, "/auth/login", {
      email,
      password,
    });
    assert.equal(response.status, 200);
    return {
      cookie: response.headers.get("set-cookie")!.split(";")[0],
      csrf: data.csrfToken,
    };
  }
  const input = {
    currentPassword: oldPassword,
    newPassword,
    confirmPassword: newPassword,
  };
  try {
    const users: User[] = [];
    for (const role of ["ADMIN", "PETUGAS", "PELANGGAN", "ADMIN"] as const) {
      const row = await db.user.create({
        data: {
          name: role,
          role,
          email: `${role}-${users.length}-${suffix}@example.test`,
          passwordHash: oldHash,
        },
      });
      users.push(row);
      ids.push(row.id);
    }
    const [adminRow, staffRow, customerRow, otherAdmin] = users;
    const admin = await login(adminRow.email),
      staff = await login(staffRow.email),
      customer = await login(customerRow.email);
    const resetPath = `/admin/users/${staffRow.id}/password`;
    assert.equal(
      (await call(guest, "/auth/password", input)).response.status,
      401,
    );
    assert.equal((await call(staff, resetPath, input)).response.status, 403);
    assert.equal((await call(customer, resetPath, input)).response.status, 403);
    assert.equal(
      (await call(admin, resetPath, input, "invalid")).response.status,
      403,
    );
    assert.equal(
      (
        await call(admin, resetPath, {
          ...input,
          currentPassword: "Wrong-password-2026!",
        })
      ).response.status,
      403,
    );
    assert.equal(
      (
        await call(admin, resetPath, {
          ...input,
          newPassword: "short",
          confirmPassword: "short",
        })
      ).response.status,
      422,
    );
    assert.equal(
      (
        await call(admin, resetPath, {
          ...input,
          confirmPassword: "Mismatch-password-2026!",
        })
      ).response.status,
      422,
    );
    assert.equal(
      (await call(admin, `/admin/users/${otherAdmin.id}/password`, input))
        .response.status,
      403,
    );
    assert.equal(
      (await call(admin, `/admin/users/${randomUUID()}/password`, input))
        .response.status,
      404,
    );
    assert.equal(
      (await db.user.findUniqueOrThrow({ where: { id: staffRow.id } }))
        .passwordHash,
      oldHash,
    );
    assert.equal((await call(admin, resetPath, input)).response.status, 200);
    assert.equal(await db.session.count({ where: { userId: staffRow.id } }), 0);
    assert.equal((await call(staff, "/petugas/nursery")).response.status, 401);
    assert.equal(
      (
        await call(guest, "/auth/login", {
          email: staffRow.email,
          password: oldPassword,
        })
      ).response.status,
      401,
    );
    await login(staffRow.email, newPassword);
    // A login verified before the reset cannot create a session afterward.
    await assert.rejects(
      openSession(
        staffRow.id,
        { headers: {} } as Request,
        { cookie() {} } as unknown as Response,
        oldHash,
      ),
      { status: 401 },
    );
    assert.equal(
      (await call(customer, "/auth/password", input, "invalid")).response
        .status,
      403,
    );
    assert.equal(
      (
        await call(customer, "/auth/password", {
          ...input,
          currentPassword: "Wrong-password-2026!",
        })
      ).response.status,
      403,
    );
    assert.equal(
      (await call(customer, "/auth/password", input)).response.status,
      200,
    );
    assert.equal((await call(customer, "/customer/cart")).response.status, 401);
    await login(customerRow.email, newPassword);
    assert.equal(
      (
        await call(admin, `/admin/users/${customerRow.id}/password`, {
          currentPassword: oldPassword,
          newPassword: oldPassword,
          confirmPassword: oldPassword,
        })
      ).response.status,
      200,
    );
    assert.equal(
      await db.session.count({ where: { userId: customerRow.id } }),
      0,
    );
    await db.user.update({
      where: { id: staffRow.id },
      data: { active: false },
    });
    assert.equal(
      (
        await call(admin, resetPath, {
          currentPassword: oldPassword,
          newPassword: oldPassword,
          confirmPassword: oldPassword,
        })
      ).response.status,
      200,
    );
    assert.equal(
      (await db.user.findUniqueOrThrow({ where: { id: staffRow.id } })).active,
      false,
    );
    assert.equal(
      (
        await call(guest, "/auth/login", {
          email: staffRow.email,
          password: oldPassword,
        })
      ).response.status,
      401,
    );
    const changes = await Promise.all([
      call(admin, "/auth/password", input),
      call(admin, "/auth/password", input),
    ]);
    assert.deepEqual(
      changes.map((result) => result.response.status).sort(),
      [200, 401],
    );
    assert.equal(await db.session.count({ where: { userId: adminRow.id } }), 0);
    assert.equal((await call(admin, "/admin/staff")).response.status, 401);
    await login(adminRow.email, newPassword);
    await assert.rejects(recoverAdmin(customerRow.email, oldPassword), {
      status: 404,
    });
    await assert.rejects(recoverAdmin(adminRow.email, "short"));
    await recoverAdmin(adminRow.email, oldPassword);
    assert.equal(await db.session.count({ where: { userId: adminRow.id } }), 0);
    await login(adminRow.email);
    const recovered = await db.user.findUniqueOrThrow({
      where: { id: adminRow.id },
    });
    assert.equal(
      await verifyPassword(oldPassword, recovered.passwordHash),
      true,
    );
    const logs = await db.auditLog.findMany({
      where: {
        actorId: { in: ids },
        action: {
          in: ["CHANGE_PASSWORD", "RESET_PASSWORD", "RECOVER_ADMIN_PASSWORD"],
        },
      },
    });
    assert.equal(logs.length, 6);
    const serialized = JSON.stringify(logs);
    for (const secret of [
      oldPassword,
      newPassword,
      oldHash,
      recovered.passwordHash,
    ])
      assert.equal(serialized.includes(secret), false);
  } finally {
    await db.auditLog.deleteMany({ where: { actorId: { in: ids } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await db.$disconnect();
  }
});
