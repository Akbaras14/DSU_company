process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || "mysql://root@127.0.0.1:3306/db_dsu_test";
process.env.NODE_ENV = "test";
process.env.WEB_ORIGIN = "http://localhost:3101";
if (!new URL(process.env.DATABASE_URL).pathname.endsWith("_test"))
  throw new Error("Browser tests require an isolated _test database.");
const { db } = await import("../apps/api/src/db.js");
const { app } = await import("../apps/api/src/app.js");
const fixture = "browser-monstera";
const oldUsers = await db.user.findMany({
  where: { email: { endsWith: "@browser.example.test" } },
  select: { id: true },
});
const userIds = oldUsers.map((u) => u.id);
const oldOrders = await db.order.findMany({
  where: { userId: { in: userIds } },
  select: { id: true },
});
const orderIds = oldOrders.map((o) => o.id);
await db.orderEvent.deleteMany({ where: { orderId: { in: orderIds } } });
await db.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
await db.reservation.deleteMany({ where: { orderId: { in: orderIds } } });
await db.inventoryTransaction.deleteMany({ where: { batchId: fixture } });
await db.order.deleteMany({ where: { id: { in: orderIds } } });
await db.user.deleteMany({ where: { id: { in: userIds } } });
await db.batch.deleteMany({ where: { id: fixture } });
await db.product.deleteMany({ where: { id: fixture } });
await db.province.createMany({
  data: [{ id: "31", name: "DKI JAKARTA" }],
  skipDuplicates: true,
});
await db.regency.createMany({
  data: [{ id: "3171", provinceId: "31", name: "KOTA JAKARTA SELATAN" }],
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
await db.product.create({
  data: {
    id: fixture,
    name: "Monstera pengujian",
    category: "Tanaman hias",
    description: "Data untuk pengujian browser pada database terpisah.",
    price: 85000,
    published: true,
    imageUrl: "/images/plants/monstera.jpg",
    batches: {
      create: {
        id: fixture,
        location: "Area pengujian",
        physical: 20,
        approved: 20,
      },
    },
  },
});
const server = app.listen(4101, "127.0.0.1", () =>
  console.info("Customer test API ready on 4101"),
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.once(signal, () =>
    server.close(() => {
      void db.$disconnect().then(() => process.exit(0));
    }),
  );
