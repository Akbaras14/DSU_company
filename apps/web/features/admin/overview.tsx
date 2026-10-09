"use client";
import { indonesianLabel } from "@/lib/format";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useShop } from "@/features/storefront/provider";
import { localDateTime, rupiah } from "@/lib/format";
import { Heading, useAdminRows } from "./shared";
import { GrowthChart, type NurseryBatch } from "./resources";

interface Dashboard {
  metrics: Record<string, number>;
  notifications: { key: string; title: string; href: string }[];
  sales: {
    date: string;
    transactions: number;
    revenue: number;
    plants: number;
  }[];
  activity: {
    id: string;
    createdAt: string;
    description: string;
    action: string;
  }[];
}
const labels: Record<string, string> = {
  plants: "Jenis tanaman aktif",
  batches: "Kelompok aktif",
  physical: "Total stok fisik",
  ready: "Siap jual tersedia",
  monitoring: "Dalam pemantauan",
  reserved: "Dipesan pelanggan",
  sold: "Tanaman terjual",
  damaged: "Rusak / mati",
  low: "Stok rendah",
  newOrders: "Pesanan baru",
  payments: "Pembayaran menunggu verifikasi",
  approvals: "Pengajuan siap jual",
};
export function AdminOverview() {
  const { adminRequest } = useShop();
  const [data, setData] = useState<Dashboard | null>(null),
    [period, setPeriod] = useState("30"),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0),
    [metric, setMetric] = useState<"revenue" | "transactions" | "plants">(
      "revenue",
    ),
    [batch, setBatch] = useState("");
  const batches = useAdminRows<NurseryBatch>("/admin/batches");
  useEffect(() => {
    let active = true;
    adminRequest<Dashboard>(`/admin/dashboard?period=${period}`)
      .then((result) => {
        if (active) {
          setData(result);
          setError("");
        }
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error ? cause.message : "Beranda gagal dimuat.",
          );
      });
    return () => {
      active = false;
    };
  }, [adminRequest, period, attempt]);
  if (error || !data)
    return (
      <>
        <Heading
          title="Beranda"
          description="Ringkasan operasional pembibitan dan tindakan yang perlu diprioritaskan."
        />
        <p role={error ? "alert" : "status"}>{error || "Memuat beranda…"}</p>
        {error && (
          <button
            className="shop-button"
            onClick={() => setAttempt((a) => a + 1)}
          >
            Coba lagi
          </button>
        )}
      </>
    );
  const max = Math.max(1, ...data.sales.map((point) => point[metric]));
  const selected = batches.rows.find((b) => b.id === batch);
  return (
    <>
      <Heading
        title="Beranda"
        description="Persediaan, pemantauan, persetujuan dan penjualan dari data operasional tersimpan."
      />
      <section
        className="portal-next-actions"
        aria-label="Pekerjaan utama admin"
      >
        <Link href="/admin/approval">
          <strong>Tinjau pengajuan jual</strong>
          <span>
            {data.metrics.approvals ?? 0} pengajuan menunggu pemeriksaan
          </span>
        </Link>
        <Link href="/admin/pembayaran">
          <strong>Verifikasi pembayaran</strong>
          <span>{data.metrics.payments ?? 0} pembayaran perlu diperiksa</span>
        </Link>
        <Link href="/admin/petugas">
          <strong>Kelola penugasan</strong>
          <span>Pilih petugas dan kelompok tanaman tugasnya</span>
        </Link>
      </section>
      <section
        className="admin-overview-summary"
        aria-labelledby="admin-stock-summary"
      >
        <h2 id="admin-stock-summary">Ringkasan persediaan</h2>
        <div className="admin-metrics">
          {["physical", "ready", "monitoring", "sold"].map((key) => (
            <article key={key}>
              <span>{labels[key]}</span>
              <strong>
                {(data.metrics[key] ?? 0).toLocaleString("id-ID")}
              </strong>
            </article>
          ))}
        </div>
        <dl className="admin-supporting-metrics">
          {Object.entries(labels)
            .filter(
              ([key]) =>
                !["physical", "ready", "monitoring", "sold"].includes(key),
            )
            .map(([key, label]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{(data.metrics[key] ?? 0).toLocaleString("id-ID")}</dd>
              </div>
            ))}
        </dl>
      </section>
      <div className="admin-overview-grid">
        <section className="admin-panel admin-overview-attention">
          <div className="admin-panel-heading">
            <h2>Perlu Tindakan</h2>
            <Link href="/admin/notifikasi">Semua notifikasi</Link>
          </div>
          <ul className="admin-history">
            {data.notifications.slice(0, 12).map((row) => (
              <li key={row.key}>
                {row.title} <Link href={row.href}>Tinjau →</Link>
              </li>
            ))}
          </ul>
          {!data.notifications.length && (
            <p className="admin-empty">Tidak ada tindakan tertunda.</p>
          )}
        </section>
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <h2>Grafik penjualan</h2>
            <select
              aria-label="Periode grafik penjualan"
              value={period}
              onChange={(e) => {
                setData(null);
                setPeriod(e.target.value);
              }}
            >
              <option value="7">7 hari</option>
              <option value="30">30 hari</option>
              <option value="month">Bulan ini</option>
              <option value="year">Tahun ini</option>
            </select>
            <select
              aria-label="Ukuran grafik penjualan"
              value={metric}
              onChange={(e) => setMetric(e.target.value as typeof metric)}
            >
              <option value="revenue">Pendapatan</option>
              <option value="transactions">Jumlah transaksi</option>
              <option value="plants">Tanaman terjual</option>
            </select>
          </div>
          <figure className="admin-chart">
            {data.sales.length ? (
              <>
                <svg
                  viewBox="0 0 600 190"
                  role="img"
                  aria-label="Grafik penjualan terverifikasi"
                >
                  {data.sales.map((point, index) => (
                    <rect
                      key={point.date}
                      x={20 + (index * 560) / data.sales.length}
                      y={170 - (point[metric] / max) * 150}
                      width={Math.max(1, 500 / data.sales.length)}
                      height={(point[metric] / max) * 150}
                      fill="#123b61"
                    >
                      <title>
                        {point.date}: {point[metric]}
                      </title>
                    </rect>
                  ))}
                </svg>
                <ul>
                  {data.sales.map((point) => (
                    <li key={point.date}>
                      {point.date} · {point.transactions} transaksi ·{" "}
                      {rupiah(point.revenue)} · {point.plants} tanaman
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p>Belum ada penjualan terverifikasi pada periode ini.</p>
            )}
          </figure>
        </section>
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <h2>Distribusi persediaan</h2>
          </div>
          <div className="admin-chart">
            {["monitoring", "ready", "reserved", "sold", "damaged"].map(
              (key) => (
                <div className="admin-distribution" key={key}>
                  <span>
                    {labels[key]}: {data.metrics[key]}
                  </span>
                  <meter
                    min={0}
                    max={Math.max(
                      1,
                      data.metrics.physical +
                        data.metrics.sold +
                        data.metrics.damaged,
                    )}
                    value={data.metrics[key]}
                  />
                </div>
              ),
            )}
          </div>
        </section>
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <h2>Grafik pertumbuhan kelompok</h2>
            <select
              aria-label="Kelompok grafik pertumbuhan"
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
            >
              <option value="">Pilih kelompok</option>
              {batches.rows.map((b) => (
                <option key={b.id}>{b.id}</option>
              ))}
            </select>
          </div>
          {batches.error ? (
            <p role="alert">{batches.error}</p>
          ) : selected ? (
            <GrowthChart observations={selected.observations} />
          ) : (
            <p className="admin-empty">
              Pilih kelompok untuk melihat tren tinggi dan jumlah daun.
            </p>
          )}
        </section>
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <h2>Aktivitas terbaru</h2>
            <Link href="/admin/audit">Lihat audit</Link>
          </div>
          <ul className="admin-history">
            {data.activity.map((row) => (
              <li key={row.id}>
                {localDateTime(row.createdAt)} · {indonesianLabel(row.action)} ·{" "}
                {row.description}
              </li>
            ))}
          </ul>
          {!data.activity.length && (
            <p className="admin-empty">Belum ada aktivitas tercatat.</p>
          )}
        </section>
      </div>
    </>
  );
}
