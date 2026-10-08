"use client";
import { PasswordForm } from "./password";
import { indonesianLabel } from "@/lib/format";
import { useState } from "react";
import { useShop } from "@/features/storefront/provider";
import { useNotification } from "@/components/notification-provider";
import { localDateTime, rupiah } from "@/lib/format";
import {
  DeleteAction,
  AdminModal,
  DetailFields,
  AdminForm,
  DataTable,
  Field,
  Heading,
  useAdminRows,
  value,
} from "./shared";
import { GrowthChart, type NurseryBatch, type Monitoring } from "./resources";

interface Approval {
  id: string;
  batchId: string;
  quantity: number;
  status: string;
  reason: string;
  createdAt: string;
  batch: NurseryBatch & { assignee: { name: string } | null };
  observation: Monitoring;
}
interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: string;
  proofUrl: string;
  status: string;
  reason: string;
  paidAt: string;
  order: {
    contactName: string;
    total: number;
    shippingCost: number;
    status: string;
  };
}
export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  active: boolean;
  createdAt?: string;
  orders?: {
    id: string;
    status: string;
    total: number;
    createdAt: string;
    payment: { status: string } | null;
    items: { name: string; quantity: number }[];
  }[];
}

export function AdminReviews({ kind }: { kind: "approvals" | "payments" }) {
  const table = useAdminRows<Approval & Payment>(`/admin/${kind}`),
    { adminRequest } = useShop(),
    { confirm } = useNotification();
  const [selected, setSelected] = useState<(Approval & Payment) | null>(null),
    [status, setStatus] = useState("");
  const approval = kind === "approvals";
  return (
    <>
      <Heading
        title={approval ? "Persetujuan Siap Jual" : "Pembayaran"}
        description={
          approval
            ? "Tinjau pengajuan petugas berdasarkan pemantauan dan kondisi kelompok sebelum menyetujui stok siap jual."
            : "Periksa bukti dan nominal pembayaran sebelum memproses pesanan."
        }
      />
      <DataTable
        {...table}

        rows={table.rows.filter((r) => !status || r.status === status)}
        columns={[
          {
            label: approval ? "Batch" : "Pesanan",
            value: (r) =>
              approval ? `${r.batchId} / ${r.batch?.product?.name}` : r.orderId,
          },
          {
            label: approval ? "Petugas" : "Pelanggan",
            value: (r) =>
              approval
                ? (r.batch?.assignee?.name ?? "—")
                : r.order?.contactName,
          },
          {
            label: approval ? "Jumlah tanaman" : "Nominal",
            value: (r) => (approval ? r.quantity : rupiah(r.amount)),
          },
          {
            label: "Tanggal",
            value: (r) => localDateTime(approval ? r.createdAt : r.paidAt),
          },
          { label: "Status", value: (r) => indonesianLabel(r.status) },
          { label: "Alasan", value: (r) => r.reason },
        ]}
        filter={
          <select
            aria-label="Penyaring status pemeriksaan"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Semua status</option>
            {(approval
              ? ["PENDING", "APPROVED", "REJECTED"]
              : ["WAITING", "VERIFIED", "REJECTED"]
            ).map((s) => (
              <option key={s} value={s}>
                {indonesianLabel(s)}
              </option>
            ))}
          </select>
        }
        empty={
          approval
            ? "Belum ada pengajuan siap jual. Pengajuan dikirim petugas dari detail kelompok."
            : "Belum ada bukti pembayaran yang dikirim pelanggan."
        }
        actions={(r) => (
          <button onClick={() => setSelected(r)}>Lihat / Periksa</button>
        )}
      />
      {selected && (
        <AdminModal
          detail
          title={`Detail ${approval ? selected.batchId : selected.orderId}`}
          onClose={() => setSelected(null)}
        >
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <h2>Detail {approval ? selected.batchId : selected.orderId}</h2>
            </div>
            <div className="admin-staff-observation">
              {approval ? (
                <>
                  <DetailFields
                    fields={[
                      { label: "Tanaman", value: selected.batch.product?.name },
                      { label: "Lokasi", value: selected.batch.location },
                      {
                        label: "Petugas",
                        value: selected.batch.assignee?.name,
                      },
                      {
                        label: "Jumlah pengajuan",
                        value: `${selected.quantity} tanaman`,
                      },
                      { label: "Stok fisik", value: selected.batch.physical },
                      {
                        label: "Stok siap jual",
                        value: selected.batch.approved,
                      },
                      {
                        label: "Kesehatan",
                        value: indonesianLabel(selected.observation.health),
                      },
                      {
                        label: "Kondisi",
                        value: selected.observation.condition,
                      },
                      { label: "Metode", value: selected.observation.method },
                      {
                        label: "Status pengajuan",
                        value: indonesianLabel(selected.status),
                      },
                    ]}
                  />
                  <p>
                    <strong>Catatan pengamatan</strong>
                    {selected.observation.notes || "Tidak ada catatan."}
                  </p>
                  {selected.observation.photoUrl && (
                    <a
                      href={selected.observation.photoUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Lihat foto pengamatan
                    </a>
                  )}
                  <GrowthChart
                    observations={selected.batch.observations ?? []}
                  />
                </>
              ) : (
                <>
                  <DetailFields
                    fields={[
                      { label: "Pelanggan", value: selected.order.contactName },
                      { label: "Metode pembayaran", value: selected.method },
                      {
                        label: "Total tagihan",
                        value: rupiah(
                          selected.order.total + selected.order.shippingCost,
                        ),
                      },
                      {
                        label: "Nominal pembayaran",
                        value: rupiah(selected.amount),
                      },
                      {
                        label: "Tanggal pembayaran",
                        value: localDateTime(selected.paidAt),
                      },
                      {
                        label: "Status",
                        value: indonesianLabel(selected.status),
                      },
                    ]}
                  />
                  <a href={selected.proofUrl} target="_blank" rel="noreferrer">
                    Lihat bukti pembayaran
                  </a>
                </>
              )}
            </div>
            {["PENDING", "WAITING"].includes(selected.status) && (
              <AdminForm
                title="Keputusan pemeriksaan"
                modal={false}
                onCancel={() => setSelected(null)}
                onSave={async (form) => {
                  const status = value(form, "status"),
                    reason = value(form, "reason");
                  if (
                    !(await confirm({
                      title: `${status === "REJECTED" ? "Tolak" : "Setujui"} ${approval ? "kesiapan jual" : "pembayaran"}?`,
                      message: approval
                        ? "Keputusan mengubah kesiapan stok kelompok dan dicatat dalam audit."
                        : "Pembayaran terverifikasi memindahkan reservasi ke stok terjual. Periksa nominal dan bukti dengan teliti.",
                    }))
                  )
                    return false;
                  await adminRequest(
                    `/admin/${kind}/${selected.id}/review`,
                    { status, reason },
                    "POST",
                  );
                  table.reload();
                }}
              >
                <Field label="Keputusan *">
                  <select name="status">
                    <option value={approval ? "APPROVED" : "VERIFIED"}>
                      {approval ? "Approve" : "Verifikasi"}
                    </option>
                    <option value="REJECTED">Reject</option>
                  </select>
                </Field>
                <Field label="Alasan / catatan pemeriksaan *">
                  <textarea
                    name="reason"
                    required
                    minLength={5}
                    maxLength={1000}
                  />
                </Field>
              </AdminForm>
            )}
          </section>
        </AdminModal>
      )}
    </>
  );
}

export function UserEditor({
  user,
  onDone,
}: {
  user: ManagedUser;
  onDone: () => void;
}) {
  const { adminRequest } = useShop(),
    { confirm } = useNotification();
  return (
    <AdminForm
      title={`Ubah profil ${user.name}`}
      onCancel={onDone}
      onSave={async (form) => {
        const active = value(form, "active") === "true";
        if (
          !active &&
          user.active &&
          !(await confirm({
            title: "Nonaktifkan akun?",
            message:
              "Sesi akun akan dicabut. Histori pesanan dan pemantauan tetap disimpan.",
          }))
        )
          return false;
        await adminRequest(
          `/admin/users/${user.id}`,
          {
            name: value(form, "name"),
            email: value(form, "email"),
            phone: value(form, "phone"),
            active,
          },
          "PATCH",
        );
      }}
    >
      <Field label="Nama *">
        <input
          name="name"
          defaultValue={user.name}
          required
          minLength={2}
          maxLength={100}
        />
      </Field>
      <Field label="Surel *">
        <input
          name="email"
          type="email"
          defaultValue={user.email}
          required
          maxLength={191}
        />
      </Field>
      <Field label="Nomor telepon">
        <input
          name="phone"
          type="tel"
          defaultValue={user.phone ?? ""}
          maxLength={20}
        />
      </Field>
      <Field label="Status *">
        <select name="active" defaultValue={String(user.active)}>
          <option value="true">Aktif</option>
          <option value="false">Nonaktif</option>
        </select>
      </Field>
    </AdminForm>
  );
}
export function AdminCustomers() {
  const table = useAdminRows<ManagedUser>("/admin/customers");
  const [resetting, setResetting] = useState<ManagedUser | null>(null);
  const [selected, setSelected] = useState<ManagedUser | null>(null),
    [editing, setEditing] = useState<ManagedUser | null>(null),
    [status, setStatus] = useState("");
  return (
    <>
      <Heading
        title="Pelanggan"
        description="Profil, histori pesanan dan status pelanggan. Kata sandi tidak ditampilkan."
      />
      {resetting && (
        <PasswordForm target={resetting} onClose={() => setResetting(null)} />
      )}
      {editing && (
        <UserEditor
          key={editing.id}
          user={editing}
          onDone={() => {
            setEditing(null);
            table.reload();
          }}
        />
      )}
      <DataTable
        {...table}

        rows={table.rows.filter((u) => !status || String(u.active) === status)}
        columns={[
          {
            label: "Pelanggan",
            value: (u) => (
              <>
                <strong>{u.name}</strong>
                <small>{u.email}</small>
              </>
            ),
          },
          {
            label: "Telepon / alamat",
            value: (u) => `${u.phone} / ${u.address || "—"}`,
          },
          { label: "Jumlah pesanan", value: (u) => u.orders?.length ?? 0 },
          {
            label: "Total transaksi",
            value: (u) =>
              rupiah(
                u.orders
                  ?.filter(
                    (o) =>
                      o.payment?.status === "VERIFIED" &&
                      !["CANCELLED", "EXPIRED"].includes(o.status),
                  )
                  .reduce((sum, o) => sum + o.total, 0) ?? 0,
              ),
          },
          { label: "Status", value: (u) => (u.active ? "Aktif" : "Nonaktif") },
        ]}
        empty="Belum ada pelanggan terdaftar."
        filter={
          <select
            aria-label="Penyaring status pelanggan"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Semua status</option>
            <option value="true">Aktif</option>
            <option value="false">Nonaktif</option>
          </select>
        }
        actions={(u) => (
          <>
            <button onClick={() => setSelected(u)}>Lihat histori</button>
            <button onClick={() => setEditing(u)}>Ubah / Status akun</button>
            <button onClick={() => setResetting(u)}>Reset kata sandi</button>
            <DeleteAction
              path={`/admin/users/${u.id}`}
              name={u.name}
              onDeleted={() => {
                setSelected(null);
                table.reload();
              }}
            />
          </>
        )}
      />
      {selected && (
        <AdminModal
          detail
          title={`Pesanan ${selected.name}`}
          onClose={() => setSelected(null)}
        >
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <h2>Pesanan {selected.name}</h2>
            </div>
            <DetailFields
              fields={[
                { label: "Nama pelanggan", value: selected.name },
                { label: "Surel", value: selected.email },
                { label: "Telepon", value: selected.phone || "—" },
                {
                  label: "Terdaftar",
                  value: selected.createdAt
                    ? localDateTime(selected.createdAt)
                    : "—",
                },
              ]}
            />
            <h3 className="admin-detail-section-title">Riwayat pesanan</h3>
            <ul className="admin-history">
              {selected.orders?.map((o) => (
                <li key={o.id}>
                  <strong>{o.id}</strong> · {localDateTime(o.createdAt)} ·{" "}
                  {indonesianLabel(o.status)} · {rupiah(o.total)}
                  <p>
                    {o.items.map((i) => `${i.name} × ${i.quantity}`).join("; ")}
                  </p>
                </li>
              ))}
            </ul>
            {!selected.orders?.length && (
              <p className="admin-empty">
                Pelanggan ini belum membuat pesanan.
              </p>
            )}
          </section>
        </AdminModal>
      )}
    </>
  );
}
