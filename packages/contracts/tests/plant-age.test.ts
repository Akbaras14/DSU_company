import test from "node:test";
import assert from "node:assert/strict";
import { plantAgeDays } from "../src/index";

test("Plant age counts Jakarta calendar days, including midnight and leap years", () => {
  assert.equal(plantAgeDays("2026-10-01", new Date("2026-10-05T10:00:00Z")), 4);
  assert.equal(plantAgeDays("2026-10-05", new Date("2026-10-05T10:00:00Z")), 0);
  assert.equal(
    plantAgeDays("2026-10-04T16:59:00Z", new Date("2026-10-04T17:00:00Z")),
    1,
  );
  assert.equal(plantAgeDays("2024-02-28", new Date("2024-03-01T12:00:00Z")), 2);
  for (const value of [null, "invalid", "2026-10-06"]) {
    assert.equal(plantAgeDays(value, new Date("2026-10-05T10:00:00Z")), null);
  }
});
