import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

test("admin password forms validate, cancel, reset staff and change the admin password", async ({
  page,
}) => {
  test.setTimeout(120000);
  const origin = "http://localhost:3101";
  const adminEmail = "admin@browser.example.test";
  const adminPassword = "Admin-browser-2026!";
  const newPassword = "Changed-browser-2026!";
  const headers = { Origin: origin, "X-DSU-Client": "web" };
  const login = await page.request.post("/api/v1/auth/login", {
    headers,
    data: { email: adminEmail, password: adminPassword },
  });
  expect(login.ok()).toBeTruthy();
  const auth = await login.json();
  const name = `Reset petugas ${randomUUID().slice(0, 8)}`;
  const email = `reset-${randomUUID()}@browser.example.test`;
  const created = await page.request.post("/api/v1/admin/staff", {
    headers: { ...headers, "X-CSRF-Token": auth.csrfToken },
    data: { name, email, password: "Staff-browser-2026!", phone: "" },
  });
  expect(created.ok()).toBeTruthy();
  await page.goto("/admin/petugas");
  await page.getByRole("textbox", { name: "Cari petugas" }).fill(name);
  await page
    .getByRole("row")
    .filter({ hasText: name })
    .getByRole("button", { name: "Aksi", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Pilihan aksi", exact: true })
    .getByRole("button", { name: "Reset kata sandi", exact: true })
    .click();
  const reset = page.getByRole("dialog", {
    name: `Reset kata sandi: ${name}`,
    exact: true,
  });
  await expect(reset).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect((await reset.boundingBox())!.width).toBeLessThanOrEqual(390);
  await reset
    .getByLabel("Kata sandi admin saat ini *", { exact: true })
    .fill(adminPassword);
  await reset
    .getByLabel("Kata sandi baru *", { exact: true })
    .fill(newPassword);
  await reset
    .getByLabel("Konfirmasi kata sandi baru *", { exact: true })
    .fill("Mismatch-browser-2026!");
  await reset.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(reset.getByRole("alert")).toHaveText(
    "Konfirmasi kata sandi tidak sama.",
  );
  await reset
    .getByLabel("Konfirmasi kata sandi baru *", { exact: true })
    .fill(newPassword);
  await reset.getByRole("button", { name: "Simpan", exact: true }).click();
  const confirmation = page.getByRole("dialog", {
    name: "Reset kata sandi?",
    exact: true,
  });
  await confirmation
    .getByRole("button", { name: "Batal", exact: true })
    .click();
  await expect(reset).toBeVisible();
  await reset.getByRole("button", { name: "Simpan", exact: true }).click();
  await confirmation
    .getByRole("button", { name: "Ya, lanjutkan", exact: true })
    .click();
  const success = page.getByRole("dialog", { name: "Berhasil!", exact: true });
  await expect(success).toContainText("Kata sandi akun berhasil direset");
  await success.getByRole("button", { name: "Mengerti", exact: true }).click();
  await expect(reset).toHaveCount(0);
  await page.goto("/admin/pengaturan");
  await page
    .getByRole("button", { name: "Ganti kata sandi", exact: true })
    .click();
  const change = page.getByRole("dialog", {
    name: "Ganti kata sandi",
    exact: true,
  });
  await change
    .getByLabel("Kata sandi saat ini *", { exact: true })
    .fill(adminPassword);
  await change
    .getByLabel("Kata sandi baru *", { exact: true })
    .fill(newPassword);
  await change
    .getByLabel("Konfirmasi kata sandi baru *", { exact: true })
    .fill(newPassword);
  try {
    await change.getByRole("button", { name: "Simpan", exact: true }).click();
    await page
      .getByRole("dialog", { name: "Ganti kata sandi?", exact: true })
      .getByRole("button", { name: "Ya, lanjutkan", exact: true })
      .click();
    await expect(page).toHaveURL(/\/login$/);
    expect(
      (
        await page.request.post("/api/v1/auth/login", {
          headers,
          data: { email, password: "Staff-browser-2026!" },
        })
      ).status(),
    ).toBe(401);
    expect(
      (
        await page.request.post("/api/v1/auth/login", {
          headers,
          data: { email, password: newPassword },
        })
      ).ok(),
    ).toBeTruthy();
  } finally {
    const relogin = await page.request.post("/api/v1/auth/login", {
      headers,
      data: { email: adminEmail, password: newPassword },
    });
    if (relogin.ok()) {
      const session = await relogin.json();
      const restored = await page.request.post("/api/v1/auth/password", {
        headers: { ...headers, "X-CSRF-Token": session.csrfToken },
        data: {
          currentPassword: newPassword,
          newPassword: adminPassword,
          confirmPassword: adminPassword,
        },
      });
      expect(restored.ok()).toBeTruthy();
    }
  }
});

test("row actions open a floating menu without resizing the table", async ({
  page,
}) => {
  await page.request.post("/api/v1/auth/login", {
    headers: { Origin: "http://localhost:3101", "X-DSU-Client": "web" },
    data: {
      email: "admin@browser.example.test",
      password: "Admin-browser-2026!",
    },
  });
  await page.goto("/admin/tanaman");
  const trigger = page
    .getByRole("button", { name: "Aksi", exact: true })
    .first();
  await expect(trigger).toBeVisible();
  const row = trigger.locator("xpath=ancestor::tr");
  const before = await row.boundingBox();
  await trigger.click();
  const menu = page.getByRole("dialog", { name: "Pilihan aksi", exact: true });
  await expect(menu).toBeVisible();
  expect((await row.boundingBox())?.height).toBe(before?.height);
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("admin notification bell shows unread count and refreshes after marking read", async ({
  page,
}) => {
  const login = await page.request.post("/api/v1/auth/login", {
    headers: { Origin: "http://localhost:3101", "X-DSU-Client": "web" },
    data: {
      email: "admin@browser.example.test",
      password: "Admin-browser-2026!",
    },
  });
  expect(login.ok()).toBeTruthy();
  let read = false;
  await page.route("**/api/v1/admin/notifications", (route) =>
    route.fulfill({
      json: [
        {
          key: "test",
          kind: "LOW_STOCK",
          title: "Stok rendah",
          href: "/admin/inventory",
          createdAt: new Date().toISOString(),
          read,
        },
      ],
    }),
  );
  await page.route("**/api/v1/admin/notifications/read", (route) => {
    read = true;
    return route.fulfill({ json: { ok: true } });
  });
  await page.goto("/admin");
  const bell = page.locator(".admin-topbar .admin-notification-bell");
  await expect(bell).toHaveAccessibleName("Notifikasi, 1 belum dibaca");
  await expect(bell.locator(".admin-notification-badge")).toHaveText("1");
  await expect(
    page.locator('.admin-sidebar a[href="/admin/notifikasi"]'),
  ).toHaveCount(0);
  const originalUrl = page.url();
  await bell.click();
  expect(page.url()).toBe(originalUrl);
  await expect(
    page.getByRole("dialog", { name: "Notifikasi", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tandai semua dibaca" }).click();
  await expect(bell.locator(".admin-notification-badge")).toHaveCount(0);
  await expect(bell).toHaveAttribute("aria-label", "Notifikasi");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("dialog", { name: "Notifikasi", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Notifikasi", exact: true }),
  ).toHaveCount(0);
  await expect(bell).toBeFocused();
  await expect(bell).toHaveAccessibleName("Notifikasi");
});

test("admin modules use persisted data, forms, report export and accessible mobile navigation", async ({
  page,
}) => {
  test.setTimeout(180000);
  const login = await page.request.post("/api/v1/auth/login", {
    headers: { Origin: "http://localhost:3101", "X-DSU-Client": "web" },
    data: {
      email: "admin@browser.example.test",
      password: "Admin-browser-2026!",
    },
  });
  expect(login.ok()).toBeTruthy();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const [route, heading] of [
    ["", "Beranda"],
    ["tanaman", "Tanaman"],
    ["kategori", "Kategori"],
    ["lokasi", "Lokasi Pembibitan"],
    ["batch", "Kelompok Tanaman"],
    ["inventory", "Persediaan"],
    ["monitoring", "Pemantauan Tanaman"],
    ["approval", "Persetujuan Siap Jual"],
    ["katalog", "Katalog"],
    ["pesanan", "Kelola pesanan"],
    ["petugas", "Petugas"],
    ["pembayaran", "Pembayaran"],
    ["pelanggan", "Pelanggan"],
    ["laporan", "Laporan"],
    ["audit", "Catatan Aktivitas"],
    ["pengaturan", "Pengaturan"],
  ]) {
    await page.goto(`/admin/${route}`);
    await expect(
      page.getByRole("heading", { name: heading, exact: true, level: 1 }),
    ).toBeVisible();
    await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBeTruthy();
    await page.setViewportSize({ width: 1280, height: 900 });
    if (route === "monitoring") {
      const filters = page.getByRole("region", {
        name: "Penyaring pemantauan",
        exact: true,
      });
      const reset = filters.getByRole("button", {
        name: "Bersihkan penyaring",
        exact: true,
      });
      await expect(reset).toBeDisabled();
      await filters
        .getByLabel("Kondisi tanaman", { exact: true })
        .selectOption("HEALTHY");
      await expect(reset).toBeEnabled();
      await reset.click();
      await expect(reset).toBeDisabled();
    }
  }
  for (const [route, title] of [
    ["tanaman", "Tambah tanaman"],
    ["lokasi", "Tambah lokasi"],
    ["batch", "Tambah kelompok"],
  ]) {
    await page.goto(`/admin/${route}`);
    await page.getByRole("button", { name: title, exact: true }).click();
    const modal = page.getByRole("dialog", { name: title, exact: true });
    await expect(modal).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    const bounds = await modal.boundingBox();
    expect(bounds!.width).toBeLessThanOrEqual(390);
    expect(bounds!.height).toBeLessThanOrEqual(844);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    await modal.getByRole("button", { name: "Simpan", exact: true }).click();
    await expect(modal).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(modal).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: title, exact: true }),
    ).toBeFocused();
    await page.setViewportSize({ width: 1280, height: 900 });
  }
  await page.goto("/admin/kategori");
  await page
    .getByRole("button", { name: "Tambah kategori", exact: true })
    .click();
  const name = `Kategori browser ${randomUUID().slice(0, 8)}`;
  await page.getByLabel("Nama *", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Berhasil!" })
    .getByRole("button", { name: "Mengerti" })
    .click();
  await page.reload();
  await page
    .getByRole("textbox", { name: "Cari data", exact: true })
    .fill(name);
  const row = page.getByRole("row").filter({ hasText: name });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Aksi", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Pilihan aksi", exact: true })
    .getByRole("button", { name: "Ubah", exact: true })
    .click();
  await page.getByLabel("Status *", { exact: true }).selectOption("false");
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Nonaktifkan Kategori?", exact: true })
    .getByRole("button", { name: "Batal", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ubah Kategori" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Batal", exact: true }).click();
  await page.reload();
  await page
    .getByRole("textbox", { name: "Cari data", exact: true })
    .fill(name);
  await expect(page.getByRole("row").filter({ hasText: name })).toContainText(
    "Aktif",
  );
  await page.goto("/admin/laporan");
  const sidebar = page.getByRole("navigation", {
    name: "Navigasi admin",
    exact: true,
  });
  const nursery = sidebar.locator("summary").filter({ hasText: "Pembibitan" });
  await expect(
    sidebar.getByRole("link", { name: "Tanaman", exact: true }),
  ).toBeHidden();
  await nursery.click();
  await expect(
    sidebar.getByRole("link", { name: "Tanaman", exact: true }),
  ).toBeVisible();
  await nursery.press("Enter");
  await expect(
    sidebar.getByRole("link", { name: "Tanaman", exact: true }),
  ).toBeHidden();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Ekspor Excel", exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/\.xml$/);
  await page.setViewportSize({ width: 390, height: 844 });
  const trigger = page.getByRole("button", { name: "Buka navigasi admin" });
  await trigger.click();
  const drawer = page.getByRole("dialog", {
    name: "Navigasi admin",
    exact: true,
  });
  await expect(drawer).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(errors).toEqual([]);
});

test.beforeEach(async ({ page }) => {
  const result = await page.request.post("/api/v1/auth/login", {
    headers: { Origin: "http://localhost:3101", "X-DSU-Client": "web" },
    data: {
      email: "petugas@browser.example.test",
      password: "Petugas-browser-2026!",
    },
  });
  expect(result.ok()).toBeTruthy();
});

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
    page.getByRole("heading", { name: "Kelompok ditugaskan", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Tabebuya rosea")).toHaveCount(0);
  await expect(
    page.getByRole("columnheader", { name: "Umur tanaman", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/^\d[\d.]* hari$/).first()).toBeVisible();
  await page.getByRole("textbox", { name: "Cari kelompok" }).fill("Monstera");
  await expect(page.getByRole("row")).toHaveCount(2);
  await page.getByRole("button", { name: "Lihat browser-monstera" }).click();
  await expect(
    page.getByRole("button", { name: "Tutup detail" }),
  ).toBeVisible();
  await expect(page.getByText("Mode Demo", { exact: true })).toHaveCount(0);
  await page.getByLabel("Metode", { exact: true }).fill("Pengukuran browser");
  await page.getByLabel("Kondisi tanaman", { exact: true }).fill("Sehat");
  await page
    .getByLabel("Tinggi sampel (cm)", { exact: true })
    .fill("40; 44; 42");
  await page
    .getByLabel("Catatan", { exact: true })
    .fill("Catatan tersimpan dari browser");
  await page.getByRole("button", { name: "Simpan pengamatan" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Pengamatan berhasil disimpan.",
  );
  await page.reload();
  await page.getByRole("button", { name: "Riwayat pemantauan" }).click();
  await expect(page.getByText(/Sampel acak.*3 sampel.*WIB/)).toBeVisible();
  await expect(
    page.getByText("Catatan tersimpan dari browser", { exact: true }),
  ).toBeVisible();
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

test("admin creates staff and monitors real assignments and observations", async ({
  page,
}) => {
  async function closeAssignment() {
    const modal = page.getByRole("dialog", { name: /^Penugasan / });
    if (await modal.count()) {
      await page.keyboard.press("Escape");
      await expect(modal).toHaveCount(0);
    }
  }
  const login = await page.request.post("/api/v1/auth/login", {
    headers: { Origin: "http://localhost:3101", "X-DSU-Client": "web" },
    data: {
      email: "admin@browser.example.test",
      password: "Admin-browser-2026!",
    },
  });
  expect(login.ok()).toBeTruthy();
  await page.goto("/admin/petugas");
  await expect(
    page.getByRole("heading", { name: "Petugas", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Aksi", exact: true }).first().click();
  await page
    .getByRole("button", { name: "Pantau Petugas pengujian", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Penugasan Petugas pengujian" }),
  ).toBeVisible();
  await expect(
    page.getByText("browser-monstera", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Pengamatan database pengujian", { exact: true }),
  ).toBeVisible();
  await closeAssignment();
  await expect(
    page.locator(".admin-table-actions .admin-action-trigger").first(),
  ).toBeFocused();
  const email = `new-staff-${randomUUID().slice(0, 8)}@browser.example.test`;
  await page
    .getByRole("button", { name: "Tambah petugas", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Tambah petugas", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Nama petugas", { exact: true })
    .fill("Petugas dibuat admin");
  await page.getByLabel("Surel petugas", { exact: true }).fill(email);
  await page
    .getByLabel("Kata sandi awal", { exact: true })
    .fill("New-staff-browser-2026!");
  await page
    .getByRole("button", { name: "Tambah petugas", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("berhasil dibuat");
  await expect(
    page.getByRole("heading", { name: "Penugasan Petugas dibuat admin" }),
  ).toBeVisible();
  await page.reload();
  await closeAssignment();
  await page.getByRole("textbox", { name: "Cari petugas" }).fill(email);
  await page.getByRole("button", { name: "Aksi", exact: true }).first().click();
  await page
    .getByRole("button", { name: "Pantau Petugas dibuat admin", exact: true })
    .click();
  await expect(
    page.getByText("Belum ada kelompok ditugaskan kepada petugas ini."),
  ).toBeVisible();
  await expect(
    page.getByText("Belum ada pengamatan dari petugas ini."),
  ).toBeVisible();
  await closeAssignment();
  await page
    .getByRole("textbox", { name: "Cari petugas" })
    .fill("petugas@browser.example.test");
  await page.getByRole("button", { name: "Aksi", exact: true }).first().click();
  await page
    .getByRole("button", { name: "Pantau Petugas pengujian", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Batalkan penugasan browser-monstera",
      exact: true,
    })
    .click();
  await page
    .getByRole("dialog", { name: "Batalkan penugasan?" })
    .getByRole("button", { name: "Ya, lanjutkan" })
    .click();
  await expect(
    page.getByRole("status", { name: "Status penugasan" }),
  ).toContainText("dibatalkan");
  await closeAssignment();
  await page.getByRole("textbox", { name: "Cari petugas" }).fill(email);
  await page.getByRole("button", { name: "Aksi", exact: true }).first().click();
  await page
    .getByRole("button", { name: "Pantau Petugas dibuat admin", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Kelompok untuk ditugaskan", exact: true })
    .selectOption("browser-monstera");
  await page
    .getByRole("button", { name: "Berikan penugasan", exact: true })
    .click();
  await expect(
    page.getByRole("status", { name: "Status penugasan" }),
  ).toContainText("berhasil ditugaskan");
  await expect(
    page.getByRole("button", {
      name: "Batalkan penugasan browser-monstera",
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await closeAssignment();
  await page.getByRole("textbox", { name: "Cari petugas" }).fill(email);
  await page.getByRole("button", { name: "Aksi", exact: true }).first().click();
  await page
    .getByRole("button", { name: "Pantau Petugas dibuat admin", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Batalkan penugasan browser-monstera",
      exact: true,
    }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  const assignmentModal = page.getByRole("dialog", {
    name: "Penugasan Petugas dibuat admin",
    exact: true,
  });
  await expect(assignmentModal).toBeVisible();
  const modalBounds = await assignmentModal.boundingBox();
  expect(modalBounds!.width).toBeLessThanOrEqual(390);
  expect(modalBounds!.height).toBeLessThanOrEqual(844);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  const staffLogin = await page.request.post("/api/v1/auth/login", {
    headers: { Origin: "http://localhost:3101", "X-DSU-Client": "web" },
    data: { email, password: "New-staff-browser-2026!" },
  });
  expect(staffLogin.ok()).toBeTruthy();
  expect((await staffLogin.json()).user.role).toBe("PETUGAS");
  await page.goto("/petugas");
  await expect(
    page.getByRole("button", { name: "Lihat browser-monstera", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Buka navigasi", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Navigasi petugas" })
    .getByRole("button", { name: "Riwayat pemantauan", exact: true })
    .click();
  await expect(
    page.getByText("Pengamatan database pengujian", { exact: true }),
  ).toHaveCount(0);
  await page.goto("/admin/petugas");
  await expect(
    page.getByRole("heading", { name: "Akses ditolak" }),
  ).toBeVisible();
});

test("admin saves individual growth parameters and preserves them when editing", async ({
  page,
}) => {
  const login = await page.request.post("/api/v1/auth/login", {
    headers: { Origin: "http://localhost:3101", "X-DSU-Client": "web" },
    data: {
      email: "admin@browser.example.test",
      password: "Admin-browser-2026!",
    },
  });
  expect(login.ok()).toBeTruthy();
  await page.goto("/admin/tanaman");
  await page
    .getByRole("button", { name: "Tambah tanaman", exact: true })
    .click();
  const modal = page.getByRole("dialog", {
    name: "Tambah tanaman",
    exact: true,
  });
  const id = `parameter-${randomUUID().slice(0, 8)}`;
  await modal.getByLabel("Kode tanaman *", { exact: true }).fill(id);
  await modal.getByLabel("Nama tanaman *", { exact: true }).fill(id);
  await modal
    .getByLabel("Kategori *", { exact: true })
    .selectOption({ index: 1 });
  await expect(
    modal.getByLabel("Nama parameter 1 *", { exact: true }),
  ).toHaveValue("Tinggi");
  await modal
    .getByRole("button", { name: "Tambah parameter", exact: true })
    .click();
  await modal.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(modal).toBeVisible();
  await modal
    .getByLabel("Nama parameter 3 *", { exact: true })
    .fill("Diameter batang");
  await modal.getByLabel("Satuan parameter 3 *", { exact: true }).fill("mm");
  await modal
    .getByRole("button", { name: "Hapus parameter 2", exact: true })
    .click();
  await expect(
    modal.getByLabel("Nama parameter 2 *", { exact: true }),
  ).toHaveValue("Diameter batang");
  await page.setViewportSize({ width: 390, height: 844 });
  const bounds = await modal
    .getByRole("group", { name: "Parameter pertumbuhan", exact: true })
    .boundingBox();
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await modal.getByRole("button", { name: "Simpan", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Berhasil!" })
    .getByRole("button", { name: "Mengerti" })
    .click();
  await page.reload();
  await page.getByRole("textbox", { name: "Cari data", exact: true }).fill(id);
  await page
    .getByRole("row")
    .filter({ hasText: id })
    .getByRole("button", { name: "Aksi", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Pilihan aksi", exact: true })
    .getByRole("button", { name: "Lihat / Ubah", exact: true })
    .click();
  const edit = page.getByRole("dialog", { name: "Ubah tanaman", exact: true });
  await expect(
    edit.getByLabel("Nama parameter 1 *", { exact: true }),
  ).toHaveValue("Tinggi");
  await expect(
    edit.getByLabel("Satuan parameter 1 *", { exact: true }),
  ).toHaveValue("cm");
  await expect(
    edit.getByLabel("Nama parameter 2 *", { exact: true }),
  ).toHaveValue("Diameter batang");
  await expect(
    edit.getByLabel("Satuan parameter 2 *", { exact: true }),
  ).toHaveValue("mm");
  await expect(edit.locator('input[name="parameterName"]')).toHaveCount(2);
});
