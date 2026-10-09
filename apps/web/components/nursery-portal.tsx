"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MascotHeading } from "@/components/dsu-mascot";
import {
  ArrowUpRight,
  ClipboardList,
  Package,
  Search,
  Sprout,
  Menu,
  CheckCircle2,
  LogOut,
  RefreshCw,
} from "lucide-react";
import {
  availableStock,
  plantAgeDays,
  type NurserySnapshot,
} from "@dsu/contracts";
import {
  indonesianLabel,
  localDate,
  localDateTime,
  plantAge,
} from "@/lib/format";
import { useShop } from "@/features/storefront/provider";
import { PhotoUpload } from "@/features/admin/shared";
import { ReadinessForm, type StaffApproval } from "@/features/admin/readiness";
import { useNotification } from "@/components/notification-provider";
import "@/features/admin/admin.css";
import "./nursery-portal.css";
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
  const router = useRouter();
  const { confirm, notify } = useNotification();
  const submitting = useRef(false);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [data, setData] = useState<
    | (NurserySnapshot & {
        ownerId: string;
        approvals: StaffApproval[];
        loadedAt: string;
      })
    | null
  >(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [retry, setRetry] = useState(0);
  const [view, setView] = useState("overview");
  const [menu, setMenu] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [saleBatchId, setSaleBatchId] = useState("");
  const [observationDirty, setObservationDirty] = useState(false);
  const [readinessDirty, setReadinessDirty] = useState(false);
  const [salePending, setSalePending] = useState(false);
  const changing = useRef(false);
  useEffect(() => {
    if (selected) document.getElementById("staff-batch-detail")?.focus();
  }, [selected]);
  useEffect(() => {
    if (user?.role !== "PETUGAS") return;
    let active = true;
    Promise.all([
      adminRequest<NurserySnapshot>("/petugas/nursery"),
      adminRequest<StaffApproval[]>("/petugas/approvals"),
    ])
      .then(([result, approvals]) => {
        if (active) {
          setData({
            ...result,
            approvals,
            ownerId: user.id,
            loadedAt: new Date().toISOString(),
          });
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
  const snapshot =
    data?.ownerId === user?.id && user?.role === "PETUGAS" ? data : null;
  const batches = snapshot?.batches ?? [];
  const observations = snapshot?.observations ?? [];
  const approvals = snapshot?.approvals ?? [];
  const latest = new Map(
    observations.map((row) => [row.batchId, row] as const).reverse(),
  );
  const needsMonitoring = batches.filter((batch) => {
    const last = latest.get(batch.id);
    return (
      !last ||
      (plantAgeDays(last.observedAt) ?? 0) >=
        (snapshot?.monitoringIntervalDays ?? 7)
    );
  });
  const filtered = batches.filter(
    (batch) =>
      (batch.species + batch.id + batch.location)
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (!category || batch.category === category) &&
      (!status || batch.status === status),
  );
  const filteredObservations = observations.filter((row) =>
    `${row.batchId} ${batches.find((batch) => batch.id === row.batchId)?.species ?? ""} ${row.condition} ${row.notes}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const nav = [
    { id: "overview", label: "Penugasan", icon: Sprout },
    {
      id: "observations",
      label: "Riwayat pemantauan",
      icon: ClipboardList,
    },
    { id: "approvals", label: "Pengajuan jual", icon: CheckCircle2 },
  ];
  const title = nav.find((item) => item.id === view)!.label;
  const saleBatch = batches.find((batch) => batch.id === saleBatchId);
  function recordApproval(approval: StaffApproval) {
    setData((current) =>
      current && current.ownerId === user?.id
        ? {
            ...current,
            approvals: [approval, ...current.approvals],
            batches: current.batches.map((batch) =>
              batch.id === approval.batchId
                ? { ...batch, status: "READY_REVIEW" }
                : batch,
            ),
          }
        : current,
    );
    setRetry((v) => v + 1);
  }
  async function discardDraft() {
    if (submitting.current || salePending || changing.current) return false;
    if (!observationDirty && !readinessDirty) return true;
    changing.current = true;
    try {
      return await confirm({
        title: "Tinggalkan isian yang belum disimpan?",
        message:
          "Isian pengamatan atau pengajuan Anda belum disimpan. Pilih Batal untuk melanjutkan mengisi, atau tinggalkan untuk berpindah.",
        confirmLabel: "Ya, tinggalkan",
      });
    } finally {
      changing.current = false;
    }
  }
  async function openBatch(id: string | null) {
    if (!(await discardDraft())) return false;
    setObservationDirty(false);
    setReadinessDirty(false);
    setSelected(id);
    setSaved(false);
    setSaveError("");
    return true;
  }
  async function navigate(nextView: string) {
    if (nextView === view) {
      setMenu(false);
      return;
    }
    if (!(await openBatch(null))) return;
    setView(nextView);
    setMenu(false);
    setQuery("");
    setCategory("");
    setStatus("");
  }
  async function signOut() {
    setMenu(false);
    if (
      !(await confirm({
        title: "Keluar dari portal petugas?",
        message:
          "Pastikan pengamatan sudah disimpan. Isian yang belum disimpan akan hilang.",
        confirmLabel: "Ya, keluar",
      }))
    )
      return;
    setLoggingOut(true);
    try {
      await logout();
      router.replace("/login");
    } catch (cause) {
      notify({
        kind: "error",
        message: cause instanceof Error ? cause.message : "Gagal keluar.",
      });
    } finally {
      setLoggingOut(false);
    }
  }
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
    <div className="app-shell staff-portal">
      <aside className="admin-sidebar">
        <Link href="/" className="admin-brand" aria-label="DSU — beranda">
          <Image
            src="/images/logo/dsu_logo.svg"
            alt="Delta Sinergi Utama"
            width={1798}
            height={875}
            unoptimized
          />
        </Link>
        <span className="admin-nav-label">AREA PETUGAS</span>
        <nav aria-label="Navigasi portal">
          {nav.map((item) => (
            <button
              key={item.id}
              disabled={saving || salePending}
              aria-current={view === item.id ? "page" : undefined}
              className="staff-nav-item"
              onClick={() => void navigate(item.id)}
            >
              <item.icon size={19} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <Link href="/">
            <ArrowUpRight size={18} /> Lihat situs
          </Link>
          <button
            disabled={saving || salePending || loggingOut}
            onClick={() => void signOut()}
          >
            <LogOut size={18} /> {loggingOut ? "Keluar…" : "Keluar"}
          </button>
        </div>
      </aside>
      <div className="admin-workspace">
        <header className="admin-topbar">
          <>
            <Drawer open={menu} onOpenChange={setMenu}>
              <DrawerTrigger
                className="admin-menu-toggle"
                aria-label="Buka navigasi"
                aria-expanded={menu}
              >
                <Menu size={21} />
              </DrawerTrigger>
              <DrawerContent
                side="left"
                className="admin-mobile-drawer staff-mobile-nav"
              >
                <DrawerHeader>
                  <DrawerTitle>Navigasi {"petugas"}</DrawerTitle>
                  <DrawerDescription>CV. Delta Sinergi Utama</DrawerDescription>
                </DrawerHeader>
                <nav aria-label="Navigasi ponsel">
                  {nav.map((item) => (
                    <button
                      key={item.id}
                      disabled={saving || salePending}
                      aria-current={view === item.id ? "page" : undefined}
                      className="staff-nav-item"
                      onClick={() => void navigate(item.id)}
                    >
                      <item.icon size={19} />
                      {item.label}
                    </button>
                  ))}
                </nav>
                <div className="staff-mobile-account">
                  <strong>{user.name}</strong>
                  <p>{user.email}</p>
                  <Button
                    variant="outline"
                    disabled={saving || salePending || loggingOut}
                    onClick={() => void signOut()}
                  >
                    <LogOut size={16} /> Keluar
                  </Button>
                </div>
              </DrawerContent>
            </Drawer>
            <span className="admin-breadcrumb">
              Petugas <span>/</span> <strong>{title}</strong>
            </span>
          </>
          <div className="admin-user">
            <span className="admin-avatar" aria-hidden="true">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{user.name}</strong>
              <small>Petugas</small>
            </div>
          </div>
        </header>
        <main id="main" className="page-content">
          <div className="page-heading">
            <MascotHeading file="maskot_one.webp" compact>
              <div className="eyebrow">{"OPERASIONAL PEMBIBITAN"}</div>
              <h1>{title}</h1>
              <p>
                {view === "approvals"
                  ? "Ajukan tanaman siap jual dan pantau hasil pemeriksaan admin."
                  : "Pengamatan manual untuk kelompok dalam penugasan Anda."}
              </p>
            </MascotHeading>
            <Button
              variant="outline"
              disabled={saving || salePending}
              onClick={() => {
                setError("");
                setRetry((v) => v + 1);
              }}
            >
              <RefreshCw size={16} /> Perbarui data
            </Button>
          </div>
          {snapshot && (
            <p className="staff-sync">
              Terakhir diperbarui {localDateTime(snapshot.loadedAt)} · Jadwal
              pemantauan setiap {snapshot.monitoringIntervalDays} hari
            </p>
          )}
          {snapshot && (
            <aside
              className="portal-guidance"
              aria-label="Panduan kerja petugas"
            >
              <strong>
                {view === "approvals"
                  ? "Cara mengajukan tanaman"
                  : view === "observations"
                    ? "Periksa riwayat pengamatan"
                    : "Langkah kerja petugas"}
              </strong>
              <p>
                {view === "approvals"
                  ? "Pilih kelompok tugas → pilih pengamatan sehat → isi jumlah dan catatan → ajukan. Stok siap jual bertambah setelah disetujui admin."
                  : view === "observations"
                    ? "Cari kelompok atau catatan. Buka rincian pengukuran untuk melihat sampel dan foto; koreksi pengamatan melalui menu Penugasan."
                    : "Periksa kelompok tugas → catat pengamatan → ajukan tanaman sehat melalui menu Pengajuan jual."}
              </p>
            </aside>
          )}
          {error && snapshot && (
            <div className="notice" role="alert">
              <p>{error} Data terakhir dan isian Anda tetap ditampilkan.</p>
              <Button variant="outline" onClick={() => setRetry((v) => v + 1)}>
                Coba lagi
              </Button>
            </div>
          )}
          {error && !snapshot ? (
            <ErrorState
              message={error}
              onRetry={() => {
                setData(null);
                setError("");
                setRetry((v) => v + 1);
              }}
            />
          ) : !snapshot ? (
            <LoadingState />
          ) : (
            <>
              {view === "overview" && (
                <>
                  <div className="stock-summary">
                    {[
                      {
                        label: "Kelompok ditugaskan",
                        value: batches.length,
                        unit: "kelompok",
                        note: "Dalam tanggung jawab Anda",
                      },
                      {
                        label: "Stok fisik",
                        value: batches.reduce(
                          (sum, batch) => sum + batch.physical,
                          0,
                        ),
                        unit: "tanaman",
                        note: "Seluruh kelompok tugas Anda",
                      },
                      {
                        label: "Perlu dipantau",
                        value: needsMonitoring.length,
                        unit: "kelompok",
                        note: "Belum Anda catat atau sudah jatuh tempo",
                      },
                      {
                        label: "Menunggu persetujuan",
                        value: approvals.filter(
                          (row) => row.status === "PENDING",
                        ).length,
                        unit: "pengajuan",
                        note: "Sedang diperiksa admin",
                      },
                    ].map((stat, index) => (
                      <div
                        className={index === 3 ? "stat highlighted" : "stat"}
                        key={stat.label}
                      >
                        <span>{stat.label}</span>
                        <strong>
                          {stat.value.toLocaleString("id-ID")}{" "}
                          <small>{stat.unit}</small>
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
                        <span className="portal-filter-label">
                          Cari kelompok
                        </span>
                        <input
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder="Cari tanaman, kode, atau lokasi…"
                        />
                      </label>
                      <label>
                        <span className="portal-filter-label">
                          Status kelompok
                        </span>
                        <select
                          value={status}
                          onChange={(event) => setStatus(event.target.value)}
                        >
                          <option value="">Semua status</option>
                          {Array.from(
                            new Set(batches.map((batch) => batch.status)),
                          ).map((value) => (
                            <option key={value} value={value}>
                              {indonesianLabel(value)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span className="portal-filter-label">
                          Kategori tanaman
                        </span>
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
                        <table className="staff-batches-table">
                          <thead>
                            <tr>
                              <th>Tanaman / kelompok</th>
                              <th>Lokasi</th>
                              <th>Umur tanaman</th>
                              <th>Pemantauan Anda</th>
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
                                  <span
                                    className="badge"
                                    data-status={batch.status}
                                  >
                                    {indonesianLabel(batch.status)}
                                  </span>
                                </td>
                                <td data-label="Lokasi">{batch.location}</td>
                                <td data-label="Umur tanaman">
                                  {plantAge(batch.plantedAt)}
                                </td>
                                <td data-label="Pemantauan Anda">
                                  {latest.has(batch.id) ? (
                                    <>
                                      <span>
                                        {localDate(
                                          latest.get(batch.id)!.observedAt,
                                        )}
                                      </span>
                                      <span
                                        className="cell-sub"
                                        data-health={
                                          latest.get(batch.id)!.health
                                        }
                                      >
                                        {indonesianLabel(
                                          latest.get(batch.id)!.health,
                                        )}
                                      </span>
                                    </>
                                  ) : (
                                    <span>Belum dicatat</span>
                                  )}
                                  {needsMonitoring.some(
                                    (row) => row.id === batch.id,
                                  ) && (
                                    <span className="cell-sub staff-due">
                                      Perlu dipantau
                                    </span>
                                  )}
                                </td>
                                <td className="number" data-label="Stok fisik">
                                  {batch.physical}
                                </td>
                                <td className="number" data-label="Siap jual">
                                  {batch.approved}
                                </td>
                                <td className="number" data-label="Reservasi">
                                  {batch.reserved}
                                </td>
                                <td className="number" data-label="Tersedia">
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
                                    aria-expanded={selected === batch.id}
                                    aria-controls="staff-batch-detail"
                                    disabled={saving || salePending}
                                    onClick={() =>
                                      openBatch(
                                        selected === batch.id ? null : batch.id,
                                      )
                                    }
                                  >
                                    <ArrowUpRight size={18} />
                                    <span className="staff-detail-label">
                                      {selected === batch.id
                                        ? "Tutup detail"
                                        : "Catat pengamatan"}
                                    </span>
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
                        {!!batches.length && (
                          <Button
                            variant="outline"
                            onClick={() => {
                              setQuery("");
                              setCategory("");
                              setStatus("");
                            }}
                          >
                            Reset pencarian dan filter
                          </Button>
                        )}
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
                        <section
                          className="panel detail-panel"
                          id="staff-batch-detail"
                          tabIndex={-1}
                          aria-label={`Detail ${b.species}`}
                          key={b.id}
                        >
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
                          <div className="staff-detail-stock">
                            <span>
                              Fisik <strong>{b.physical}</strong>
                            </span>
                            <span>
                              Disetujui <strong>{b.approved}</strong>
                            </span>
                            <span>
                              Reservasi <strong>{b.reserved}</strong>
                            </span>
                            <span>
                              Status{" "}
                              <strong>{indonesianLabel(b.status)}</strong>
                            </span>
                          </div>
                          <p>
                            Stok tersedia berasal dari persetujuan admin,
                            dikurangi reservasi aktif.
                          </p>
                          <form
                            key={formVersion}
                            onChange={() => {
                              setObservationDirty(true);
                              setSaved(false);
                            }}
                            onSubmit={async (event) => {
                              event.preventDefault();
                              if (submitting.current) return;
                              const form = event.currentTarget;
                              const values = new FormData(form);
                              submitting.current = true;
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
                                setObservationDirty(false);
                                setFormVersion((v) => v + 1);
                                setSaved(true);
                                setRetry((v) => v + 1);
                              } catch (cause) {
                                setSaveError(
                                  cause instanceof Error
                                    ? cause.message
                                    : "Pengamatan gagal disimpan.",
                                );
                              } finally {
                                submitting.current = false;
                                setSaving(false);
                              }
                            }}
                          >
                            <h3>Catat pengamatan</h3>
                            <p>
                              Metode, kondisi tanaman, dan tinggi sampel wajib
                              diisi. Jumlah daun, foto, dan catatan bersifat
                              opsional.
                            </p>
                            {observationDirty && (
                              <p className="portal-draft" role="status">
                                Isian pengamatan belum disimpan.
                              </p>
                            )}
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
                                    {observations
                                      .filter((o) => o.batchId === b.id)
                                      .map((o) => (
                                        <option key={o.id} value={o.id}>
                                          {localDateTime(o.observedAt)} ·{" "}
                                          {o.condition}
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
                            observations={observations}
                            approvals={approvals}
                            maxQuantity={Math.max(0, b.physical - b.approved)}
                            onSubmitted={recordApproval}
                            onDirtyChange={setReadinessDirty}
                            onPendingChange={setSalePending}
                          />
                          <Button
                            variant="outline"
                            disabled={saving || salePending}
                            onClick={() => openBatch(null)}
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
                  <div className="filters">
                    <label className="search">
                      <Search size={18} />
                      <span className="portal-filter-label">
                        Cari pemantauan
                      </span>
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Cari kelompok, kondisi, atau catatan…"
                      />
                    </label>
                  </div>
                  {filteredObservations.length ? (
                    filteredObservations.map((o) => (
                      <article className="observation" key={o.id}>
                        <span className="badge" data-health={o.health}>
                          {indonesianLabel(o.health)}
                        </span>
                        <h3>
                          {batches.find((b) => b.id === o.batchId)?.species} ·{" "}
                          {o.batchId}
                        </h3>
                        <p>
                          {localDateTime(o.observedAt)} · {o.condition}
                        </p>
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
                        <details>
                          <summary>
                            Lihat pengukuran {o.sampleCount} sampel
                          </summary>
                          <div
                            className="table-scroll"
                            role="region"
                            aria-label="Pengukuran sampel"
                            tabIndex={0}
                          >
                            <table>
                              <thead>
                                <tr>
                                  <th scope="col">Sampel</th>
                                  <th scope="col">Parameter</th>
                                  <th scope="col">Nilai</th>
                                </tr>
                              </thead>
                              <tbody>
                                {o.measurements.map((measurement) => (
                                  <tr
                                    key={`${measurement.sampleNumber}-${measurement.parameter}`}
                                  >
                                    <td>{measurement.sampleNumber}</td>
                                    <td>{measurement.parameter}</td>
                                    <td>
                                      {measurement.value} {measurement.unit}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </details>
                        {o.photoUrl && (
                          <p>
                            <a
                              href={o.photoUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Lihat foto pengamatan <ArrowUpRight size={14} />
                            </a>
                          </p>
                        )}
                        {o.correctionOf && (
                          <p className="staff-due">
                            Koreksi pengamatan{" "}
                            {observations.find(
                              (row) => row.id === o.correctionOf,
                            )
                              ? localDateTime(
                                  observations.find(
                                    (row) => row.id === o.correctionOf,
                                  )!.observedAt,
                                )
                              : o.correctionOf}
                            . Catatan awal tetap tersimpan.
                          </p>
                        )}
                        <p className="muted">
                          Rata-rata sampel tidak mewakili ukuran pasti seluruh
                          tanaman. Identitas individu tidak dilacak antarsesi.
                        </p>
                      </article>
                    ))
                  ) : (
                    <div className="empty">
                      <h3>
                        {query
                          ? "Tidak ada pemantauan ditemukan"
                          : "Belum ada pengamatan tersimpan"}
                      </h3>
                      <p>
                        {query
                          ? "Coba kata pencarian lain."
                          : "Buka detail kelompok ditugaskan untuk mencatat pengamatan pertama Anda."}
                      </p>
                    </div>
                  )}
                </section>
              )}
              {view === "approvals" && (
                <>
                  <section className="panel detail-panel staff-sale-form">
                    <h2>Buat pengajuan jual</h2>
                    {batches.length ? (
                      <>
                        <p>
                          <label htmlFor="sale-batch">Kelompok penugasan</label>
                          <select
                            id="sale-batch"
                            value={saleBatch?.id ?? ""}
                            disabled={salePending}
                            onChange={async (event) => {
                              const nextId = event.target.value;
                              if (await discardDraft()) {
                                setReadinessDirty(false);
                                setSaleBatchId(nextId);
                              }
                            }}
                          >
                            <option value="">
                              Pilih kelompok yang akan diajukan
                            </option>
                            {batches.map((batch) => (
                              <option key={batch.id} value={batch.id}>
                                {batch.species} · {batch.id}
                              </option>
                            ))}
                          </select>
                        </p>
                        {saleBatch && (
                          <ReadinessForm
                            key={saleBatch.id}
                            batchId={saleBatch.id}
                            observations={observations}
                            approvals={approvals}
                            maxQuantity={Math.max(
                              0,
                              saleBatch.physical - saleBatch.approved,
                            )}
                            onSubmitted={recordApproval}
                            onDirtyChange={setReadinessDirty}
                            onPendingChange={setSalePending}
                          />
                        )}
                      </>
                    ) : (
                      <p>
                        Belum ada kelompok yang ditugaskan kepada Anda. Hubungi
                        admin untuk penugasan.
                      </p>
                    )}
                  </section>
                  <section className="panel">
                    <div className="panel-title">
                      <div>
                        <h2>Status dan hasil pemeriksaan</h2>
                        <p>
                          {approvals.length} pengajuan Anda · Perbarui data
                          untuk melihat keputusan terbaru.
                        </p>
                      </div>
                      <CheckCircle2 size={22} />
                    </div>
                    {approvals.length ? (
                      approvals.map((row) => (
                        <article className="observation" key={row.id}>
                          <span className="badge" data-status={row.status}>
                            {indonesianLabel(row.status)}
                          </span>
                          <h3>
                            {batches.find((batch) => batch.id === row.batchId)
                              ?.species ?? row.batchId}
                          </h3>
                          <p>
                            {row.batchId} ·{" "}
                            {row.quantity.toLocaleString("id-ID")} tanaman
                          </p>
                          <p>Diajukan {localDateTime(row.createdAt)}</p>
                          <p>
                            <strong>
                              {row.reviewedAt
                                ? "Catatan pemeriksaan admin"
                                : "Catatan pengajuan"}
                              :
                            </strong>{" "}
                            {row.reason}
                          </p>
                          {row.reviewedAt ? (
                            <p>Ditinjau {localDateTime(row.reviewedAt)}</p>
                          ) : (
                            <p>
                              Menunggu pemeriksaan admin. Pengajuan ini belum
                              menambah stok siap jual.
                            </p>
                          )}
                          {batches.some(
                            (batch) => batch.id === row.batchId,
                          ) && (
                            <Button
                              variant="outline"
                              onClick={async () => {
                                if (!(await openBatch(row.batchId))) return;
                                setView("overview");
                                setQuery("");
                                setCategory("");
                                setStatus("");
                              }}
                            >
                              Buka kelompok
                            </Button>
                          )}
                        </article>
                      ))
                    ) : (
                      <div className="empty">
                        <h3>Belum ada pengajuan siap jual</h3>
                        <p>
                          Pilih kelompok di atas dan gunakan pengamatan sehat
                          untuk mengajukan jumlah tanaman siap jual.
                        </p>
                      </div>
                    )}
                  </section>
                </>
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
