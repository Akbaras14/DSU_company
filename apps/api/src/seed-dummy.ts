import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { parse } from "dotenv";
import { db, transaction } from "./db.js";
import { config } from "./config.js";
import { hashPassword, verifyPassword } from "./auth.js";
import type {
  OrderStatus,
  PaymentStatus,
  ReservationStatus,
} from "@prisma/client";

const uuid = (n: number) =>
  `d5010000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const marker = uuid(999);
const prefix = "dummy-project-";
const now = new Date();
const daysAgo = (days: number) => new Date(now.getTime() - days * 86400000);
const accounts = [
  {
    key: "ADMIN",
    name: "Admin Dummy",
    role: "ADMIN",
    email: "admin@dummy.dsu.local",
  },
  {
    key: "PETUGAS_1",
    name: "Budi Petugas Dummy",
    role: "PETUGAS",
    email: "budi@dummy.dsu.local",
  },
  {
    key: "PETUGAS_2",
    name: "Sari Petugas Dummy",
    role: "PETUGAS",
    email: "sari@dummy.dsu.local",
  },
  {
    key: "PELANGGAN_1",
    name: "Andi Pelanggan Dummy",
    role: "PELANGGAN",
    email: "andi@dummy.dsu.local",
  },
  {
    key: "PELANGGAN_2",
    name: "Rina Pelanggan Dummy",
    role: "PELANGGAN",
    email: "rina@dummy.dsu.local",
  },
] as const;
const plants = [
  {
    slug: "monstera",
    name: "Monstera deliciosa",
    category: "Tanaman hias",
    price: 85000,
    quantity: 80,
    ready: true,
    image: "monstera.jpg",
  },
  {
    slug: "tabebuya",
    name: "Tabebuya rosea",
    category: "Tanaman peneduh",
    price: 60000,
    quantity: 60,
    ready: true,
    image: "tabebuya.jpg",
  },
  {
    slug: "jambu",
    name: "Jambu kristal",
    category: "Tanaman buah",
    price: 35000,
    quantity: 40,
    ready: true,
  },
  {
    slug: "mangga",
    name: "Mangga arumanis",
    category: "Tanaman buah",
    price: 45000,
    quantity: 50,
    approval: "PENDING",
  },
  {
    slug: "durian",
    name: "Durian montong",
    category: "Tanaman buah",
    price: 75000,
    quantity: 35,
    approval: "REJECTED",
  },
  {
    slug: "alpukat",
    name: "Alpukat aligator",
    category: "Tanaman buah",
    price: 50000,
    quantity: 40,
  },
  {
    slug: "jeruk",
    name: "Jeruk siam",
    category: "Tanaman buah",
    price: 30000,
    quantity: 25,
    health: "NEEDS_ATTENTION",
  },
  {
    slug: "pucuk-merah",
    name: "Pucuk merah",
    category: "Tanaman peneduh",
    price: 18000,
    quantity: 20,
    health: "CRITICAL",
  },
  {
    slug: "sirsak",
    name: "Sirsak madu",
    category: "Tanaman buah",
    price: 25000,
    quantity: 30,
    noObservation: true,
  },
  {
    slug: "monstera-mini",
    name: "Monstera mini",
    category: "Tanaman hias",
    price: 55000,
    quantity: 5,
    ready: true,
    image: "monstera.jpg",
  },
] as const;
const scenarios: {
  status: OrderStatus;
  plant: number;
  quantity: number;
  reservation: ReservationStatus;
  customer: number;
  payment?: PaymentStatus;
  delivery?: boolean;
  events: OrderStatus[];
}[] = [
  {
    status: "PENDING_PAYMENT",
    plant: 0,
    quantity: 2,
    reservation: "ACTIVE",
    customer: 3,
    events: ["PENDING_PAYMENT"],
  },
  {
    status: "WAITING_VERIFICATION",
    plant: 1,
    quantity: 3,
    reservation: "ACTIVE",
    customer: 4,
    payment: "WAITING",
    events: ["PENDING_PAYMENT", "WAITING_VERIFICATION"],
  },
  {
    status: "PROCESSING",
    plant: 0,
    quantity: 3,
    reservation: "FULFILLED",
    customer: 3,
    payment: "VERIFIED",
    events: ["PENDING_PAYMENT", "WAITING_VERIFICATION", "PAID", "PROCESSING"],
  },
  {
    status: "SHIPPED",
    plant: 1,
    quantity: 2,
    reservation: "FULFILLED",
    customer: 4,
    payment: "VERIFIED",
    delivery: true,
    events: [
      "PENDING_PAYMENT",
      "WAITING_VERIFICATION",
      "PAID",
      "READY_TO_SHIP",
      "SHIPPED",
    ],
  },
  {
    status: "COMPLETED",
    plant: 2,
    quantity: 2,
    reservation: "FULFILLED",
    customer: 3,
    payment: "VERIFIED",
    events: [
      "PENDING_PAYMENT",
      "WAITING_VERIFICATION",
      "PAID",
      "READY_FOR_PICKUP",
      "COMPLETED",
    ],
  },
  {
    status: "CANCELLED",
    plant: 2,
    quantity: 1,
    reservation: "RELEASED",
    customer: 4,
    events: ["PENDING_PAYMENT", "CANCELLED"],
  },
  {
    status: "PAYMENT_REJECTED",
    plant: 0,
    quantity: 1,
    reservation: "ACTIVE",
    customer: 3,
    payment: "REJECTED",
    events: ["PENDING_PAYMENT", "WAITING_VERIFICATION", "PAYMENT_REJECTED"],
  },
];

try {
  const url = new URL(config.DATABASE_URL);
  if (
    config.NODE_ENV !== "development" ||
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    url.pathname !== "/db_dsu"
  )
    throw new Error("Seed dummy hanya untuk MySQL pengembangan lokal db_dsu.");
  if (await db.auditLog.findUnique({ where: { id: marker } })) {
    console.info(
      "Data dummy sudah pernah dibuat. Data, stok, dan kata sandi tidak diubah.",
    );
  } else {
    assert.equal(
      await db.product.count({ where: { id: { startsWith: prefix } } }),
      0,
      "ID produk dummy sudah digunakan; seed dibatalkan.",
    );
    assert.equal(
      await db.user.count({
        where: {
          OR: [
            { id: { in: accounts.map((_, i) => uuid(i + 1)) } },
            { email: { in: accounts.map((a) => a.email) } },
          ],
        },
      }),
      0,
      "Akun dummy sudah digunakan; seed dibatalkan.",
    );
    const credentialPath = new URL(
      "../../../.env.dummy.local",
      import.meta.url,
    );
    let credentials: Record<string, string>;
    try {
      credentials = parse(await readFile(credentialPath, "utf8"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      credentials = Object.fromEntries(
        accounts.flatMap((a) => [
          [`${a.key}_EMAIL`, a.email],
          [`${a.key}_PASSWORD`, randomBytes(24).toString("base64url")],
        ]),
      );
      await writeFile(
        credentialPath,
        accounts
          .map(
            (a) =>
              `${a.key}_EMAIL="${a.email}"\n${a.key}_PASSWORD="${credentials[`${a.key}_PASSWORD`]}"\n`,
          )
          .join("\n"),
        { flag: "wx", mode: 0o600 },
      );
    }
    const hashes = await Promise.all(
      accounts.map(async (a) => {
        const password = credentials[`${a.key}_PASSWORD`];
        assert.equal(credentials[`${a.key}_EMAIL`], a.email);
        assert.ok(
          password && password.length >= 10,
          "Kredensial dummy tidak lengkap.",
        );
        const hash = await hashPassword(password);
        assert.ok(await verifyPassword(password, hash));
        return hash;
      }),
    );
    const uploadDirectory = new URL("../uploads/", import.meta.url);
    await mkdir(uploadDirectory, { recursive: true });
    const proof = await readFile(
      new URL("../../../scripts/fixtures/dummy-payment.png", import.meta.url),
    );
    for (const [i, scenario] of scenarios.entries()) {
      if (!scenario.payment) continue;
      const file = `${uuid(500 + i)}.png`;
      // Fixed IDs belong only to this seed; existing uploads are never overwritten.
      for (const [name, bytes] of [
        [file, proof],
        [
          `${file}.json`,
          Buffer.from(
            JSON.stringify({
              ownerId: uuid(scenario.customer + 1),
              purpose: "payment",
            }),
          ),
        ],
      ] as const) {
        try {
          await writeFile(new URL(name, uploadDirectory), bytes, {
            flag: "wx",
          });
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        }
      }
    }
    await transaction(async (tx) => {
      for (const [i, account] of accounts.entries()) {
        await tx.user.create({
          data: {
            id: uuid(i + 1),
            email: account.email,
            name: account.name,
            role: account.role,
            passwordHash: hashes[i],
            phone: `08000000000${i}`,
            address:
              "Alamat simulasi data dummy, bukan alamat pengiriman nyata.",
          },
        });
      }
      await tx.systemSettings.upsert({
        where: { id: 1 },
        create: {
          id: 1,
          companyName: "CV. Delta Sinergi Utama",
          address: config.PICKUP_ADDRESS,
          phone: config.WHATSAPP_NUMBER,
        },
        update: {},
      });
      for (const name of new Set(plants.map((p) => p.category)))
        await tx.category.upsert({
          where: { name },
          create: { name },
          update: {},
        });
      for (let i = 0; i < 3; i++)
        await tx.nurseryLocation.create({
          data: {
            id: `${prefix}area-${i + 1}`,
            name: `[Dummy] Area ${["pembibitan", "naungan", "siap jual"][i]}`,
            description: "Lokasi simulasi untuk data dummy.",
            capacity: 300,
          },
        });

      for (const [i, plant] of plants.entries()) {
        const sold = scenarios
          .filter((s) => s.plant === i && s.reservation === "FULFILLED")
          .reduce((n, s) => n + s.quantity, 0);
        const reserved = scenarios
          .filter((s) => s.plant === i && s.reservation === "ACTIVE")
          .reduce((n, s) => n + s.quantity, 0);
        const ready = "ready" in plant && plant.ready;
        const physical = plant.quantity - sold;
        const approved = ready ? physical : 0;
        assert.ok(physical >= approved && approved >= reserved);
        const productId = prefix + plant.slug;
        const batchId = `${productId}-01`;
        const staffId = uuid(2 + (i % 2));
        const pending = "approval" in plant && plant.approval === "PENDING";
        await tx.product.create({
          data: {
            id: productId,
            name: `[Dummy] ${plant.name}`,
            category: plant.category,
            description: `Data dummy ${plant.name} untuk mencoba katalog dan operasional pembibitan. Bukan produk atau stok perusahaan yang sebenarnya.`,
            price: plant.price,
            imageUrl: "image" in plant ? `/images/plants/${plant.image}` : null,
            published: ready,
            catalogStatus: ready ? "PUBLISHED" : "DRAFT",
            publishedAt: ready ? daysAgo(5) : null,
            featured: ready && i < 2,
            minimumStock: 8,
            parameters: [
              { name: "Tinggi", unit: "cm" },
              { name: "Jumlah daun", unit: "helai" },
            ],
            batches: {
              create: {
                id: batchId,
                location: `[Dummy] Area ${["pembibitan", "naungan", "siap jual"][i % 3]}`,
                initialQuantity: plant.quantity,
                physical,
                approved,
                sold,
                reserved,
                publishedStock: ready ? approved - reserved : 0,
                status: pending
                  ? "READY_REVIEW"
                  : sold
                    ? "PARTIALLY_SOLD"
                    : ready
                      ? "READY_FOR_SALE"
                      : "MONITORING",
                assignedTo: staffId,
                plantedAt: daysAgo(35 + i * 7),
                enteredAt: daysAgo(30),
                notes: "Data dummy penugasan, bukan inventori nyata.",
                transactions: {
                  create: {
                    id: uuid(600 + i),
                    reference: `DUMMY:RECEIPT:${batchId}`,
                    actorId: uuid(1),
                    kind: "RECEIPT",
                    quantity: plant.quantity,
                    beforeQuantity: 0,
                    afterQuantity: plant.quantity,
                    reason: "Penerimaan stok dummy untuk simulasi lokal.",
                    createdAt: daysAgo(30),
                  },
                },
              },
            },
          },
        });
        if (!("noObservation" in plant)) {
          const health = "health" in plant ? plant.health : "HEALTHY";
          const observedAt = daysAgo(i === 5 ? 12 : 2);
          await tx.observation.create({
            data: {
              id: uuid(100 + i),
              batchId,
              observedBy: staffId,
              observedAt,
              method: "Sampel acak",
              sampleCount: 3,
              measurements: [0, 1, 2].flatMap((n) => [
                {
                  sampleNumber: n + 1,
                  parameter: "Tinggi",
                  unit: "cm",
                  value: 35 + i * 2 + n * 3,
                },
                {
                  sampleNumber: n + 1,
                  parameter: "Jumlah daun",
                  unit: "helai",
                  value: 8 + n,
                },
              ]),
              health,
              condition:
                health === "HEALTHY"
                  ? "Daun sehat dan pertumbuhan baik"
                  : health === "CRITICAL"
                    ? "Daun layu, perlu penanganan"
                    : "Daun menguning, perlu pemantauan",
              notes: "Pengamatan dummy untuk simulasi petugas.",
              photoUrl:
                "image" in plant ? `/images/plants/${plant.image}` : null,
            },
          });
          if (ready || "approval" in plant) {
            const status = ready
              ? "APPROVED"
              : "approval" in plant
                ? plant.approval
                : "PENDING";
            await tx.readinessApproval.create({
              data: {
                id: uuid(200 + i),
                batchId,
                observationId: uuid(100 + i),
                requestedBy: staffId,
                quantity: ready ? plant.quantity : 15,
                status,
                reason:
                  status === "REJECTED"
                    ? "[Dummy] Lanjutkan pemantauan sebelum dijual."
                    : status === "APPROVED"
                      ? "[Dummy] Tanaman sehat, disetujui untuk katalog."
                      : "[Dummy] Mohon periksa kesiapan tanaman untuk dijual.",
                createdAt: observedAt,
                reviewedBy: status === "PENDING" ? null : uuid(1),
                reviewedAt: status === "PENDING" ? null : daysAgo(1),
              },
            });
          }
        }
      }

      for (const [i, s] of scenarios.entries()) {
        const plant = plants[s.plant],
          productId = prefix + plant.slug,
          batchId = `${productId}-01`,
          orderId = uuid(300 + i),
          reservationId = uuid(400 + i);
        const customer = accounts[s.customer];
        const createdAt = new Date(now.getTime() - (i + 1) * 3600000);
        const shippingCost = s.delivery ? 25000 : 0;
        await tx.order.create({
          data: {
            id: orderId,
            userId: uuid(s.customer + 1),
            idempotencyKey: `dummy-project-order-${i}`,
            requestHash: createHash("sha256")
              .update(`dummy-project-order-${i}`)
              .digest("hex"),
            status: s.status,
            total: plant.price * s.quantity,
            contactName: customer.name,
            contactPhone: `08000000000${s.customer}`,
            contactAddress:
              "[Dummy] Alamat simulasi, jangan digunakan untuk pengiriman nyata.",
            fulfillmentMethod: s.delivery ? "DELIVERY" : "PICKUP",
            trackingNumber: s.delivery ? "DUMMY-RESI-0001" : null,
            shippingCost,
            whatsappNumber: config.WHATSAPP_NUMBER,
            pickupAddress:
              config.PICKUP_ADDRESS || "Lokasi pengambilan simulasi dummy",
            createdAt,
            expiresAt: new Date(now.getTime() + 24 * 3600000),
            items: {
              create: {
                name: `[Dummy] ${plant.name}`,
                productId,
                unitPrice: plant.price,
                quantity: s.quantity,
              },
            },
            reservations: {
              create: {
                id: reservationId,
                batchId,
                quantity: s.quantity,
                status: s.reservation,
              },
            },
            events: {
              create: s.events.map((status, j) => ({
                actorId: j < 2 ? uuid(s.customer + 1) : uuid(1),
                status,
                reason:
                  "[Dummy] Simulasi tahapan pesanan; bukan transaksi nyata.",
                createdAt: new Date(createdAt.getTime() + j * 60000),
              })),
            },
            ...(s.payment
              ? {
                  payment: {
                    create: {
                      amount: plant.price * s.quantity + shippingCost,
                      method: "Transfer simulasi dummy",
                      proofUrl: `/api/v1/media/${uuid(500 + i)}.png`,
                      status: s.payment,
                      reason:
                        "[Dummy] Simulasi pembayaran, tidak ada transfer uang nyata.",
                      paidAt: createdAt,
                      verifiedBy: s.payment === "WAITING" ? null : uuid(1),
                      reviewedAt:
                        s.payment === "WAITING"
                          ? null
                          : new Date(createdAt.getTime() + 120000),
                    },
                  },
                }
              : {}),
          },
        });
        await tx.inventoryTransaction.create({
          data: {
            reference: `RESERVE:${orderId}:${batchId}`,
            batchId,
            actorId: uuid(s.customer + 1),
            kind: "RESERVATION",
            quantity: s.quantity,
            reason: `[Dummy] Reservasi ${orderId}`,
            createdAt,
          },
        });
        if (s.reservation !== "ACTIVE")
          await tx.inventoryTransaction.create({
            data: {
              reference: `${s.reservation === "FULFILLED" ? "FULFILL" : "RELEASE"}:${reservationId}`,
              batchId,
              actorId: uuid(1),
              kind:
                s.reservation === "FULFILLED" ? "SALE" : "RESERVATION_RELEASE",
              quantity: s.quantity,
              reason: `[Dummy] ${s.status}`,
              createdAt: new Date(createdAt.getTime() + 120000),
            },
          });
      }
      await tx.cartItem.create({
        data: {
          userId: uuid(4),
          productId: prefix + plants[0].slug,
          quantity: 1,
        },
      });
      await tx.cartItem.create({
        data: {
          userId: uuid(5),
          productId: prefix + plants[1].slug,
          quantity: 2,
        },
      });
      await tx.auditLog.create({
        data: {
          id: marker,
          actorId: uuid(1),
          role: "ADMIN",
          action: "SEED_DUMMY",
          entity: "Project",
          entityId: "dummy-project-v1",
          description:
            "Data dummy lokal: 5 akun, 10 tanaman, 10 penugasan, 9 pengamatan, 6 pengajuan, 7 pesanan, 5 pembayaran. Bukan data perusahaan nyata.",
        },
      });

      const batches = await tx.batch.findMany({
        where: { id: { startsWith: prefix } },
        include: { reservations: true },
      });
      assert.equal(batches.length, 10);
      for (const batch of batches) {
        assert.equal(
          batch.reserved,
          batch.reservations
            .filter((r) => r.status === "ACTIVE")
            .reduce((n, r) => n + r.quantity, 0),
        );
        assert.equal(
          batch.sold,
          batch.reservations
            .filter((r) => r.status === "FULFILLED")
            .reduce((n, r) => n + r.quantity, 0),
        );
        assert.equal(batch.physical + batch.sold, batch.initialQuantity);
        assert.ok(
          batch.physical >= batch.approved && batch.approved >= batch.reserved,
        );
        assert.ok(
          (batch.publishedStock ?? 0) <= batch.approved - batch.reserved,
        );
      }
      assert.equal(
        await tx.order.count({
          where: { id: { in: scenarios.map((_, i) => uuid(300 + i)) } },
        }),
        7,
      );
    });
    console.info(
      "Data dummy berhasil dimasukkan: 5 akun, 10 tanaman dan penugasan, 9 pengamatan, 6 pengajuan jual, 7 pesanan, 5 pembayaran, 2 keranjang.",
    );
    console.info(
      "Stok fisik, reservasi dan penjualan telah diverifikasi. Data sebelumnya tidak diubah.",
    );
  }
  console.info(
    "Kredensial akun dummy: .env.dummy.local (kata sandi tidak ditampilkan di log).",
  );
} finally {
  await db.$disconnect();
}
