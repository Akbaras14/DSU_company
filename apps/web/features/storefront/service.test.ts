import test from "node:test";
import assert from "node:assert/strict";
import { ApiError, contactErrors, request } from "./service";
test("customer contact rejects malformed and oversized input before checkout", () => {
  const contact = {
    name: "Pelanggan",
    phone: "085893802972",
    address: "Alamat pengambilan lengkap",
  };
  assert.deepEqual(contactErrors(contact), {});
  assert.deepEqual(contactErrors({ ...contact, phone: "+6285893802972" }), {});
  assert.ok(contactErrors({ ...contact, phone: "12" }).phone);
  assert.ok(contactErrors({ ...contact, name: " " }).name);
  assert.ok(contactErrors({ ...contact, address: "a".repeat(501) }).address);
});

test("network failures return a readable service error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new TypeError("Failed to fetch");
  };
  try {
    await assert.rejects(
      request("/catalog"),
      (error: unknown) =>
        error instanceof ApiError &&
        error.status === 503 &&
        error.message.includes("Koneksi ke layanan terputus"),
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("malformed JSON returns a readable response error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response("{invalid", {
      headers: { "Content-Type": "application/json" },
    });
  try {
    await assert.rejects(
      request("/catalog"),
      (error: unknown) =>
        error instanceof ApiError &&
        error.status === 502 &&
        error.message.includes("Respons layanan belum dapat dibaca"),
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
