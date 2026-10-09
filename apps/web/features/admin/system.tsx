"use client";
import { PasswordAction } from "./password";
import { indonesianAudit, indonesianLabel } from "@/lib/format";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useShop } from "@/features/storefront/provider";
import { localDateTime } from "@/lib/format";
import { useNotification } from "@/components/notification-provider";
import {
  AdminModal,
  DetailFields,
  AdminForm,
  DataTable,
  Field,
  Heading,
  PhotoUpload,
  useAdminRows,
  value,
  number,
} from "./shared";

interface Audit {
  id: string;
  actorId: string;
  role: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue: unknown;
  newValue: unknown;
  description: string;
  createdAt: string;
}
interface Settings {
  companyName: string;
  logoUrl: string;
  address: string;
  phone: string;
  email: string;
  minimumStock: number;
  paymentTimeoutHours: number;
  monitoringIntervalDays: number;
  allowCustomerCancellation: boolean;
}
interface Notification {
  key: string;
  kind: string;
  title: string;
  href: string;
  createdAt: string;
  read: boolean;
}
export function AdminAudit() {
  const table = useAdminRows<Audit>("/admin/audit");
  const [selected, setSelected] = useState<Audit | null>(null),
    [action, setAction] = useState("");
  return (
    <>
      <Heading
        title="Catatan Aktivitas"
        description="Aktivitas kritis bersifat hanya baca. Tidak ada tindakan ubah atau hapus audit."
      />
      <DataTable
        {...table}

        rows={table.rows.filter((a) => !action || a.action === action)}
        columns={[
          { label: "Waktu", value: (a) => localDateTime(a.createdAt) },
          {
            label: "Pengguna / peran",
            value: (a) => `${a.actorId} / ${indonesianLabel(a.role)}`,
          },
          { label: "Tindakan", value: (a) => indonesianLabel(a.action) },
          {
            label: "Objek",
            value: (a) => `${indonesianLabel(a.entity)} / ${a.entityId}`,
          },
          { label: "Keterangan", value: (a) => a.description },
        ]}
        filter={
          <select
            aria-label="Penyaring aktivitas audit"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          >
            <option value="">Semua aktivitas</option>
            {[...new Set(table.rows.map((a) => a.action))].map((a) => (
              <option key={a} value={a}>
                {indonesianLabel(a)}
              </option>
            ))}
          </select>
        }
        empty="Belum ada aktivitas kritis tercatat."
        actions={(a) => (
          <button onClick={() => setSelected(a)}>Lihat perubahan</button>
        )}
      />
      {selected && (
        <AdminModal
          detail
          title={`Detail ${indonesianLabel(selected.action)}`}
          onClose={() => setSelected(null)}
        >
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <h2>{indonesianLabel(selected.action)}</h2>
            </div>
            <DetailFields
              fields={[
                { label: "Waktu", value: localDateTime(selected.createdAt) },
                { label: "Peran", value: indonesianLabel(selected.role) },
                { label: "Entitas", value: indonesianLabel(selected.entity) },
                { label: "ID entitas", value: selected.entityId },
              ]}
            />
            <p className="admin-note">
              <strong>Keterangan</strong>
              {selected.description}
            </p>
            <div className="admin-chart-grid">
              <div>
                <h3>Nilai sebelumnya</h3>
                <pre>{indonesianAudit(selected.oldValue)}</pre>
              </div>
              <div>
                <h3>Nilai sesudahnya</h3>
                <pre>{indonesianAudit(selected.newValue)}</pre>
              </div>
            </div>
          </section>
        </AdminModal>
      )}
    </>
  );
}
export function AdminSettings() {
  const { adminRequest } = useShop();
  const [data, setData] = useState<Settings | null>(null),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    adminRequest<Settings>("/admin/settings")
      .then((s) => {
        if (active) {
          setData(s);
          setError("");
        }
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error ? cause.message : "Pengaturan gagal dimuat.",
          );
      });
    return () => {
      active = false;
    };
  }, [adminRequest, attempt]);
  return (
    <>
      <Heading
        title="Pengaturan"
        description="Profil perusahaan, minimum stok, batas pembayaran, pembatalan dan interval pemantauan."
      />
      <PasswordAction />
      {error ? (
        <p role="alert">
          {error}
          <button onClick={() => setAttempt((a) => a + 1)}>Coba lagi</button>
        </p>
      ) : !data ? (
        <p role="status">Memuat pengaturan…</p>
      ) : (
        <AdminForm
          key={attempt}
          title="Pengaturan operasional"
          modal={false}
          onCancel={() => setAttempt((a) => a + 1)}
          onSave={async (form) => {
            await adminRequest(
              "/admin/settings",
              {
                companyName: value(form, "companyName"),
                logoUrl: value(form, "photoUrl") || data.logoUrl,
                address: value(form, "address"),
                phone: value(form, "phone"),
                email: value(form, "email"),
                minimumStock: number(form, "minimumStock"),
                paymentTimeoutHours: number(form, "paymentTimeoutHours"),
                monitoringIntervalDays: number(form, "monitoringIntervalDays"),
                allowCustomerCancellation:
                  value(form, "allowCustomerCancellation") === "true",
              },
              "PATCH",
            );
          }}
        >
          <Field label="Nama perusahaan *">
            <input
              name="companyName"
              required
              minLength={2}
              maxLength={150}
              defaultValue={data.companyName}
            />
          </Field>
          <PhotoUpload defaultValue={data.logoUrl} />
          <Field label="Alamat perusahaan">
            <textarea
              name="address"
              maxLength={500}
              defaultValue={data.address}
            />
          </Field>
          <Field label="Nomor telepon">
            <input name="phone" maxLength={30} defaultValue={data.phone} />
          </Field>
          <Field label="Surel">
            <input
              name="email"
              type="email"
              maxLength={191}
              defaultValue={data.email}
            />
          </Field>
          <Field
            label="Default minimum stok *"
            hint="Batas bawaan untuk menandai persediaan rendah. Bisa diatur lagi per jenis tanaman."
          >
            <input
              name="minimumStock"
              type="number"
              min={0}
              max={1000000}
              required
              defaultValue={data.minimumStock}
            />
          </Field>
          <Field
            label="Batas pembayaran (jam) *"
            hint="Pesanan baru yang belum dibayar akan kedaluwarsa setelah batas ini; reservasinya dilepas."
          >
            <input
              name="paymentTimeoutHours"
              type="number"
              min={1}
              max={168}
              required
              defaultValue={data.paymentTimeoutHours}
            />
          </Field>
          <Field
            label="Interval pemantauan (hari) *"
            hint="Kelompok ditandai perlu dipantau setelah jumlah hari ini sejak pengamatan terakhir."
          >
            <input
              name="monitoringIntervalDays"
              type="number"
              min={1}
              max={365}
              required
              defaultValue={data.monitoringIntervalDays}
            />
          </Field>
          <Field label="Pembatalan pelanggan sebelum pembayaran">
            <select
              name="allowCustomerCancellation"
              defaultValue={String(data.allowCustomerCancellation)}
            >
              <option value="true">Diizinkan</option>
              <option value="false">Hubungi admin</option>
            </select>
          </Field>
        </AdminForm>
      )}
    </>
  );
}
export function AdminNotifications({ onNavigate }: { onNavigate: () => void }) {
  const table = useAdminRows<Notification>("/admin/notifications"),
    { adminRequest } = useShop(),
    { notify } = useNotification();
  const [unread, setUnread] = useState(false),
    [pending, setPending] = useState(false);
  async function read(keys: string[]) {
    setPending(true);
    try {
      await adminRequest("/admin/notifications/read", { keys }, "POST");
      window.dispatchEvent(new Event("admin-notifications-updated"));
      table.reload();
    } catch (cause) {
      notify({
        kind: "error",
        message:
          cause instanceof Error
            ? cause.message
            : "Status baca gagal disimpan.",
      });
    } finally {
      setPending(false);
    }
  }
  const rows = table.rows.filter(
    (notification) => !unread || !notification.read,
  );
  return (
    <section className="admin-notification-content">
      <header className="admin-notification-header">
        <h2>Notifikasi</h2>
        <p>Informasi terbaru dan tindakan yang memerlukan perhatian.</p>
      </header>
      <div className="admin-notification-toolbar">
        <label>
          <input
            type="checkbox"
            checked={unread}
            onChange={(event) => setUnread(event.target.checked)}
          />
          Belum dibaca
        </label>
        <button
          className="shop-button secondary"
          disabled={
            pending ||
            table.loading ||
            !table.rows.some((notification) => !notification.read)
          }
          onClick={() =>
            void read(
              table.rows
                .filter((notification) => !notification.read)
                .slice(0, 1000)
                .map((notification) => notification.key),
            )
          }
        >
          Tandai semua dibaca
        </button>
      </div>
      <div className="admin-notification-body">
        {table.loading ? (
          <p role="status">Memuat notifikasi...</p>
        ) : table.error ? (
          <div role="alert">
            <p>{table.error}</p>
            <button className="shop-button secondary" onClick={table.reload}>
              Coba lagi
            </button>
          </div>
        ) : rows.length ? (
          <ul className="admin-notification-list">
            {rows.map((notification) => (
              <li key={notification.key} data-unread={!notification.read}>
                <div className="admin-notification-item-heading">
                  <strong>{notification.title}</strong>
                  {!notification.read && (
                    <span className="admin-notification-unread">Baru</span>
                  )}
                </div>
                <small>
                  {indonesianLabel(notification.kind)} ·{" "}
                  {localDateTime(notification.createdAt)}
                </small>
                <div className="admin-notification-item-actions">
                  <Link href={notification.href} onClick={onNavigate}>
                    Buka halaman terkait
                  </Link>
                  <button
                    disabled={pending || notification.read}
                    onClick={() => void read([notification.key])}
                  >
                    {notification.read ? "Dibaca" : "Tandai dibaca"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="admin-empty">
            {unread
              ? "Semua notifikasi sudah dibaca."
              : "Belum ada notifikasi."}
          </p>
        )}
      </div>
    </section>
  );
}

export function AdminSearch() {
  const { adminRequest } = useShop();
  const [rows, setRows] = useState<
      { id: string; label: string; href: string }[]
    >([]),
    [query, setQuery] = useState(""),
    [error, setError] = useState(""),
    [searched, setSearched] = useState(false);
  return (
    <div className="admin-global-search">
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          try {
            setRows(
              await adminRequest(
                `/admin/search?q=${encodeURIComponent(query)}`,
              ),
            );
            setError("");
            setSearched(true);
          } catch (cause) {
            setError(
              cause instanceof Error ? cause.message : "Pencarian gagal.",
            );
          }
        }}
      >
        <input
          aria-label="Pencarian global admin"
          minLength={2}
          maxLength={100}
          required
          placeholder="Tanaman, kelompok, pesanan, pengguna"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button className="shop-button secondary" type="submit">
          Cari
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      {searched && (
        <div className="admin-search-results">
          <button onClick={() => setSearched(false)}>Tutup hasil</button>
          {rows.map((row) => (
            <Link
              key={`${row.href}:${row.id}`}
              href={row.href}
              onClick={() => setSearched(false)}
            >
              {row.label} · {row.id}
            </Link>
          ))}
          {!rows.length && <p>Tidak ditemukan. Coba kode atau nama lain.</p>}
        </div>
      )}
    </div>
  );
}

type ReportRow = Record<string, string | number | null>;
const xml = (text: string) =>
  text.replace(
    /[<>&"']/g,
    (character) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[character]!,
  );
export function AdminReports() {
  const [type, setType] = useState("inventory"),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [preset, setPreset] = useState("custom");
  const params = new URLSearchParams({
    type,
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  });
  const table = useAdminRows<ReportRow>(`/admin/reports?${params}`);
  const [query, setQuery] = useState("");
  const rows = table.rows.filter((row) =>
    JSON.stringify(row).toLowerCase().includes(query.toLowerCase()),
  );
  function exportExcel() {
    const keys = Object.keys(rows[0] ?? {});
    const cell = (text: unknown) =>
      `<Cell><Data ss:Type="${typeof text === "number" ? "Number" : "String"}">${xml(String(text ?? ""))}</Data></Cell>`;
    const document = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Laporan"><Table><Row>${keys.map((key) => cell(indonesianLabel(key))).join("")}</Row>${rows.map((row) => `<Row>${keys.map((key) => cell(typeof row[key] === "number" ? row[key] : indonesianLabel(row[key]))).join("")}</Row>`).join("")}</Table></Worksheet></Workbook>`;
    const url = URL.createObjectURL(
        new Blob([document], { type: "application/vnd.ms-excel" }),
      ),
      link = documentElement(url);
    link.download = `laporan-${indonesianLabel(type).toLowerCase().replaceAll(" ", "-")}.xml`;
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <Heading
        title="Laporan"
        description="Persediaan, pemantauan, penjualan dan pergerakan stok dari data tersimpan. Ekspor Excel atau cetak sebagai PDF."
      />
      <div className="admin-panel-heading">
        <select
          aria-label="Jenis laporan"
          value={type}
          onChange={(event) => setType(event.target.value)}
        >
          <option value="inventory">Persediaan</option>
          <option value="monitoring">Pemantauan</option>
          <option value="sales">Penjualan</option>
          <option value="movements">Pergerakan stok</option>
        </select>
        <select
          aria-label="Periode laporan"
          value={preset}
          onChange={(event) => {
            const value = event.target.value;
            setPreset(value);
            const today = new Date().toLocaleDateString("en-CA", {
              timeZone: "Asia/Jakarta",
            });
            setTo(today);
            setFrom(
              value === "today"
                ? today
                : value === "month"
                  ? `${today.slice(0, 7)}-01`
                  : value === "year"
                    ? `${today.slice(0, 4)}-01-01`
                    : ["7", "30"].includes(value)
                      ? new Date(
                          Date.now() - (Number(value) - 1) * 86400000,
                        ).toLocaleDateString("en-CA", {
                          timeZone: "Asia/Jakarta",
                        })
                      : "",
            );
          }}
        >
          <option value="custom">Rentang tanggal</option>
          <option value="today">Hari ini</option>
          <option value="7">7 hari</option>
          <option value="30">30 hari</option>
          <option value="month">Bulan ini</option>
          <option value="year">Tahun ini</option>
        </select>
        <input
          aria-label="Dari tanggal laporan"
          type="date"
          value={from}
          onChange={(event) => {
            setPreset("custom");
            setFrom(event.target.value);
          }}
        />
        <input
          aria-label="Sampai tanggal laporan"
          type="date"
          value={to}
          onChange={(event) => {
            setPreset("custom");
            setTo(event.target.value);
          }}
        />
        <input
          aria-label="Penyaring isi laporan"
          placeholder="Penyaring tanaman, kelompok, petugas…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button
          className="shop-button"
          disabled={!rows.length || table.loading || Boolean(table.error)}
          onClick={exportExcel}
        >
          Ekspor Excel
        </button>
        <button
          className="shop-button secondary"
          disabled={table.loading || Boolean(table.error)}
          onClick={() => window.print()}
        >
          Ekspor PDF / Cetak
        </button>
      </div>
      <DataTable
        {...table}
        rows={rows}

        columns={Object.keys(rows[0] ?? {}).map((key) => ({
          label: indonesianLabel(key),
          value: (row: ReportRow) => indonesianLabel(row[key]),
        }))}
        empty="Tidak ada data pada periode atau penyaring yang dipilih."
      />
      {type === "sales" && (
        <p className="admin-note">
          Pendapatan terverifikasi:{" "}
          {rows
            .reduce((sum, row) => sum + Number(row.revenue ?? 0), 0)
            .toLocaleString("id-ID")}{" "}
          · Tanaman terjual:{" "}
          {rows
            .filter((row) => row.payment === "VERIFIED")
            .reduce((sum, row) => sum + Number(row.plants ?? 0), 0)}{" "}
          tanaman
        </p>
      )}
      <section className="admin-print-report">
        <h1>Laporan {indonesianLabel(type)}</h1>
        <p>
          {from || "Semua tanggal"} — {to || "Sekarang"}
        </p>
        <table>
          <thead>
            <tr>
              {Object.keys(rows[0] ?? {}).map((key) => (
                <th key={key}>{indonesianLabel(key)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                {Object.values(row).map((cell, column) => (
                  <td key={column}>{indonesianLabel(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
function documentElement(url: string) {
  const link = document.createElement("a");
  link.href = url;
  return link;
}
