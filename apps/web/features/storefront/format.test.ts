import assert from "node:assert/strict";
import { test } from "node:test";
import { indonesianLabel, indonesianAudit } from "../../lib/format";

test("Indonesian labels cover operational states, reports and nested audit values", () => {
  assert.equal(indonesianLabel("READY_FOR_SALE"), "Siap jual");
  assert.equal(indonesianLabel("NEEDS_ATTENTION"), "Perlu perhatian");
  assert.equal(indonesianLabel("plantedAt"), "Tanggal tanam");
  assert.equal(indonesianLabel("CREATE_BATCH"), "Tambah kelompok tanaman");
  const audit = JSON.parse(
    indonesianAudit({
      status: "MONITORING",
      active: true,
      quantity: 12,
      notes: "Catatan pengguna",
    }),
  );
  assert.deepEqual(audit, {
    Status: "Dalam pemantauan",
    Aktif: "Ya",
    Jumlah: 12,
    Catatan: "Catatan pengguna",
  });
});
