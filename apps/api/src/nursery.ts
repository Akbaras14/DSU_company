import { z } from "zod";
import { db, transaction } from "./db.js";
import { HttpError } from "./http.js";
import { audit } from "./audit.js";
import { requireMedia } from "./media.js";

export async function nursery(assignedTo?: string) {
  const batches = await db.batch.findMany({
    where: assignedTo ? { assignedTo, status: { not: "ARCHIVED" } } : {},
    include: { product: true },
    orderBy: { id: "asc" },
  });
  const observations = await db.observation.findMany({
    where: {
      batchId: { in: batches.map((b) => b.id) },
      ...(assignedTo ? { observedBy: assignedTo } : {}),
    },
    orderBy: { observedAt: "desc" },
  });
  return {
    batches: batches.map(({ product, plantedAt, ...batch }) => ({
      ...batch,
      species: product.name,
      category: product.category,
      plantedAt: plantedAt?.toISOString() ?? null,
    })),
    observations,
  };
}

export const observationInput = z
  .object({
    method: z.string().trim().min(2).max(100),
    condition: z.string().trim().min(2).max(100),
    notes: z.string().trim().max(1000),
    heights: z.array(z.number().finite().positive().max(10000)).min(1).max(100),
    health: z
      .enum(["HEALTHY", "NEEDS_ATTENTION", "CRITICAL"])
      .default("HEALTHY"),
    leafCounts: z
      .array(z.number().int().nonnegative().max(10000))
      .max(100)
      .optional(),
    photoUrl: z.string().max(500).nullable().optional(),
    correctionOf: z.string().uuid().nullable().optional(),
  })
  .strict();

export async function observe(batchId: string, actorId: string, body: unknown) {
  const input = observationInput.parse(body);
  if (input.leafCounts && input.leafCounts.length !== input.heights.length)
    throw new HttpError(422, "Jumlah sampel daun dan tinggi harus sama.");
  if (input.photoUrl) await requireMedia(input.photoUrl, "monitoring", actorId);
  return transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM Batch WHERE id = ${batchId} FOR UPDATE`;
    const batch = await tx.batch.findUnique({ where: { id: batchId } });
    if (!batch || batch.assignedTo !== actorId || batch.status === "ARCHIVED")
      throw new HttpError(404, "Kelompok tidak ditemukan dalam penugasan Anda.");
    if (
      input.correctionOf &&
      !(await tx.observation.findFirst({
        where: { id: input.correctionOf, batchId, observedBy: actorId },
      }))
    )
      throw new HttpError(404, "Pengamatan yang dikoreksi tidak ditemukan.");
    const row = await tx.observation.create({
      data: {
        batchId,
        observedBy: actorId,
        method: input.method,
        condition: input.condition,
        notes: input.notes,
        health: input.health,
        photoUrl: input.photoUrl,
        correctionOf: input.correctionOf,
        sampleCount: input.heights.length,
        measurements: [
          ...input.heights.map((value, i) => ({
            sampleNumber: i + 1,
            parameter: "Tinggi",
            unit: "cm",
            value,
          })),
          ...(input.leafCounts?.map((value, i) => ({
            sampleNumber: i + 1,
            parameter: "Jumlah daun",
            unit: "daun",
            value,
          })) ?? []),
        ],
      },
    });
    await audit(
      actorId,
      input.correctionOf ? "CORRECT_MONITORING" : "CREATE_MONITORING",
      "Observation",
      row.id,
      null,
      row,
      input.notes || "Pemantauan lapangan",
      tx,
      "PETUGAS",
    );
    return row;
  });
}

export async function assign(batchId: string, body: unknown, actorId: string) {
  const input = z
    .object({ assignedTo: z.string().uuid().nullable() })
    .strict()
    .parse(body);
  return transaction(async (tx) => {
    if (input.assignedTo) {
      const user = await tx.user.findUnique({
        where: { id: input.assignedTo },
      });
      if (!user?.active || user.role !== "PETUGAS")
        throw new HttpError(400, "Pilih akun petugas aktif.");
    }
    const before = await tx.batch.findUniqueOrThrow({ where: { id: batchId } });
    if (before.status === "ARCHIVED")
      throw new HttpError(409, "Kelompok diarsipkan tidak dapat ditugaskan.");
    const row = await tx.batch.update({ where: { id: batchId }, data: input });
    await audit(
      actorId,
      "ASSIGN_BATCH",
      "Batch",
      batchId,
      { assignedTo: before.assignedTo },
      input,
      "Mengubah penugasan petugas",
      tx,
    );
    return row;
  });
}

export async function requestReadiness(
  batchId: string,
  actorId: string,
  body: unknown,
) {
  const input = z
    .object({
      observationId: z.string().uuid(),
      quantity: z.number().int().positive().max(1000000),
      reason: z.string().trim().min(5).max(1000),
    })
    .strict()
    .parse(body);
  return transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM Batch WHERE id = ${batchId} FOR UPDATE`;
    const batch = await tx.batch.findUnique({ where: { id: batchId } });
    if (!batch || batch.assignedTo !== actorId || batch.status === "ARCHIVED")
      throw new HttpError(404, "Kelompok tidak ditemukan dalam penugasan Anda.");
    const observation = await tx.observation.findFirst({
      where: { id: input.observationId, batchId, observedBy: actorId },
    });
    if (!observation || observation.health !== "HEALTHY")
      throw new HttpError(
        409,
        "Pengajuan memerlukan pengamatan tanaman sehat milik Anda.",
      );
    if (input.quantity > batch.physical - batch.approved)
      throw new HttpError(
        409,
        "Jumlah pengajuan melebihi tanaman yang belum disetujui.",
      );
    if (
      await tx.readinessApproval.count({
        where: { batchId, status: "PENDING" },
      })
    )
      throw new HttpError(
        409,
        "Kelompok sudah memiliki pengajuan yang belum ditinjau.",
      );
    const row = await tx.readinessApproval.create({
      data: { ...input, batchId, requestedBy: actorId },
    });
    await tx.batch.update({
      where: { id: batchId },
      data: { status: "READY_REVIEW" },
    });
    await audit(
      actorId,
      "READY_FOR_SALE_REQUEST",
      "ReadinessApproval",
      row.id,
      null,
      row,
      input.reason,
      tx,
      "PETUGAS",
    );
    return row;
  });
}
