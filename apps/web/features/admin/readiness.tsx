"use client";
import { indonesianLabel, localDateTime } from "@/lib/format";
import { useRef, useState } from "react";
import type { Observation, ReviewStatus } from "@dsu/contracts";
import { useShop } from "@/features/storefront/provider";
import { Button } from "@/components/ui/button";

export interface StaffApproval {
  id: string;
  batchId: string;
  observationId: string;
  status: ReviewStatus;
  reason: string;
  quantity: number;
  createdAt: string;
  reviewedAt: string | null;
}

export function ReadinessForm({
  batchId,
  observations,
  approvals,
  maxQuantity,
  onSubmitted,
  onDirtyChange,
  onPendingChange,
}: {
  batchId: string;
  observations: Observation[];
  approvals: StaffApproval[];
  maxQuantity: number;
  onSubmitted: (approval: StaffApproval) => void;
  onDirtyChange: (dirty: boolean) => void;
  onPendingChange: (pending: boolean) => void;
}) {
  const { adminRequest } = useShop();
  const submitting = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const history = approvals.filter((row) => row.batchId === batchId);
  const healthy = observations.filter(
    (row) => row.batchId === batchId && row.health === "HEALTHY",
  );
  const waiting = history.some((row) => row.status === "PENDING");
  const unavailable = waiting || maxQuantity <= 0 || !healthy.length;

  return (
    <section className="staff-readiness">
      <h3>Pengajuan siap jual</h3>
      <p>
        Ajukan tanaman berdasarkan pengamatan sehat. Stok siap jual bertambah
        setelah admin menyetujui pengajuan.
      </p>
      {unavailable ? (
        <p className="notice">
          {waiting
            ? "Pengajuan kelompok ini sedang diperiksa admin. Tunggu hasil sebelum mengajukan kembali."
            : maxQuantity <= 0
              ? "Seluruh stok fisik kelompok ini sudah disetujui siap jual."
              : "Catat pengamatan dengan status kesehatan Sehat sebelum mengajukan siap jual."}
        </p>
      ) : (
        <form
          onChange={() => {
            onDirtyChange(true);
            setSuccess("");
          }}
          onSubmit={async (event) => {
            event.preventDefault();
            if (submitting.current) return;
            const element = event.currentTarget;
            const form = new FormData(element);
            submitting.current = true;
            setPending(true);
            onPendingChange(true);
            setError("");
            setSuccess("");
            try {
              const result = await adminRequest<StaffApproval>(
                `/petugas/batches/${encodeURIComponent(batchId)}/readiness`,
                {
                  observationId: form.get("observationId"),
                  quantity: Number(form.get("quantity")),
                  reason: form.get("reason"),
                },
                "POST",
              );
              element.reset();
              onDirtyChange(false);
              setSuccess(
                "Pengajuan berhasil dikirim. Tunggu pemeriksaan admin.",
              );
              onSubmitted(result);
            } catch (cause) {
              setError(
                cause instanceof Error
                  ? cause.message
                  : "Pengajuan gagal dikirim.",
              );
            } finally {
              submitting.current = false;
              setPending(false);
              onPendingChange(false);
            }
          }}
        >
          <fieldset disabled={pending}>
            <p>
              <label>
                Pengamatan sehat
                <select name="observationId" required defaultValue="">
                  <option value="">Pilih pengamatan</option>
                  {healthy.map((row) => (
                    <option key={row.id} value={row.id}>
                      {localDateTime(row.observedAt)} · {row.condition}
                    </option>
                  ))}
                </select>
              </label>
            </p>
            <p>
              <label>
                Jumlah tanaman diajukan
                <input
                  name="quantity"
                  required
                  type="number"
                  min={1}
                  max={maxQuantity}
                />
              </label>
              <small>
                Maksimal {maxQuantity.toLocaleString("id-ID")} tanaman belum
                disetujui.
              </small>
            </p>
            <p>
              <label>
                Catatan pengajuan
                <textarea
                  name="reason"
                  required
                  minLength={5}
                  maxLength={1000}
                />
              </label>
            </p>
            <Button type="submit">
              {pending ? "Mengirim…" : "Ajukan siap jual"}
            </Button>
          </fieldset>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
      {success && <p role="status">{success}</p>}
      {!!history.length && (
        <div className="staff-approval-history">
          <h4>Status pengajuan kelompok ini</h4>
          {history.map((row) => (
            <article key={row.id}>
              <span className="badge" data-status={row.status}>
                {indonesianLabel(row.status)}
              </span>
              <p>
                {row.quantity.toLocaleString("id-ID")} tanaman ·{" "}
                {localDateTime(row.createdAt)}
              </p>
              <p>{row.reason}</p>
              {row.reviewedAt && (
                <small>Ditinjau {localDateTime(row.reviewedAt)}</small>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
