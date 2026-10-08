"use client";
import { indonesianLabel } from "@/lib/format";
import { useState } from "react";
import type { Observation } from "@dsu/contracts";
import { useShop } from "@/features/storefront/provider";

export function ReadinessForm({
  batchId,
  observations,
}: {
  batchId: string;
  observations: Observation[];
}) {
  const { adminRequest } = useShop();
  const [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const [history, setHistory] = useState<
    {
      id: string;
      batchId: string;
      status: string;
      reason: string;
      quantity: number;
    }[]
  >([]);
  return (
    <section>
      <h3>Pengajuan siap jual</h3>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setPending(true);
          setError("");
          setSuccess("");
          try {
            await adminRequest(
              `/petugas/batches/${encodeURIComponent(batchId)}/readiness`,
              {
                observationId: form.get("observationId"),
                quantity: Number(form.get("quantity")),
                reason: form.get("reason"),
              },
              "POST",
            );
            setSuccess("Pengajuan berhasil dikirim. Tunggu pemeriksaan admin.");
          } catch (cause) {
            setError(
              cause instanceof Error
                ? cause.message
                : "Pengajuan gagal dikirim.",
            );
          } finally {
            setPending(false);
          }
        }}
      >
        <fieldset disabled={pending}>
          <p>
            <label>
              Pengamatan sehat
              <select name="observationId" required defaultValue="">
                <option value="">Pilih pengamatan</option>
                {observations
                  .filter(
                    (o) =>
                      o.batchId === batchId &&
                      (!o.health || o.health === "HEALTHY"),
                  )
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.observedAt} · {o.condition}
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
                max={1000000}
              />
            </label>
          </p>
          <p>
            <label>
              Catatan pengajuan
              <textarea name="reason" required minLength={5} maxLength={1000} />
            </label>
          </p>
          <button type="submit" disabled={pending}>
            {pending ? "Mengirim…" : "Ajukan siap jual"}
          </button>
        </fieldset>
        {error && <p role="alert">{error}</p>}
        {success && <p role="status">{success}</p>}
      </form>
      <button
        disabled={pending}
        onClick={async () => {
          try {
            setHistory(
              await adminRequest<typeof history>("/petugas/approvals"),
            );
            setError("");
          } catch (cause) {
            setError(
              cause instanceof Error ? cause.message : "Riwayat gagal dimuat.",
            );
          }
        }}
      >
        Lihat status pengajuan
      </button>
      <ul>
        {history
          .filter((row) => row.batchId === batchId)
          .map((row) => (
            <li key={row.id}>
              {row.quantity} tanaman · {indonesianLabel(row.status)} ·{" "}
              {row.reason}
            </li>
          ))}
      </ul>
    </section>
  );
}
