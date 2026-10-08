import { test, expect, type Page } from "@playwright/test";

async function acknowledge(page: Page, title: string) {
  const dialog = page.getByRole("dialog", { name: title, exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Mengerti" }).click();
  await expect(dialog).toBeHidden();
}

test("public routes render without JavaScript, hydration or missing-image errors", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      /Hydration failed|hydration mismatch|Invalid hook call|Rendered (more|fewer) hooks/i.test(
        message.text(),
      )
    )
      errors.push(message.text());
  });
  page.on("response", (response) => {
    if (
      response.request().resourceType() === "image" &&
      response.status() >= 400
    )
      errors.push(`Image ${response.status()}: ${response.url()}`);
  });
  for (const route of [
    "/",
    "/katalog",
    "/katalog/browser-monstera",
    "/plant-care",
    "/login",
    "/profil",
    "/checkout",
    "/akun",
    "/admin/pesanan",
    "/petugas",
  ]) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
    await expect(page.locator("main h1").first()).toBeVisible({
      timeout: 20000,
    });
  }
  expect(errors).toEqual([]);
});

test("admin beranda filters orders, updates status and fits desktop and mobile", async ({
  page,
}) => {
  const user = {
    id: "admin-browser",
    name: "Admin DSU",
    email: "admin@example.test",
    role: "ADMIN",
    phone: "",
    address: "",
  };
  const order = {
    id: "11111111-1111-4111-8111-111111111111",
    createdAt: "2026-10-04T07:00:00Z",
    expiresAt: "2026-10-05T07:00:00Z",
    status: "PAID",
    items: [
      {
        productId: "browser-monstera",
        name: "Monstera pengujian",
        quantity: 1,
        unitPrice: 85000,
      },
    ],
    total: 85000,
    contact: {
      name: "Pelanggan admin test",
      phone: "081234567890",
      address: "Jakarta",
    },
    pickupAddress: "Pamulang",
    whatsappUrl: "https://wa.me/6285893802972",
    fulfillmentMethod: "DELIVERY",
    trackingNumber: null as string | null,
    events: [],
  };
  await page.route("**/api/v1/auth/session", (route) =>
    route.fulfill({ json: { user, csrfToken: "admin-csrf" } }),
  );
  await page.route("**/api/v1/admin/orders", (route) =>
    route.fulfill({ json: [order] }),
  );
  await page.route("**/api/v1/admin/orders/*/status", async (route) => {
    const input = route.request().postDataJSON();
    expect(input.reason).toBe("Konfirmasi WhatsApp telah diverifikasi");
    expect(route.request().headers()["x-csrf-token"]).toBe("admin-csrf");
    order.status = input.status;
    if (input.trackingNumber) order.trackingNumber = input.trackingNumber;
    await route.fulfill({ json: order });
  });
  await page.route("**/api/v1/admin/dashboard?*", (route) =>
    route.fulfill({
      json: {
        metrics: { plants: 1, newOrders: 0 },
        notifications: [],
        sales: [],
        activity: [],
      },
    }),
  );
  await page.route("**/api/v1/admin/batches", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/v1/admin/products", (route) =>
    route.fulfill({
      json: [
        {
          id: "browser-monstera",
          name: "Monstera pengujian",
          category: "Hias",
          active: true,
          price: 85000,
          discountPrice: null,
          published: true,
          batches: [],
        },
      ],
    }),
  );
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Beranda" })).toBeVisible();
  await expect(page.getByText("Pesanan baru", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "docs/testing/admin-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("navigation", { name: "Navigasi admin", exact: true })
    .locator("summary")
    .filter({ hasText: "Penjualan" })
    .click();
  await page.getByRole("link", { name: "Pesanan", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Kelola pesanan" }),
  ).toBeVisible();
  await page.getByLabel("Cari pesanan").fill("tidak-ada");
  await expect(
    page.getByText("Tidak ada pesanan yang sesuai pencarian."),
  ).toBeVisible();
  await page.getByLabel("Cari pesanan").fill("Pelanggan admin test");
  await page.getByRole("button", { name: "Tindak lanjuti" }).click();
  await page
    .getByLabel("Catatan hasil konfirmasi")
    .fill("Konfirmasi WhatsApp telah diverifikasi");
  await page.getByRole("button", { name: "Simpan status" }).click();
  await page.getByRole("button", { name: "Ya, ubah status" }).click();
  await acknowledge(page, "Berhasil!");
  await expect(page.locator(".shop-order-status")).toHaveText("Diproses");
  await page.getByRole("button", { name: "Tindak lanjuti" }).click();
  await page
    .getByLabel("Catatan hasil konfirmasi")
    .fill("Konfirmasi WhatsApp telah diverifikasi");
  await page.getByRole("button", { name: "Simpan status" }).click();
  await page.getByRole("button", { name: "Ya, ubah status" }).click();
  await acknowledge(page, "Berhasil!");
  await page.getByRole("button", { name: "Tindak lanjuti" }).click();
  await expect(page.getByLabel("Status berikutnya")).toHaveValue("SHIPPED");
  await page
    .getByLabel("Catatan hasil konfirmasi")
    .fill("Konfirmasi WhatsApp telah diverifikasi");
  await page.getByRole("button", { name: "Simpan status" }).click();
  await expect(
    page.getByRole("dialog", { name: "Belum berhasil" }),
  ).toContainText("Nomor resi wajib");
  await acknowledge(page, "Belum berhasil");
  await page.getByLabel("Nomor resi (wajib)").fill("DSU-RESI-123456");
  await page.getByRole("button", { name: "Simpan status" }).click();
  await page.getByRole("button", { name: "Ya, ubah status" }).click();
  await acknowledge(page, "Berhasil!");
  await expect(page.locator(".shop-order-status")).toHaveText("Dikirim");
  await expect(
    page.getByText("DSU-RESI-123456", { exact: false }),
  ).toBeVisible();
  await page
    .getByLabel("Penyaring status pesanan")
    .selectOption("PENDING_CONFIRMATION");
  await expect(
    page.getByText("Tidak ada pesanan yang sesuai pencarian."),
  ).toBeVisible();
  await page.getByRole("link", { name: "Katalog", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Katalog", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Cari data").fill("browser-monstera");
  await expect(
    page.getByText("Monstera pengujian", { exact: true }),
  ).toBeVisible();
  for (const width of [2560, 1440, 768, 390, 280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Buka navigasi admin" }).click();
  await page.getByRole("link", { name: "Beranda", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Beranda" })).toBeVisible();
  await page.screenshot({
    path: "docs/testing/admin-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  await page.route("**/api/v1/auth/session", (route) =>
    route.fulfill({
      json: {
        user: { ...user, role: "PELANGGAN" },
        csrfToken: "customer-csrf",
      },
    }),
  );
  await page.route("**/api/v1/customer/cart", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/v1/customer/orders", (route) =>
    route.fulfill({ json: [order] }),
  );
  await page.goto("/akun");
  await page.getByRole("button", { name: "Detail pesanan" }).click();
  await expect(page.locator(".shop-order-detail")).toContainText(
    "DSU-RESI-123456",
  );
});

test("login failure uses a responsive mascot modal and supports dismissal", async ({
  page,
}) => {
  await page.route("**/api/v1/auth/login", (route) =>
    route.fulfill({
      status: 401,
      json: { error: "Surel atau kata sandi tidak sesuai." },
    }),
  );
  await page.goto("/login");
  await page
    .getByLabel("Alamat surel", { exact: true })
    .fill("test@example.com");
  await page
    .getByLabel("Kata sandi", { exact: true })
    .fill("Incorrect-password-2026!");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Belum berhasil" });
  await expect(dialog).toContainText("Surel atau kata sandi tidak sesuai.");
  await expect(dialog.locator('img[src*="maskot"]')).toBeVisible();
  for (const width of [1440, 390, 280]) {
    await page.setViewportSize({ width, height: 900 });
    const bounds = await dialog.boundingBox();
    expect(bounds?.x).toBeGreaterThanOrEqual(0);
    expect((bounds?.x || 0) + (bounds?.width || 0)).toBeLessThanOrEqual(width);
    await expect(
      dialog.getByRole("button", { name: "Mengerti" }),
    ).toBeVisible();
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await acknowledge(page, "Belum berhasil");
});

test("customer registers, persists a cart, checks out to WhatsApp, and cancels own order", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Belum punya akun? Daftar" }).click();
  await page.getByLabel("Nama lengkap").fill("Customer browser");
  await page
    .getByLabel("Alamat surel", { exact: true })
    .fill(`customer-${Date.now()}@browser.example.test`);
  await page
    .getByLabel("Kata sandi", { exact: true })
    .fill("Browser-test-2026!");
  await page.getByRole("button", { name: "Daftar & lanjutkan" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("button", { name: "Menu profil pelanggan" }).click();
  await page.getByRole("link", { name: "Ubah profil", exact: true }).click();
  await expect(page).toHaveURL(/\/profil$/, { timeout: 20000 });
  await page.getByLabel("Nomor WhatsApp", { exact: true }).fill("081234567890");
  await page
    .getByLabel("Alamat kontak", { exact: true })
    .fill("Alamat browser test Jakarta");
  await page
    .getByLabel("Provinsi", { exact: true })
    .selectOption({ label: "DKI JAKARTA" });
  await page
    .getByLabel("Kabupaten / Kota", { exact: true })
    .selectOption({ label: "KOTA JAKARTA SELATAN" });
  await page
    .getByLabel("Kecamatan", { exact: true })
    .selectOption({ label: "JAGAKARSA" });
  await page
    .getByLabel("Desa / Kelurahan", { exact: true })
    .selectOption({ label: "CIPEDAK" });
  await page.getByLabel("Kode pos", { exact: true }).fill("12630");
  await page.getByLabel("Nomor WhatsApp", { exact: true }).fill("12");
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.getByRole("button", { name: "Simpan perubahan" }).click();
    await acknowledge(page, "Belum berhasil");
  }
  await page.getByLabel("Nomor WhatsApp", { exact: true }).fill("081234567890");
  await page.getByRole("button", { name: "Simpan perubahan" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Profil berhasil diperbarui.",
  );
  await acknowledge(page, "Berhasil!");
  await page.reload();
  await expect(
    page.getByLabel("Desa / Kelurahan", { exact: true }),
  ).toHaveValue("3171010001");
  await page.goto("/katalog/browser-monstera");
  await expect(
    page.getByRole("heading", { name: "Monstera pengujian", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tambah ke keranjang" }).click();
  await acknowledge(page, "Tanaman ditambahkan");
  await page.getByRole("button", { name: "Keranjang, 1 tanaman" }).click();
  const floatingCart = page.locator("#ringkasan-keranjang");
  await floatingCart
    .getByRole("button", { name: "Tambah Monstera pengujian" })
    .click();
  await expect(floatingCart.getByText("2", { exact: true })).toBeVisible();
  await floatingCart
    .getByRole("button", { name: "Kurangi Monstera pengujian" })
    .click();
  await floatingCart
    .getByRole("button", { name: "Hapus Monstera pengujian" })
    .click();
  await expect(
    floatingCart.getByText("Keranjang Anda masih kosong."),
  ).toBeVisible();
  await page.goto("/katalog/browser-monstera");
  await page.getByRole("button", { name: "Tambah ke keranjang" }).click();
  await acknowledge(page, "Tanaman ditambahkan");
  await page.goto("/keranjang");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Monstera pengujian" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tambah Monstera pengujian" }).click();
  await expect(page.locator(".shop-quantity span")).toHaveText("2");
  await page
    .getByRole("button", { name: "Kurangi Monstera pengujian" })
    .click();
  await expect(page.locator(".shop-quantity span")).toHaveText("1");
  await page.getByRole("button", { name: "Hapus Monstera pengujian" }).click();
  await expect(
    page.getByRole("heading", { name: "Keranjang masih kosong" }),
  ).toBeVisible();
  await page.goto("/katalog/browser-monstera");
  await page.getByRole("button", { name: "Tambah ke keranjang" }).click();
  await acknowledge(page, "Tanaman ditambahkan");
  await page.goto("/keranjang");
  await page.getByRole("link", { name: "Lanjutkan pemesanan" }).click();
  await expect(page.getByLabel("Nama penerima")).toHaveValue(
    "Customer browser",
  );
  await expect(page.getByLabel("Nomor WhatsApp / telepon")).toHaveValue(
    "081234567890",
  );
  await expect(page.getByLabel("Alamat kontak")).toBeHidden();
  await expect(page.getByLabel("Kode pos")).toBeHidden();
  await page.getByLabel("Kirim ke lokasi Anda").check();
  await expect(page.getByLabel("Alamat kontak")).toBeVisible();
  await expect(page.getByLabel("Alamat kontak")).toHaveValue(
    "Alamat browser test Jakarta",
  );
  await expect(page.getByLabel("Provinsi")).toHaveValue("31");
  await expect(page.getByLabel("Kabupaten / Kota")).toHaveValue("3171");
  await expect(page.getByLabel("Kecamatan")).toHaveValue("3171010");
  await expect(page.getByLabel("Desa / Kelurahan")).toHaveValue("3171010001");
  await expect(page.getByLabel("Kode pos")).toHaveValue("12630");
  await expect(
    page.getByText("Harga Total belum termasuk ongkir", { exact: true }),
  ).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByLabel("Alamat kontak").fill("");
  await page.getByRole("button", { name: "Buat pesanan", exact: true }).click();
  const addressError = page.getByRole("dialog", {
    name: "Periksa data penerima",
  });
  await expect(addressError).toContainText("Isi alamat kontak");
  await acknowledge(page, "Periksa data penerima");
  await page.getByRole("button", { name: "Buat pesanan", exact: true }).click();
  await expect(addressError).toContainText("Isi alamat kontak");
  await acknowledge(page, "Periksa data penerima");
  await page.getByLabel("Alamat kontak").fill("Alamat browser test Jakarta");
  await page.getByRole("button", { name: "Buat pesanan", exact: true }).click();
  const createdDialog = page.getByRole("dialog", {
    name: "Pesanan berhasil dibuat",
    exact: true,
  });
  await expect(createdDialog).toBeVisible();
  await expect(
    createdDialog.getByRole("button", { name: "Tutup notifikasi" }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(createdDialog).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(createdDialog).toBeVisible();
  const confirmWhatsApp = createdDialog.getByRole("link", {
    name: "Konfirmasi pesanan ke WhatsApp",
  });
  await expect(confirmWhatsApp).toHaveAttribute(
    "href",
    /^https:\/\/wa.me\/6285893802972\?text=/,
  );
  await page
    .context()
    .route("https://wa.me/**", (route) =>
      route.fulfill({ body: "WhatsApp confirmation" }),
    );
  const popupPromise = page.waitForEvent("popup");
  await confirmWhatsApp.click();
  const popup = await popupPromise;
  await popup.waitForLoadState();
  expect(popup.url()).toMatch(/^https:\/\/wa.me\/6285893802972\?text=/);
  await popup.close();
  await expect(createdDialog).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Pesanan berhasil dibuat" }),
  ).toBeVisible();
  const whatsapp = page.getByRole("link", { name: "Konfirmasi via WhatsApp" });
  await expect(whatsapp).toHaveAttribute(
    "href",
    /^https:\/\/wa.me\/6285893802972\?text=/,
  );
  await page.getByRole("link", { name: "Lihat pesanan saya" }).click();
  await expect(page).toHaveURL(/\/akun$/, { timeout: 20000 });
  await page.reload();
  await expect(whatsapp).toBeVisible();
  await page.getByRole("button", { name: "Detail pesanan" }).click();
  await expect(
    page
      .locator(".shop-order-detail p")
      .filter({ hasText: "Metode: Kirim ke lokasi Anda" }),
  ).toBeVisible();
  await page
    .getByLabel("Alasan pembatalan")
    .fill("Pembatalan pada pengujian browser");
  await page.getByRole("button", { name: "Batalkan pesanan" }).click();
  const cancelDialog = page.getByRole("dialog", { name: "Batalkan pesanan?" });
  await cancelDialog
    .getByRole("button", { name: "Batal", exact: true })
    .click();
  await expect(page.locator(".shop-order-status")).toHaveText(
    "Menunggu pembayaran",
  );
  await page.getByRole("button", { name: "Batalkan pesanan" }).click();
  await cancelDialog.getByRole("button", { name: "Ya, batalkan" }).click();
  await acknowledge(page, "Pesanan dibatalkan");
  await expect(page.locator(".shop-order-status")).toHaveText("Dibatalkan");
  await page.goto("/admin/pesanan");
  await expect(
    page.getByRole("heading", { name: "Akses ditolak" }),
  ).toBeVisible();
  await page.goto("/akun");
  await page.getByRole("button", { name: "Menu profil pelanggan" }).click();
  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  const logoutDialog = page.getByRole("dialog", { name: "Yakin mau keluar?" });
  await expect(logoutDialog).toBeVisible();
  await logoutDialog
    .getByRole("button", { name: "Batal", exact: true })
    .click();
  await expect(logoutDialog).toBeHidden();
  await page.getByRole("button", { name: "Menu profil pelanggan" }).click();
  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  await logoutDialog
    .getByRole("button", { name: "Ya, keluar", exact: true })
    .click();
  await expect(logoutDialog).toBeHidden();
  await page.goto("/akun");
  await expect(
    page.getByRole("heading", { name: "Masuk untuk melanjutkan" }),
  ).toBeVisible();
});

test("temporary background refresh failure preserves the signed-in profile draft", async ({
  page,
}) => {
  await page.route("**/api/v1/auth/session", (route) =>
    route.fulfill({
      json: {
        user: {
          id: "audit-profile",
          name: "Pelanggan audit",
          email: "audit@example.test",
          role: "PELANGGAN",
          phone: "081234567890",
          address: "Alamat lengkap Pamulang",
        },
        csrfToken: "audit-token",
      },
    }),
  );
  await page.route("**/api/v1/customer/cart", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/v1/customer/orders", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.goto("/profil");
  const name = page.getByLabel("Nama lengkap", { exact: true });
  await expect(name).toHaveValue("Pelanggan audit");
  await name.fill("Draf profil belum disimpan");
  await page.route("**/api/v1/catalog", (route) =>
    route.fulfill({
      status: 503,
      json: { error: "Layanan sementara tidak tersedia." },
    }),
  );
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByRole("dialog")).toContainText(
    "Layanan sementara tidak tersedia.",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Mengerti" })
    .click();
  await expect(name).toHaveValue("Draf profil belum disimpan");
  await expect(
    page.getByRole("button", { name: "Menu profil pelanggan" }),
  ).toBeVisible();
});

test("reference theme works at desktop and mobile widths", async ({ page }) => {
  for (const width of [2560, 1440, 1024, 768, 390, 320, 280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Solusi Tanaman/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Monstera pengujian" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `docs/testing/customer-real-${width}.png`,
      fullPage: true,
    });
  }
});
