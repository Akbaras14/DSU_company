"use client";
import {
  ModalNotice,
  useNotification,
} from "@/components/notification-provider";
import { useEffect, useState } from "react";
import { orderLabels, type OrderStatus } from "@dsu/contracts";
import { rupiah, localDateTime } from "@/lib/format";
import { useShop } from "./provider";
import { Heading } from "@/features/admin/shared";
import type { ShopOrder } from "./service";
import { Search } from "lucide-react";
const nextStatuses: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PENDING_PAYMENT: ["CANCELLED"],
  WAITING_VERIFICATION: ["CANCELLED"],
  PAYMENT_REJECTED: ["CANCELLED"],
  PAID: ["PROCESSING"],
  READY_TO_SHIP: ["SHIPPED"],
  PENDING_CONFIRMATION: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CANCELLED"],
  PROCESSING: ["READY_FOR_PICKUP", "CANCELLED"],
  READY_FOR_PICKUP: ["COMPLETED", "CANCELLED"],
  SHIPPED: ["COMPLETED"],
};
function allowedStatuses(order: ShopOrder) {
  return order.status === "PROCESSING" && order.fulfillmentMethod === "DELIVERY"
    ? (["READY_TO_SHIP"] as OrderStatus[])
    : nextStatuses[order.status];
}
export function AdminOrders() {
  const { confirm, notify } = useNotification();
  const { user, adminRequest } = useShop();
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [status, setStatus] = useState<OrderStatus>("CONFIRMED");
  const [pending, setPending] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const filtered = orders
    .filter(
      (order) =>
        (filter === "ALL" || order.status === filter) &&
        `${order.id} ${order.contact.name} ${order.contact.phone}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pages);
  const displayed = filtered.slice((currentPage - 1) * 10, currentPage * 10);
  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    let active = true;
    adminRequest<ShopOrder[]>("/admin/orders")
      .then((value) => {
        if (active) {
          setOrders(value);
          setError("");
        }
      })
      .catch((e: unknown) => {
        if (active)
          setError(e instanceof Error ? e.message : "Gagal memuat pesanan.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.role, adminRequest, attempt]);
  if (user?.role !== "ADMIN")
    return (
      <section className="shop-empty">
        <h1>Akses ditolak</h1>
        <p>Halaman ini hanya untuk admin.</p>
      </section>
    );
  async function save() {
    if (pending) return;
    if (!selected || reason.trim().length < 5) {
      notify({
        kind: "error",
        message: "Isi catatan konfirmasi minimal 5 karakter.",
      });
      return;
    }
    const order = orders.find((item) => item.id === selected);
    if (
      order?.fulfillmentMethod === "DELIVERY" &&
      ["SHIPPED", "COMPLETED"].includes(status) &&
      !trackingNumber.trim()
    ) {
      notify({
        kind: "error",
        message: "Nomor resi wajib diisi untuk pesanan pengiriman.",
      });
      return;
    }
    if (
      !(await confirm({
        title: `Ubah pesanan menjadi ${orderLabels[status]}?`,
        message:
          status === "COMPLETED"
            ? "Stok fisik akan dikeluarkan."
            : "Pastikan pembayaran telah diverifikasi dan perubahan sesuai proses operasional.",
        confirmLabel: "Ya, ubah status",
      }))
    )
      return;
    setPending(true);
    setError("");
    try {
      await adminRequest(
        `/admin/orders/${selected}/status`,
        {
          status,
          reason,
          ...(order?.fulfillmentMethod === "DELIVERY"
            ? { trackingNumber: trackingNumber.trim() }
            : {}),
        },
        "POST",
      );
      setSelected(null);
      setReason("");
      setAttempt((n) => n + 1);
      notify({
        kind: "success",
        message: "Status pesanan berhasil diperbarui.",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Perubahan gagal.");
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="shop-section">
      <Heading
        title="Kelola pesanan"
        description="Pembayaran harus diverifikasi sebelum memproses pesanan. Verifikasi bukti melalui menu Pembayaran."
      />
      <div className="admin-order-filters">
        <label className="admin-search">
          <Search size={18} />
          <input
            aria-label="Cari pesanan"
            placeholder="Cari nomor pesanan, pelanggan, atau telepon"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <select
          aria-label="Penyaring status pesanan"
          value={filter}
          onChange={(event) => {
            setFilter(event.target.value);
            setPage(1);
          }}
        >
          <option value="ALL">Semua status</option>
          {Object.entries(orderLabels).map(([value, label]) => (
            <option value={value} key={value}>
              {label}
            </option>
          ))}
        </select>
        <span>{filtered.length} pesanan</span>
      </div>
      {error && <ModalNotice message={error} />}
      {loading ? (
        <p role="status">Memuat pesanan...</p>
      ) : !filtered.length ? (
        <div className="shop-empty">
          {orders.length
            ? "Tidak ada pesanan yang sesuai pencarian."
            : "Belum ada pesanan masuk."}
        </div>
      ) : (
        displayed.map((order) => (
          <article className="shop-order" key={order.id}>
            <header>
              <div>
                <strong>{order.id}</strong>
                <p>{localDateTime(order.createdAt)}</p>
              </div>
              <span className="shop-order-status">
                {orderLabels[order.status]}
              </span>
            </header>
            <p>
              {order.contact.name} · {order.contact.phone} ·{" "}
              {order.contact.address}
            </p>
            <p>
              <strong>Metode:</strong>{" "}
              {order.fulfillmentMethod === "DELIVERY"
                ? "Kirim ke lokasi pelanggan"
                : `Ambil di ${order.pickupAddress}`}
            </p>
            {order.trackingNumber && (
              <p>
                <strong>Nomor resi:</strong> {order.trackingNumber}
              </p>
            )}
            <div className="shop-order-items">
              {order.items.map((line) => (
                <div key={line.productId}>
                  <span>
                    {line.name} × {line.quantity}
                  </span>
                  <strong>{rupiah(line.unitPrice * line.quantity)}</strong>
                </div>
              ))}
            </div>
            <div className="shop-order-footer">
              <strong>
                Total {rupiah(order.total + (order.shippingCost ?? 0))} · Ongkir{" "}
                {rupiah(order.shippingCost ?? 0)}
              </strong>
              <a
                className="shop-text-link"
                target="_blank"
                rel="noreferrer"
                href={`https://wa.me/${order.contact.phone.replace(/^\+/, "").replace(/^0/, "62")}`}
              >
                Hubungi pelanggan
              </a>
              {allowedStatuses(order) && (
                <button
                  className="shop-button"
                  onClick={() => {
                    setSelected(order.id);
                    setStatus(allowedStatuses(order)?.[0] || "CONFIRMED");
                    setReason("");
                    setTrackingNumber(order.trackingNumber || "");
                  }}
                >
                  Tindak lanjuti
                </button>
              )}
            </div>
            {order.fulfillmentMethod === "DELIVERY" &&
              [
                "PENDING_PAYMENT",
                "PAYMENT_REJECTED",
                "PENDING_CONFIRMATION",
              ].includes(order.status) && (
                <form
                  className="shop-admin-action"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    if (
                      !(await confirm({
                        title: "Ubah ongkir?",
                        message:
                          "Tagihan pelanggan akan mengikuti ongkir baru.",
                      }))
                    )
                      return;
                    setPending(true);
                    try {
                      await adminRequest(
                        `/admin/orders/${order.id}/shipping`,
                        {
                          shippingCost: Number(form.get("shippingCost")),
                          reason: String(form.get("reason")),
                        },
                        "PATCH",
                      );
                      setAttempt((value) => value + 1);
                      notify({
                        kind: "success",
                        message: "Ongkir berhasil diperbarui.",
                      });
                    } catch (cause) {
                      notify({
                        kind: "error",
                        message:
                          cause instanceof Error
                            ? cause.message
                            : "Ongkir gagal diperbarui.",
                      });
                    } finally {
                      setPending(false);
                    }
                  }}
                >
                  <label className="shop-field">
                    Ongkir (Rp)
                    <input
                      name="shippingCost"
                      type="number"
                      min={0}
                      max={2147483647}
                      required
                      defaultValue={order.shippingCost ?? 0}
                      disabled={pending}
                    />
                  </label>
                  <label className="shop-field">
                    Alasan perubahan ongkir
                    <input
                      name="reason"
                      minLength={5}
                      maxLength={500}
                      required
                      disabled={pending}
                    />
                  </label>
                  <button
                    className="shop-button secondary"
                    disabled={pending}
                    type="submit"
                  >
                    Simpan ongkir
                  </button>
                </form>
              )}
            {selected === order.id && (
              <div className="shop-admin-action">
                <label className="shop-field">
                  Status berikutnya
                  <select
                    value={status}
                    disabled={pending}
                    onChange={(e) => {
                      const value = allowedStatuses(order)?.find(
                        (s) => s === e.target.value,
                      );
                      if (value) setStatus(value);
                    }}
                  >
                    {allowedStatuses(order)?.map((s) => (
                      <option key={s} value={s}>
                        {orderLabels[s]}
                      </option>
                    ))}
                  </select>
                </label>
                {order.fulfillmentMethod === "DELIVERY" &&
                  ["SHIPPED", "COMPLETED"].includes(status) && (
                    <label className="shop-field">
                      Nomor resi (wajib)
                      <input
                        value={trackingNumber}
                        onChange={(event) =>
                          setTrackingNumber(event.target.value)
                        }
                        required
                        maxLength={100}
                        disabled={pending}
                        placeholder="Masukkan nomor resi pengiriman"
                      />
                      <small>
                        Nomor resi akan ditampilkan pada detail pesanan
                        pelanggan.
                      </small>
                    </label>
                  )}
                <label className="shop-field">
                  Catatan hasil konfirmasi
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    minLength={5}
                    maxLength={500}
                    disabled={pending}
                  />
                </label>
                <button
                  className="shop-button"
                  onClick={() => void save()}
                  disabled={pending}
                >
                  Simpan status
                </button>
              </div>
            )}
          </article>
        ))
      )}
      {pages > 1 && (
        <nav className="admin-pagination" aria-label="Halaman pesanan">
          <button
            className="shop-button secondary"
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
          >
            Sebelumnya
          </button>
          <span>
            Halaman {currentPage} dari {pages}
          </span>
          <button
            className="shop-button secondary"
            disabled={currentPage === pages}
            onClick={() => setPage(currentPage + 1)}
          >
            Berikutnya
          </button>
        </nav>
      )}
    </section>
  );
}
