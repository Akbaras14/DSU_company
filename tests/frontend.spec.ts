import { test, expect } from "@playwright/test";

test("petugas mobile navigation returns focus and opens observation history", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/petugas");
  const trigger = page.getByRole("button", { name: "Buka navigasi" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Navigasi petugas" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("button", { name: "Riwayat pemantauan" }).click();
  await expect(
    page.getByRole("heading", { name: "Riwayat pemantauan", exact: true }),
  ).toBeVisible();
  await expect(dialog).toBeHidden();
});

test("petugas retains assigned batches, search, details and observation context", async ({
  page,
}) => {
  await page.goto("/petugas");
  await expect(
    page.getByRole("heading", { name: "Batch ditugaskan", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Tabebuya rosea")).toHaveCount(0);
  await page.getByRole("textbox", { name: "Cari batch" }).fill("Monstera");
  await expect(page.getByRole("row")).toHaveCount(2);
  await page.getByRole("button", { name: "Lihat BT-26001" }).click();
  await expect(
    page.getByRole("button", { name: "Tutup detail" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Riwayat pemantauan" }).click();
  await expect(page.getByText(/Sampel acak.*3 sampel.*WIB/)).toBeVisible();
});

test("petugas layout fits mobile, tablet and desktop", async ({ page }) => {
  for (const width of [280, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/petugas");
    await expect(page.locator(".stock-summary")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
});
