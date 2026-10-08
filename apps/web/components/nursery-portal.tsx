"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MascotHeading } from "@/components/dsu-mascot";
import {
  ArrowLeft,
  ArrowUpRight,
  ClipboardList,
  Package,
  Search,
  Sprout,
  Menu,
} from "lucide-react";
import { availableStock, type NurserySnapshot } from "@dsu/contracts";
import { localDate, plantAge } from "@/lib/format";
import { useShop } from "@/features/storefront/provider";
import { PhotoUpload } from "@/features/admin/shared";
import { ReadinessForm } from "@/features/admin/readiness";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/ui/feedback";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerTrigger,
} from "@/components/ui/drawer";
/** Authenticated portal; batch ownership is enforced by the API. */
export function NurseryPortal() {
  const {
    user,
    loading,
    error: sessionError,
    refresh,
    logout,
    adminRequest,
  } = useShop();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [data, setData] = useState<
    (NurserySnapshot & { ownerId: string }) | null
  >(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [retry, setRetry] = useState(0);
  const [view, setView] = useState("overview");
  const [menu, setMenu] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    if (user?.role !== "PETUGAS") return;
    let active = true;
    adminRequest<NurserySnapshot>("/petugas/nursery")
      .then((result) => {
        if (active) {
          setData({ ...result, ownerId: user.id });
          setError("");
        }
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error ? cause.message : "Gagal memuat data",
          );
      });
    return () => {
      active = false;
    };
  }, [user, adminRequest, retry]);
  const batches = data?.batches ?? [];
  const filtered = batches.filter(
    (batch) =>
      (batch.species + batch.id + batch.location)
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (!category || batch.category === category),
  );
  const totals = batches.reduce(
    (sum, b) => ({
      physical: sum.physical + b.physical,
      approved: sum.approved + b.approved,
      reserved: sum.reserved + b.reserved,
    }),
    { physical: 0, approved: 0, reserved: 0 },
  );
  const title =
    view === "observations" ? "Riwayat pemantauan" : "Kelompok ditugaskan";
  const nav = [
    { id: "overview", label: "Kelompok ditugaskan", icon: Sprout },
    {
      id: "observations",
      label: "Riwayat pemantauan",
      icon: ClipboardList,
    },
  ];
  if (loading) return <LoadingState />;
  if (sessionError)
    return <ErrorState message={sessionError} onRetry={() => void refresh()} />;
  if (user?.role !== "PETUGAS")
    return (
      <main id="main" className="page-content">
        <h1>{user ? "Akses ditolak" : "Masuk sebagai petugas"}</h1>
        <p>Halaman ini hanya untuk akun petugas.</p>
        <Link href={user ? "/" : "/login"}>
          {user ? "Kembali ke beranda" : "Masuk"}
        </Link>
      </main>
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <strong>CV. Delta Sinergi Utama</strong>
          <span>Sistem Informasi Pembibitan</span>
        </Link>
        <div className="sidebar-label">{"AREA PETUGAS"}</div>
        <nav aria-label="Navigasi portal">
          {nav.map((item) => (
            <button
              key={item.id}
              aria-current={view === item.id ? "page" : undefined}
              className={view === item.id ? "nav-item active" : "nav-item"}
              onClick={() => {
                setView(item.id);
                setMenu(false);
                setQuery("");
                setSelected(null);
              }}
            >
              <item.icon size={19} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="badge">Petugas</span>
          <p>{user.name}</p>
          <Button
            variant="outline"
            onClick={() =>
              void logout().catch((cause: unknown) =>
                setError(
                  cause instanceof Error ? cause.message : "Gagal keluar.",
                ),
              )
            }
          >
            Keluar
          </Button>
          <Link href="/">
            <ArrowLeft size={16} /> Beranda
          </Link>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <>
            <Drawer open={menu} onOpenChange={setMenu}>
              <DrawerTrigger className="mobile-menu" aria-label="Buka navigasi">
                <Menu />
              </DrawerTrigger>
              <DrawerContent side="left">
                <DrawerHeader>
                  <DrawerTitle>Navigasi {"petugas"}</DrawerTitle>
                  <DrawerDescription>CV. Delta Sinergi Utama</DrawerDescription>
                </DrawerHeader>
                <nav aria-label="Navigasi ponsel" className="px-4">
                  {nav.map((item) => (
                    <button
                      key={item.id}
                      className={
                        view === item.id ? "nav-item active" : "nav-item"
                      }
                      onClick={() => {
                        setView(item.id);
                        setMenu(false);
                        setSelected(null);
                        setQuery("");
                      }}
                    >
                      <item.icon size={19} />
                      {item.label}
                    </button>
                  ))}
                </nav>
              </DrawerContent>
            </Drawer>
            <span>
              Pembibitan <span className="muted">/ {"Petugas"}</span>
            </span>
          </>
          <span className="user-label">{user.name} · Petugas</span>
        </header>
        <main id="main" className="page-content">
          <div className="page-heading">
            <MascotHeading file="maskot_one.webp" compact>
              <div className="eyebrow">{"OPERASIONAL PEMBIBITAN"}</div>
              <h1>{title}</h1>
              <p>{"Pengamatan manual untuk kelompok dalam penugasan Anda."}</p>
            </MascotHeading>
            <Button
              variant="outline"
              onClick={() => {
                setData(null);
                setError("");
                setRetry((v) => v + 1);
              }}
            >
              Perbarui data
            </Button>
          </div>
          {error ? (
            <ErrorState
              message={error}
              onRetry={() => {
                setData(null);
                setError("");
                setRetry((v) => v + 1);
              }}
            />
          ) : !data || data.ownerId !== user.id ? (
            <LoadingState />
          ) : (
            <>
              {view !== "observations" && (
                <>
                  <div className="stock-summary">
                    {[
                      {
                        label: "Stok fisik",
                        value: totals.physical,
                        note: "Seluruh tanaman tercatat",
                      },
                      {
                        label: "Siap jual disetujui",
                        value: totals.approved,
                        note: "Telah disetujui admin",
                      },
                      {
                        label: "Terreservasi",
                        value: totals.reserved,
                        note: "Dialokasikan ke pesanan",
                      },
                      {
                        label: "Tersedia dipesan",
                        value: availableStock(totals),
                        note: "Siap jual dikurangi reservasi",
                      },
                    ].map((stat, index) => (
                      <div
                        className={index === 3 ? "stat highlighted" : "stat"}
                        key={stat.label}
                      >
                        <span>{stat.label}</span>
                        <strong>
                          {stat.value.toLocaleString("id-ID")}{" "}
                          <small>tanaman</small>
                        </strong>
                        <p>{stat.note}</p>
                      </div>
                    ))}
                  </div>

                  <section className="panel">
                    <div className="panel-title">
                      <div>
                        <h2>{"Kelompok dalam penugasan"}</h2>
                        <p>
                          {batches.length} kelompok ·{" "}
                          {"Hanya kelompok tugas Anda"}
                        </p>
                      </div>
                      <Package size={22} />
                    </div>
                    <div className="filters">
                      <label className="search">
                        <Search size={18} />
                        <span className="sr-only">Cari kelompok</span>
                        <input
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder="Cari tanaman, kode, atau lokasi…"
                        />
                      </label>
                      <label>
                        <span className="sr-only">Kategori tanaman</span>
                        <select
                          value={category}
                          onChange={(event) => setCategory(event.target.value)}
                        >
                          <option value="">Semua kategori</option>
                          {Array.from(
                            new Set(batches.map((b) => b.category)),
                          ).map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    {filtered.length ? (
                      <div
                        className="table-scroll"
                        role="region"
                        aria-label="Stok per kelompok"
                        tabIndex={0}
                      >
                        <table>
                          <thead>
                            <tr>
                              <th>Tanaman / kelompok</th>
                              <th>Lokasi</th>
                              <th>Umur tanaman</th>
                              <th className="number">Fisik</th>
                              <th className="number">Siap jual</th>
                              <th className="number">Reservasi</th>
                              <th className="number">Tersedia</th>
                              <th>Detail</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map((batch) => (
                              <tr key={batch.id}>
                                <td>
                                  <strong>{batch.species}</strong>
                                  <span className="cell-sub">
                                    {batch.id} · {batch.category}
                                  </span>
                                </td>
                                <td>{batch.location}</td>
                                <td>{plantAge(batch.plantedAt)}</td>
                                <td className="number">{batch.physical}</td>
                                <td className="number">{batch.approved}</td>
                                <td className="number">{batch.reserved}</td>
                                <td className="number">
                                  <span
                                    className={
                                      availableStock(batch)
                                        ? "badge success"
                                        : "badge"
                                    }
                                  >
                                    {availableStock(batch)}
                                  </span>
                                </td>
                                <td>
                                  <button
                                    className="detail-button"
                                    aria-label={`Lihat ${batch.id}`}
                                    onClick={() =>
                                      setSelected(
                                        selected === batch.id ? null : batch.id,
                                      )
                                    }
                                  >
                                    <ArrowUpRight size={18} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="empty">
                        <h3>Tidak ada kelompok ditemukan</h3>
                        <p>
                          {batches.length
                            ? "Coba kata pencarian atau kategori lain."
                            : "Belum ada kelompok yang ditugaskan kepada Anda. Hubungi admin untuk penugasan."}
                        </p>
                      </div>
                    )}
                    <div className="panel-footer">
                      Menampilkan {filtered.length} dari {batches.length}{" "}
                      kelompok · Satuan: tanaman
                    </div>
                  </section>
                  {selected &&
                    batches
                      .filter((b) => b.id === selected)
                      .map((b) => (
                        <section className="panel detail-panel" key={b.id}>
                          <h2>
                            {b.species} · {b.id}
                          </h2>
                          <p>
                            {b.location} ·{" "}
                            {b.plantedAt
                              ? `Ditanam ${localDate(b.plantedAt)}`
                              : "Tanggal tanam belum tercatat"}
                          </p>
                          <p>Umur tanaman: {plantAge(b.plantedAt)}</p>
                          <p>
                            Stok tersedia berasal dari persetujuan admin,
                            dikurangi reservasi aktif.
                          </p>
                          <form
                            onSubmit={async (event) => {
                              event.preventDefault();
                              const form = event.currentTarget;
                              const values = new FormData(form);
                              setSaving(true);
                              setSaveError("");
                              setSaved(false);
                              try {
                                await adminRequest(
                                  "/petugas/batches/" +
                                    encodeURIComponent(b.id) +
                                    "/observations",
                                  {
                                    method: values.get("method"),
                                    condition: values.get("condition"),
                                    notes: values.get("notes"),
                                    health: values.get("health"),
                                    photoUrl: values.get("photoUrl") || null,
                                    correctionOf:
                                      values.get("correctionOf") || null,
                                    ...(String(
                                      values.get("leafCounts") || "",
                                    ).trim()
                                      ? {
                                          leafCounts: String(
                                            values.get("leafCounts"),
                                          )
                                            .split(/[;\s]+/)
                                            .filter(Boolean)
                                            .map(Number),
                                        }
                                      : {}),
                                    heights: String(values.get("heights"))
                                      .split(/[;\s]+/)
                                      .filter(Boolean)
                                      .map(Number),
                                  },
                                  "POST",
                                );
                                form.reset();
                                setSaved(true);
                                setRetry((v) => v + 1);
                              } catch (cause) {
                                setSaveError(
                                  cause instanceof Error
                                    ? cause.message
                                    : "Pengamatan gagal disimpan.",
                                );
                              } finally {
                                setSaving(false);
                              }
                            }}
                          >
                            <h3>Catat pengamatan</h3>
                            <fieldset disabled={saving}>
                              <p>
                                <label>
                                  Status kesehatan
                                  <select name="health">
                                    <option value="HEALTHY">Sehat</option>
                                    <option value="NEEDS_ATTENTION">
                                      Perlu perhatian
                                    </option>
                                    <option value="CRITICAL">Kritis</option>
                                  </select>
                                </label>
                              </p>
                              <p>
                                <label>
                                  Jumlah daun per sampel (opsional)
                                  <input
                                    name="leafCounts"
                                    placeholder="Contoh: 8; 10; 9"
                                  />
                                </label>
                              </p>
                              <p>
                                <label>
                                  Koreksi pengamatan sebelumnya
                                  <select name="correctionOf" defaultValue="">
                                    <option value="">Pengamatan baru</option>
                                    {data.observations
                                      .filter((o) => o.batchId === b.id)
                                      .map((o) => (
                                        <option key={o.id} value={o.id}>
                                          {o.observedAt} · {o.condition}
                                        </option>
                                      ))}
                                  </select>
                                </label>
                              </p>
                              <PhotoUpload purpose="monitoring" />
                              <p>
                                <label>
                                  Metode{" "}
                                  <input
                                    name="method"
                                    required
                                    minLength={2}
                                    maxLength={100}
                                    placeholder="Contoh: sampel acak"
                                  />
                                </label>
                              </p>
                              <p>
                                <label>
                                  Kondisi tanaman{" "}
                                  <input
                                    name="condition"
                                    required
                                    minLength={2}
                                    maxLength={100}
                                  />
                                </label>
                              </p>
                              <p>
                                <label>
                                  Tinggi sampel (cm){" "}
                                  <input
                                    name="heights"
                                    required
                                    aria-describedby="sample-help"
                                  />
                                </label>
                              </p>
                              <p id="sample-help">
                                Pisahkan angka dengan spasi atau titik koma.
                                Contoh: 42; 45; 39. Gunakan titik untuk desimal.
                                Maksimal 100 sampel.
                              </p>
                              <p>
                                <label>
                                  Catatan{" "}
                                  <textarea name="notes" maxLength={1000} />
                                </label>
                              </p>
                              <Button type="submit">
                                {saving ? "Menyimpan…" : "Simpan pengamatan"}
                              </Button>
                            </fieldset>
                            {saveError && <p role="alert">{saveError}</p>}
                            {saved && (
                              <p role="status">Pengamatan berhasil disimpan.</p>
                            )}
                          </form>
                          <ReadinessForm
                            batchId={b.id}
                            observations={data.observations}
                          />
                          <Button
                            variant="outline"
                            onClick={() => setSelected(null)}
                          >
                            Tutup detail
                          </Button>
                        </section>
                      ))}
                </>
              )}
              {view === "observations" && (
                <section className="panel">
                  <div className="panel-title">
                    <h2>Hasil pengamatan terbaru</h2>
                  </div>
                  {data.observations.filter((o) =>
                    batches.some((b) => b.id === o.batchId),
                  ).length ? (
                    data.observations
                      .filter((o) => batches.some((b) => b.id === o.batchId))
                      .map((o) => (
                        <article className="observation" key={o.id}>
                          <span className="badge success">{o.condition}</span>
                          <h3>
                            {o.batchId} · {localDate(o.observedAt)}
                          </h3>
                          <p>
                            {o.method} · {o.sampleCount} sampel · WIB
                          </p>
                          <p>
                            Rata-rata tinggi:{" "}
                            {(
                              o.measurements
                                .filter((m) => m.parameter === "Tinggi")
                                .reduce((sum, m) => sum + m.value, 0) /
                              o.sampleCount
                            ).toFixed(1)}{" "}
                            cm
                          </p>
                          <p>{o.notes}</p>
                          <p className="muted">
                            Rata-rata sampel tidak mewakili ukuran pasti seluruh
                            tanaman. Identitas individu tidak dilacak antarsesi.
                          </p>
                        </article>
                      ))
                  ) : (
                    <div className="empty">Belum ada pengamatan tersimpan.</div>
                  )}
                </section>
              )}
            </>
          )}

          <footer className="page-footer">
            CV. Delta Sinergi Utama{" "}
            <span>Persediaan · Pemantauan · Pesanan daring</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
