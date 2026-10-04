import { test } from "node:test";
import assert from "node:assert/strict";
import { availableStock } from "../src/index";
test("INV-04: orderable stock excludes immature plants and reservations", () => {
  assert.equal(
    availableStock({ physical: 200, approved: 80, reserved: 15 }),
    65,
  );
  assert.equal(availableStock({ physical: 200, approved: 0, reserved: 0 }), 0);
});
test("INV-03 / NFR-03: invalid balances require reconciliation", () => {
  for (const stock of [
    { physical: -1, approved: 0, reserved: 0 },
    { physical: 10, approved: 11, reserved: 0 },
    { physical: 10, approved: 5, reserved: 6 },
    { physical: 1.5, approved: 0, reserved: 0 },
  ])
    assert.throws(() => availableStock(stock));
});
