"use client";
import { PasswordForm } from "./password";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { NurserySnapshot } from "@dsu/contracts";
import { useShop } from "@/features/storefront/provider";
import { DSUMascot } from "@/components/dsu-mascot";
import { localDateTime, plantAge } from "@/lib/format";
import { UserEditor, type ManagedUser } from "./operations";
import { useNotification } from "@/components/notification-provider";
import { AdminModal, DeleteAction, DetailFields, RowActions } from "./shared";

interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  active: boolean;
  createdAt: string;
}

export function AdminStaff() {
  const { adminRequest } = useShop();
  const assignmentReturnFocus = useRef<HTMLButtonElement | null>(null);
  const [data, setData] = useState<
    (NurserySnapshot & { staff: Staff[] }) | null
  >(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [success, setSuccess] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");
  const [assignmentSuccess, setAssignmentSuccess] = useState("");
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [resetting, setResetting] = useState<Staff | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const { confirm } = useNotification();

  async function updateAssignment(batchId: string, assignedTo: string | null) {
    if (
      assignedTo === null &&
      !(await confirm({
        title: "Batalkan penugasan?",
        message:
          "Kelompok kembali tersedia untuk penugasan baru. Histori pengamatan tetap disimpan.",
      }))
    )
      return;
    setAssigning(true);
    setAssignmentError("");
    setAssignmentSuccess("");
    try {
      await adminRequest(
        `/admin/batches/${encodeURIComponent(batchId)}/assignment`,
        { assignedTo },
        "PATCH",
      );
      setData((current) =>
        current
          ? {
              ...current,
              batches: current.batches.map((batch) =>
                batch.id === batchId ? { ...batch, assignedTo } : batch,
              ),
            }
          : current,
      );
      setAssignmentSuccess(
        assignedTo
          ? `Kelompok ${batchId} berhasil ditugaskan.`
          : `Penugasan kelompok ${batchId} dibatalkan.`,
      );
      return true;
    } catch (cause) {
      setAssignmentError(
        cause instanceof Error ? cause.message : "Penugasan gagal disimpan.",
      );
    } finally {
      setAssigning(false);
    }
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      adminRequest<Staff[]>("/admin/staff"),
      adminRequest<NurserySnapshot>("/admin/nursery"),
    ])
      .then(([staff, nursery]) => {
        if (active) {
          setData({ ...nursery, staff });
          setError("");
        }
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error ? cause.message : "Gagal memuat petugas.",
          );
      });
    return () => {
      active = false;
    };
  }, [adminRequest, attempt]);

  const current = data?.staff.find((staff) => staff.id === selected);
  const matches =
    data?.staff.filter(
      (staff) =>
        (!status || String(staff.active) === status) &&
        `${staff.name} ${staff.email}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    ) ?? [];
  const pages = Math.max(1, Math.ceil(matches.length / 10));
  const currentPage = Math.min(page, pages);
  const batches =
    data?.batches.filter((batch) => batch.assignedTo === selected) ?? [];
  const observations =
    data?.observations.filter(
      (observation) => observation.observedBy === selected,
    ) ?? [];

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="admin-kicker">OPERASIONAL PEMBIBITAN</span>
          <h1>Petugas</h1>
          <p>Kelola akun, pantau penugasan kelompok dan pengamatan lapangan.</p>
        </div>
        <DSUMascot file="maskot_four.webp" compact />
      </div>
      {editing && (
        <UserEditor
          key={editing.id}
          user={editing}
          onDone={() => {
            setEditing(null);
            setAttempt((value) => value + 1);
          }}
        />
      )}
      {resetting && (
        <PasswordForm target={resetting} onClose={() => setResetting(null)} />
      )}
      <button
        type="button"
        className="shop-button"
        onClick={() => {
          setCreateError("");
          setCreating(true);
        }}
      >
        Tambah petugas
      </button>
      {success && !current && <p role="status">{success}</p>}
      {creating && (
        <AdminModal
          title="Tambah petugas"
          pending={saving}
          onClose={() => setCreating(false)}
        >
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <h2>Tambah petugas</h2>
            </div>
            <form
              className="admin-staff-form"
              onSubmit={async (event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const values = new FormData(form);
                setSaving(true);
                setCreateError("");
                setSuccess("");
                try {
                  const staff = await adminRequest<Staff>(
                    "/admin/staff",
                    {
                      name: values.get("name"),
                      email: values.get("email"),
                      phone: values.get("phone"),
                      password: values.get("password"),
                    },
                    "POST",
                  );
                  form.reset();
                  setCreating(false);
                  setSelected(staff.id);
                  setSuccess(
                    `Akun ${staff.name} berhasil dibuat. Petugas dapat masuk melalui halaman login.`,
                  );
                  setAttempt((value) => value + 1);
                } catch (cause) {
                  setCreateError(
                    cause instanceof Error
                      ? cause.message
                      : "Akun gagal dibuat.",
                  );
                } finally {
                  setSaving(false);
                }
              }}
            >
              <fieldset disabled={saving}>
                <label>
                  Nama petugas
                  <input
                    name="name"
                    required
                    minLength={2}
                    maxLength={100}
                    autoComplete="name"
                  />
                </label>
                <label>
                  Surel petugas
                  <input
                    name="email"
                    type="email"
                    required
                    maxLength={191}
                    autoComplete="off"
                  />
                </label>
                <label>
                  Kata sandi awal
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={10}
                    maxLength={128}
                    autoComplete="new-password"
                    aria-describedby="staff-password-help"
                  />
                </label>
                <label>
                  Nomor telepon
                  <input name="phone" type="tel" maxLength={20} />
                </label>
                <p id="staff-password-help">
                  Minimal 10 karakter. Sampaikan surel dan kata sandi kepada
                  petugas agar dapat masuk.
                </p>
                <button className="shop-button" type="submit">
                  {saving ? "Menyimpan…" : "Tambah petugas"}
                </button>
                <button
                  className="shop-button secondary"
                  type="button"
                  onClick={() => setCreating(false)}
                >
                  Batal
                </button>
              </fieldset>
              {createError && <p role="alert">{createError}</p>}
            </form>
          </section>
        </AdminModal>
      )}
      <section className="admin-panel">
        <div className="admin-panel-heading admin-table-toolbar">
          <select
            aria-label="Penyaring status petugas"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Semua status</option>
            <option value="true">Aktif</option>
            <option value="false">Nonaktif</option>
          </select>
          <label className="admin-search">
            <input
              aria-label="Cari petugas"
              placeholder="Cari nama atau surel petugas"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>
        {error ? (
          <p role="alert">{error}</p>
        ) : !data ? (
          <p className="admin-empty">Memuat petugas…</p>
        ) : (
          <>
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Petugas</th>
                    <th>Status akun</th>
                    <th>Kelompok ditugaskan</th>
                    <th>Pengamatan</th>
                    <th>Pengamatan terakhir</th>
                    <th className="admin-table-actions">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {matches
                    .slice((currentPage - 1) * 10, currentPage * 10)
                    .map((staff) => {
                      const history = data.observations.filter(
                        (observation) => observation.observedBy === staff.id,
                      );
                      return (
                        <tr key={staff.id} data-staff-id={staff.id}>
                          <td>
                            <strong>{staff.name}</strong>
                            <small>{staff.email}</small>
                            <small>
                              {staff.phone || "Telepon belum diisi"}
                            </small>
                          </td>
                          <td>{staff.active ? "Aktif" : "Nonaktif"}</td>
                          <td>
                            {
                              data.batches.filter(
                                (batch) => batch.assignedTo === staff.id,
                              ).length
                            }
                          </td>
                          <td>{history.length}</td>
                          <td>
                            {history[0]
                              ? localDateTime(history[0].observedAt)
                              : "Belum ada pengamatan"}
                          </td>
                          <td className="admin-table-actions">
                            <RowActions>
                              <button
                                className="shop-button secondary"
                                onClick={() => setEditing(staff)}
                              >
                                Ubah profil / status
                              </button>
                              <button
                                className="shop-button secondary"
                                aria-label={`Pantau ${staff.name}`}
                                disabled={assigning}
                                onClick={() => {
                                  assignmentReturnFocus.current =
                                    document.querySelector<HTMLButtonElement>(
                                      `[data-staff-id="${staff.id}"] .admin-action-trigger`,
                                    );
                                  setSelected(staff.id);
                                  setAssignmentError("");
                                  setAssignmentSuccess("");
                                }}
                              >
                                Pantau
                              </button>
                              <button
                                type="button"
                                className="shop-button secondary"
                                onClick={() => setResetting(staff)}
                              >
                                Reset kata sandi
                              </button>
                              <DeleteAction
                                path={`/admin/users/${staff.id}`}
                                name={staff.name}
                                onDeleted={() => {
                                  setSelected("");
                                  setAttempt((value) => value + 1);
                                }}
                              />
                            </RowActions>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            <div className="admin-panel-heading admin-table-footer">
              <span>
                {matches.length} petugas · Halaman {currentPage} dari {pages}
              </span>
              <div className="admin-actions">
                <button
                  className="shop-button secondary"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  Sebelumnya
                </button>
                <button
                  className="shop-button secondary"
                  disabled={currentPage >= pages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Berikutnya
                </button>
              </div>
            </div>
            {!data.staff.some((staff) =>
              `${staff.name} ${staff.email}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            ) && (
              <p className="admin-empty">
                {query
                  ? "Tidak ada petugas yang sesuai pencarian."
                  : "Belum ada akun petugas."}
              </p>
            )}
          </>
        )}
      </section>
      {!error && current && (
        <AdminModal
          title={`Penugasan ${current.name}`}
          detail
          finalFocus={assignmentReturnFocus}
          pending={assigning}
          onClose={() => setSelected("")}
        >
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div>
                <h2>Penugasan {current.name}</h2>
                <p>Kelola kelompok tanaman dan tinjau pengamatan petugas.</p>
              </div>
              <Link className="shop-button secondary" href="/admin/batch">
                Kelola penugasan
              </Link>
            </div>
            <div className="admin-assignment-summary">
              <DetailFields
                fields={[
                  { label: "Surel", value: current.email },
                  {
                    label: "Status akun",
                    value: current.active ? "Aktif" : "Nonaktif",
                  },
                  { label: "Kelompok ditugaskan", value: batches.length },
                  { label: "Total pengamatan", value: observations.length },
                ]}
              />
              {success && (
                <p className="admin-note" role="status">
                  {success}
                </p>
              )}
            </div>
            <form
              key={current.id}
              className="admin-staff-form admin-assignment-form"
              onSubmit={async (event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const batchId = String(new FormData(form).get("batchId"));
                if (await updateAssignment(batchId, current.id)) form.reset();
              }}
            >
              <fieldset disabled={assigning || !current.active}>
                <label>
                  Kelompok untuk ditugaskan
                  <select name="batchId" required defaultValue="">
                    <option value="" disabled>
                      Pilih kelompok belum ditugaskan
                    </option>
                    {data?.batches
                      .filter((batch) => !batch.assignedTo)
                      .map((batch) => (
                        <option key={batch.id} value={batch.id}>
                          {batch.id} · {batch.species} · {batch.location}
                        </option>
                      ))}
                  </select>
                </label>
                <button
                  type="submit"
                  className="shop-button"
                  disabled={!data?.batches.some((batch) => !batch.assignedTo)}
                >
                  {assigning ? "Menyimpan…" : "Berikan penugasan"}
                </button>
              </fieldset>
              {!current.active && (
                <p>Akun petugas nonaktif tidak dapat menerima penugasan.</p>
              )}
              {!data?.batches.some((batch) => !batch.assignedTo) && (
                <p>
                  Tidak ada kelompok yang tersedia. Kelola penugasan melalui
                  menu Kelompok Tanaman.
                </p>
              )}
              {assignmentError && <p role="alert">{assignmentError}</p>}
              {assignmentSuccess && (
                <p role="status" aria-label="Status penugasan">
                  {assignmentSuccess}
                </p>
              )}
            </form>
            <section aria-labelledby="staff-assigned-batches">
              <div className="admin-panel-heading">
                <h3 id="staff-assigned-batches">Kelompok ditugaskan</h3>
              </div>
              <div className="admin-table-scroll">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Kelompok / tanaman</th>
                      <th>Lokasi</th>
                      <th>Umur tanaman</th>
                      <th>Stok fisik</th>
                      <th>Siap jual</th>
                      <th>Reservasi</th>
                      <th className="admin-table-actions">Penugasan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map((batch) => (
                      <tr key={batch.id}>
                        <td>
                          <strong>{batch.species}</strong>
                          <small>{batch.id}</small>
                        </td>
                        <td>{batch.location}</td>
                        <td>{plantAge(batch.plantedAt)}</td>
                        <td>{batch.physical}</td>
                        <td>{batch.approved}</td>
                        <td>{batch.reserved}</td>
                        <td className="admin-table-actions">
                          <button
                            type="button"
                            className="shop-button secondary"
                            data-destructive="true"
                            aria-label={`Batalkan penugasan ${batch.id}`}
                            disabled={assigning}
                            onClick={() =>
                              void updateAssignment(batch.id, null)
                            }
                          >
                            Batalkan penugasan
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!batches.length && (
                <p className="admin-empty">
                  Belum ada kelompok ditugaskan kepada petugas ini.
                </p>
              )}
            </section>
            <section className="admin-assignment-history">
              <div className="admin-panel-heading">
                <h3>Riwayat pengamatan {current.name}</h3>
              </div>
              {observations.map((observation) => (
                <article
                  className="admin-staff-observation"
                  key={observation.id}
                >
                  <h3>
                    {data?.batches.find(
                      (batch) => batch.id === observation.batchId,
                    )?.species ?? observation.batchId}{" "}
                    · {observation.batchId}
                  </h3>
                  <p>
                    {localDateTime(observation.observedAt)} ·{" "}
                    {observation.condition}
                  </p>
                  <p>
                    {observation.method} · {observation.sampleCount} sampel
                  </p>
                  <p>
                    Tinggi sampel:{" "}
                    {observation.measurements
                      .map(
                        (measurement) =>
                          `${measurement.value} ${measurement.unit}`,
                      )
                      .join("; ")}
                  </p>
                  <p>{observation.notes || "Tidak ada catatan tambahan."}</p>
                </article>
              ))}
              {!observations.length && (
                <p className="admin-empty">
                  Belum ada pengamatan dari petugas ini.
                </p>
              )}
            </section>
          </section>
        </AdminModal>
      )}
    </>
  );
}
