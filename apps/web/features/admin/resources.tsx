"use client";
import { indonesianLabel } from "@/lib/format";
import { useState } from "react";
import { plantAgeDays } from "@dsu/contracts";
import { useShop } from "@/features/storefront/provider";
import { useNotification } from "@/components/notification-provider";
import { localDate, localDateTime, plantAge, rupiah } from "@/lib/format";
import {
  DeleteAction,
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

export interface Plant {
  id: string;
  name: string;
  category: string;
  variety: string;
  unit: string;
  active: boolean;
  minimumStock: number;
  parameters: { name: string; unit: string }[] | null;
  description: string;
  imageUrl: string | null;
  price: number;
  discountPrice: number | null;
  featured: boolean;
  published: boolean;
  batches: NurseryBatch[];
}
export interface NurseryBatch {
  id: string;
  productId: string;
  product: Plant;
  location: string;
  assignedTo: string | null;
  status: string;
  initialQuantity: number;
  physical: number;
  approved: number;
  reserved: number;
  sold: number;
  damaged: number;
  dead: number;
  publishedStock: number | null;
  notes: string;
  enteredAt: string;
  plantedAt: string | null;
  observations: Monitoring[];
  transactions: Movement[];
}
interface Category {
  id: string;
  name: string;
  active: boolean;
  plantCount: number;
}
interface Location {
  id: string;
  name: string;
  description: string;
  capacity: number;
  active: boolean;
}
export interface Monitoring {
  id: string;
  batchId: string;
  observedBy: string;
  observedAt: string;
  observer: { name: string };
  batch: NurseryBatch;
  sampleCount: number;
  measurements: { parameter: string; unit: string; value: number }[];
  method: string;
  health: string;
  condition: string;
  notes: string;
  photoUrl: string | null;
  correctionOf: string | null;
}
export interface Movement {
  id: string;
  batchId: string;
  kind: string;
  quantity: number;
  beforeQuantity: number | null;
  afterQuantity: number | null;
  reason: string;
  createdAt: string;
}
export const plantColumns = [
  {
    label: "Tanaman",
    value: (p: Plant) => (
      <>
        <strong>{p.name}</strong>
        <small>{p.id}</small>
      </>
    ),
  },
  { label: "Kategori", value: (p: Plant) => p.category },
  {
    label: "Umur tanaman",
    value: (p: Plant) => {
      const ages = p.batches
        .map((b) => plantAgeDays(b.plantedAt))
        .filter((age): age is number => age !== null);
      if (!ages.length) return "Belum tersedia";
      const min = Math.min(...ages),
        max = Math.max(...ages);
      return min === max ? `${min} hari` : `${min}–${max} hari`;
    },
  },
  {
    label: "Varietas / satuan",
    value: (p: Plant) => `${p.variety || "—"} / ${p.unit}`,
  },
  { label: "Status", value: (p: Plant) => (p.active ? "Aktif" : "Nonaktif") },
];
const batchColumns = [
  {
    label: "Kelompok / tanaman",
    value: (b: NurseryBatch) => (
      <>
        <strong>{b.id}</strong>
        <small>{b.product?.name}</small>
      </>
    ),
  },
  { label: "Lokasi", value: (b: NurseryBatch) => b.location },
  {
    label: "Umur tanaman",
    value: (b: NurseryBatch) => (
      <>
        <strong>{plantAge(b.plantedAt)}</strong>
        <small>
          {b.plantedAt
            ? `Ditanam ${localDate(b.plantedAt)}`
            : "Isi tanggal tanam pada kelompok"}
        </small>
      </>
    ),
  },
  { label: "Status", value: (b: NurseryBatch) => indonesianLabel(b.status) },
  {
    label: "Fisik / siap jual",
    value: (b: NurseryBatch) => `${b.physical} / ${b.approved}`,
  },
];

function GrowthParameterInputs({
  parameters,
}: {
  parameters: Plant["parameters"] | undefined;
}) {
  const [rows, setRows] = useState(() =>
    (
      parameters ?? [
        { name: "Tinggi", unit: "cm" },
        { name: "Jumlah daun", unit: "daun" },
      ]
    ).map((parameter, id) => ({ ...parameter, id })),
  );
  return (
    <div
      className="admin-growth-parameters"
      role="group"
      aria-label="Parameter pertumbuhan"
    >
      <h3>Parameter pertumbuhan</h3>
      <p>Isi nama dan satuan untuk setiap parameter yang dipantau.</p>
      {rows.map((row, index) => (
        <div className="admin-growth-parameter" key={row.id}>
          <Field label={`Nama parameter ${index + 1} *`}>
            <input
              name="parameterName"
              required
              maxLength={100}
              placeholder="Contoh: Tinggi"
              value={row.name}
              onChange={(event) =>
                setRows(
                  rows.map((item) =>
                    item.id === row.id
                      ? { ...item, name: event.target.value }
                      : item,
                  ),
                )
              }
            />
          </Field>
          <Field label={`Satuan parameter ${index + 1} *`}>
            <input
              name="parameterUnit"
              required
              maxLength={30}
              placeholder="Contoh: cm"
              value={row.unit}
              onChange={(event) =>
                setRows(
                  rows.map((item) =>
                    item.id === row.id
                      ? { ...item, unit: event.target.value }
                      : item,
                  ),
                )
              }
            />
          </Field>
          <button
            type="button"
            data-destructive="true"
            className="shop-button secondary"
            aria-label={`Hapus parameter ${index + 1}`}
            onClick={() => setRows(rows.filter((item) => item.id !== row.id))}
          >
            Hapus
          </button>
        </div>
      ))}
      {!rows.length && <p>Belum ada parameter pertumbuhan.</p>}
      <button
        type="button"
        className="shop-button secondary"
        disabled={rows.length >= 20}
        onClick={() =>
          setRows([
            ...rows,
            {
              id: Math.max(-1, ...rows.map((row) => row.id)) + 1,
              name: "",
              unit: "",
            },
          ])
        }
      >
        Tambah parameter
      </button>
      <small>Maksimal 20 parameter per tanaman.</small>
    </div>
  );
}

export function AdminPlants() {
  const table = useAdminRows<Plant>("/admin/products"),
    categories = useAdminRows<Category>("/admin/categories"),
    { adminRequest, settings } = useShop();
  const [draft, setDraft] = useState<Partial<Plant> | null>(null),
    [category, setCategory] = useState(""),
    [status, setStatus] = useState("");
  const { confirm } = useNotification();
  return (
    <>
      <Heading
        title="Tanaman"
        description="Data induk tanaman dan parameter pertumbuhan. Histori dipertahankan saat tanaman dinonaktifkan."
      />
      <button className="shop-button" onClick={() => setDraft({})}>
        Tambah tanaman
      </button>
      {draft && (
        <AdminForm
          key={draft.id ?? "new"}
          title={draft.id ? "Ubah tanaman" : "Tambah tanaman"}
          onCancel={() => setDraft(null)}
          onSave={async (form) => {
            const active = value(form, "active") === "true";
            if (
              !active &&
              draft.active &&
              !(await confirm({
                title: "Nonaktifkan tanaman?",
                message:
                  "Tanaman tidak muncul untuk kelompok baru atau katalog. Histori tetap tersimpan.",
              }))
            )
              return false;
            const fields = {
              name: value(form, "name"),
              category: value(form, "category"),
              variety: value(form, "variety"),
              unit: value(form, "unit"),
              description: value(form, "description"),
              imageUrl: value(form, "photoUrl") || null,
              minimumStock: number(form, "minimumStock"),
              active,
              parameters: form.getAll("parameterName").map((name, index) => ({
                name: String(name).trim(),
                unit: String(form.getAll("parameterUnit")[index] ?? "").trim(),
              })),
            };
            await adminRequest(
              draft.id ? `/admin/products/${draft.id}` : "/admin/products",
              draft.id ? fields : { id: value(form, "id"), ...fields },
              draft.id ? "PATCH" : "POST",
            );
            table.reload();
          }}
        >
          {!draft.id && (
            <Field label="Kode tanaman *">
              <input
                name="id"
                required
                maxLength={100}
                pattern="[a-zA-Z0-9_-]+"
              />
            </Field>
          )}
          <Field label="Nama tanaman *">
            <input
              name="name"
              required
              minLength={2}
              maxLength={150}
              defaultValue={draft.name}
            />
          </Field>
          <Field label="Kategori *">
            <select
              name="category"
              required
              defaultValue={draft.category ?? ""}
            >
              <option value="">Pilih kategori aktif</option>
              {categories.rows
                .filter((c) => c.active)
                .map((c) => (
                  <option key={c.id}>{c.name}</option>
                ))}
            </select>
          </Field>
          {categories.error && <p role="alert">{categories.error}</p>}
          <Field label="Varietas">
            <input
              name="variety"
              maxLength={100}
              defaultValue={draft.variety}
            />
          </Field>
          <Field label="Satuan *">
            <input
              name="unit"
              required
              defaultValue={draft.unit ?? "tanaman"}
              maxLength={30}
            />
          </Field>
          <Field label="Deskripsi">
            <textarea
              name="description"
              maxLength={10000}
              defaultValue={draft.description}
            />
          </Field>
          <Field label="Minimum stok *">
            <input
              name="minimumStock"
              type="number"
              min={0}
              max={1000000}
              required
              defaultValue={draft.minimumStock ?? settings?.minimumStock ?? 5}
            />
          </Field>
          <GrowthParameterInputs
            key={draft.id ?? "new"}
            parameters={draft.parameters}
          />
          <Field label="Status *">
            <select name="active" defaultValue={String(draft.active ?? true)}>
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
            </select>
          </Field>
          <PhotoUpload defaultValue={draft.imageUrl ?? ""} />
        </AdminForm>
      )}
      <DataTable
        {...table}

        rows={table.rows.filter(
          (p) =>
            (!category || p.category === category) &&
            (!status || String(p.active) === status),
        )}
        columns={plantColumns}
        empty="Belum ada data induk tanaman. Tambahkan tanaman pertama."
        filter={
          <>
            <select
              aria-label="Penyaring kategori"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Semua kategori</option>
              {categories.rows.map((c) => (
                <option key={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              aria-label="Penyaring status tanaman"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Semua status</option>
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
            </select>
          </>
        }
        actions={(p) => (
          <>
            <button onClick={() => setDraft(p)}>Lihat / Ubah</button>
            <DeleteAction
              path={`/admin/products/${encodeURIComponent(p.id)}`}
              name={p.name}
              onDeleted={table.reload}
            />
          </>
        )}
      />
    </>
  );
}

export function AdminMaster({
  kind,
}: {
  kind: "categories" | "nursery-locations";
}) {
  const table = useAdminRows<Category & Location>(`/admin/${kind}`),
    { adminRequest } = useShop(),
    { confirm } = useNotification();
  const [draft, setDraft] = useState<Partial<Category & Location> | null>(null),
    [status, setStatus] = useState("");
  const location = kind === "nursery-locations",
    title = location ? "Lokasi Pembibitan" : "Kategori";
  return (
    <>
      <Heading
        title={title}
        description={
          location
            ? "Lokasi fisik kelompok, kapasitas, dan status area pembibitan."
            : "Kelompok data induk tanaman dengan histori yang tetap tersimpan."
        }
      />
      <button className="shop-button" onClick={() => setDraft({})}>
        Tambah {location ? "lokasi" : "kategori"}
      </button>
      {draft && (
        <AdminForm
          key={draft.id ?? "new"}
          title={
            draft.id
              ? `Ubah ${title}`
              : `Tambah ${location ? "lokasi" : "kategori"}`
          }
          onCancel={() => setDraft(null)}
          onSave={async (form) => {
            const fields = {
              name: value(form, "name"),
              active: value(form, "active") === "true",
              ...(location
                ? {
                    description: value(form, "description"),
                    capacity: number(form, "capacity"),
                  }
                : {}),
            };
            if (
              !fields.active &&
              draft.active &&
              !(await confirm({
                title: `Nonaktifkan ${title}?`,
                message:
                  "Data tidak dapat dipilih untuk data baru. Histori tetap disimpan.",
              }))
            )
              return false;
            await adminRequest(
              `/admin/${kind}${draft.id ? `/${draft.id}` : ""}`,
              {
                ...fields,
                ...(location && !draft.id ? { id: value(form, "id") } : {}),
              },
              draft.id ? "PATCH" : "POST",
            );
            table.reload();
          }}
        >
          {location && !draft.id && (
            <Field label="Kode lokasi *">
              <input
                name="id"
                required
                pattern="[a-zA-Z0-9_-]+"
                maxLength={100}
              />
            </Field>
          )}
          <Field label="Nama *">
            <input
              name="name"
              required
              minLength={2}
              maxLength={location ? 150 : 100}
              defaultValue={draft.name}
            />
          </Field>
          {location && (
            <>
              <Field label="Deskripsi">
                <textarea
                  name="description"
                  maxLength={1000}
                  defaultValue={draft.description}
                />
              </Field>
              <Field label="Kapasitas (0 = tidak dibatasi) *">
                <input
                  name="capacity"
                  type="number"
                  required
                  min={0}
                  max={1000000}
                  defaultValue={draft.capacity ?? 0}
                />
              </Field>
            </>
          )}
          <Field label="Status *">
            <select name="active" defaultValue={String(draft.active ?? true)}>
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
            </select>
          </Field>
        </AdminForm>
      )}
      <DataTable
        {...table}

        rows={table.rows.filter((r) => !status || String(r.active) === status)}
        filter={
          <select
            aria-label="Penyaring status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Semua status</option>
            <option value="true">Aktif</option>
            <option value="false">Nonaktif</option>
          </select>
        }
        columns={[
          { label: "Nama", value: (r) => r.name },
          {
            label: location ? "Kapasitas" : "Jumlah tanaman",
            value: (r) =>
              location ? r.capacity || "Tidak dibatasi" : r.plantCount,
          },
          { label: "Status", value: (r) => (r.active ? "Aktif" : "Nonaktif") },
        ]}
        empty={`Belum ada ${title.toLowerCase()}. Tambahkan data pertama.`}
        actions={(r) => (
          <>
            <button onClick={() => setDraft(r)}>Ubah</button>
            <DeleteAction
              path={`/admin/${kind}/${encodeURIComponent(r.id)}`}
              name={r.name}
              onDeleted={table.reload}
            />
          </>
        )}
      />
    </>
  );
}

export function AdminBatches() {
  const table = useAdminRows<NurseryBatch>("/admin/batches"),
    plants = useAdminRows<Plant>("/admin/products"),
    locations = useAdminRows<Location>("/admin/nursery-locations"),
    staff = useAdminRows<{ id: string; name: string; active: boolean }>(
      "/admin/staff",
    ),
    { adminRequest } = useShop(),
    { confirm } = useNotification();
  const [draft, setDraft] = useState<Partial<NurseryBatch> | null>(null),
    [detail, setDetail] = useState<NurseryBatch | null>(null),
    [status, setStatus] = useState("");
  return (
    <>
      <Heading
        title="Kelompok Tanaman"
        description="Penerimaan tanaman, penugasan petugas, lokasi dan histori setiap kelompok."
      />
      <button className="shop-button" onClick={() => setDraft({})}>
        Tambah kelompok
      </button>
      {draft && (
        <AdminForm
          key={draft.id ?? "new"}
          title={draft.id ? "Ubah kelompok" : "Tambah kelompok"}
          onCancel={() => setDraft(null)}
          onSave={async (form) => {
            const fields = {
              location: value(form, "location"),
              assignedTo: value(form, "assignedTo") || null,
              enteredAt: value(form, "enteredAt"),
              plantedAt: value(form, "plantedAt") || null,
              notes: value(form, "notes"),
            };
            const archive = value(form, "archive") === "true";
            if (
              archive &&
              !(await confirm({
                title: "Arsipkan kelompok?",
                message:
                  "Kelompok tidak akan ditawarkan atau ditugaskan lagi. Semua histori tetap tersimpan.",
              }))
            )
              return false;
            await adminRequest(
              `/admin/batches${draft.id ? `/${draft.id}` : ""}`,
              draft.id
                ? { ...fields, ...(archive ? { status: "ARCHIVED" } : {}) }
                : {
                    ...fields,
                    id: value(form, "id"),
                    productId: value(form, "productId"),
                    physical: number(form, "physical"),
                    status: value(form, "status"),
                  },
              draft.id ? "PATCH" : "POST",
            );
            table.reload();
          }}
        >
          {!draft.id && (
            <>
              <Field label="Kode kelompok *">
                <input
                  name="id"
                  required
                  pattern="[a-zA-Z0-9_-]+"
                  maxLength={100}
                />
              </Field>
              <Field label="Tanaman *">
                <select name="productId" required>
                  <option value="">Pilih tanaman</option>
                  {plants.rows
                    .filter((p) => p.active)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Jumlah awal *">
                <input
                  name="physical"
                  type="number"
                  min={0}
                  max={1000000}
                  required
                />
              </Field>
              <Field label="Status awal *">
                <select name="status">
                  <option>MONITORING</option>
                  <option>DRAFT</option>
                </select>
              </Field>
            </>
          )}
          <Field label="Tanggal masuk *">
            <input
              name="enteredAt"
              type="date"
              required
              defaultValue={
                draft.enteredAt?.slice(0, 10) ??
                new Date().toLocaleDateString("en-CA", {
                  timeZone: "Asia/Jakarta",
                })
              }
            />
          </Field>
          <Field label="Tanggal tanam">
            <input
              name="plantedAt"
              type="date"
              defaultValue={draft.plantedAt?.slice(0, 10)}
            />
          </Field>
          <p>
            Umur tanaman dihitung otomatis dari tanggal tanam, bukan tanggal
            masuk pembibitan.
          </p>
          <Field label="Lokasi pembibitan *">
            <select
              name="location"
              required
              defaultValue={draft.location ?? ""}
            >
              <option value="">Pilih lokasi aktif</option>
              {locations.rows
                .filter((l) => l.active)
                .map((l) => (
                  <option key={l.id}>{l.name}</option>
                ))}
            </select>
          </Field>
          <Field label="Petugas">
            <select name="assignedTo" defaultValue={draft.assignedTo ?? ""}>
              <option value="">Belum ditugaskan</option>
              {staff.rows
                .filter((s) => s.active)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Catatan">
            <textarea
              name="notes"
              maxLength={1000}
              defaultValue={draft.notes}
            />
          </Field>
          {draft.id && (
            <Field label="Arsip kelompok">
              <select name="archive" defaultValue="false">
                <option value="false">Pertahankan status</option>
                <option value="true">Arsipkan</option>
              </select>
            </Field>
          )}
          {[plants.error, locations.error, staff.error]
            .filter(Boolean)
            .map((error) => (
              <p role="alert" key={error}>
                {error}
              </p>
            ))}
        </AdminForm>
      )}
      <DataTable
        {...table}

        rows={table.rows.filter((b) => !status || b.status === status)}
        filter={
          <select
            aria-label="Penyaring status kelompok"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Semua status</option>
            {[...new Set(table.rows.map((b) => b.status))].map((s) => (
              <option key={s} value={s}>
                {indonesianLabel(s)}
              </option>
            ))}
          </select>
        }
        columns={batchColumns}
        empty="Belum ada kelompok. Buat kelompok untuk mulai mencatat stok."
        actions={(b) => (
          <>
            <button onClick={() => setDetail(b)}>Lihat histori</button>
            <button onClick={() => setDraft(b)}>
              Ubah / Tugaskan / Pindahkan
            </button>
            <DeleteAction
              path={`/admin/batches/${encodeURIComponent(b.id)}`}
              name={`kelompok ${b.id}`}
              onDeleted={() => {
                setDetail(null);
                table.reload();
              }}
            />
          </>
        )}
      />
      {detail && (
        <AdminModal
          detail
          title={`Histori ${detail.id}`}
          onClose={() => setDetail(null)}
        >
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <h2>Histori {detail.id}</h2>
            </div>
            <DetailFields
              fields={[
                { label: "Tanaman", value: detail.product?.name },
                { label: "Lokasi", value: detail.location },
                {
                  label: "Jumlah awal",
                  value: `${detail.initialQuantity} tanaman`,
                },
                { label: "Stok fisik", value: `${detail.physical} tanaman` },
                { label: "Umur tanaman", value: plantAge(detail.plantedAt) },
                { label: "Status", value: indonesianLabel(detail.status) },
              ]}
            />
            <p className="admin-note">
              <strong>Catatan</strong>
              {detail.notes || "Tidak ada catatan."}
            </p>
            <GrowthChart observations={detail.observations ?? []} />
            <h3 className="admin-detail-section-title">
              Riwayat pergerakan stok
            </h3>
            <ul className="admin-history">
              {detail.transactions?.map((movement) => (
                <li key={movement.id}>
                  {localDateTime(movement.createdAt)} ·{" "}
                  {indonesianLabel(movement.kind)} · {movement.quantity} ·{" "}
                  {movement.reason}
                </li>
              ))}
            </ul>
            {!detail.transactions?.length && (
              <p className="admin-note">Belum ada pergerakan stok.</p>
            )}
          </section>
        </AdminModal>
      )}
    </>
  );
}

export function GrowthChart({
  observations,
}: {
  observations: Pick<
    Monitoring,
    "id" | "observedAt" | "measurements" | "sampleCount"
  >[];
}) {
  const points = [...observations].sort((a, b) =>
    a.observedAt.localeCompare(b.observedAt),
  );
  return (
    <div className="admin-chart-grid">
      {["Tinggi", "Jumlah daun"].map((parameter) => {
        const samples = points
          .map((o) => {
            const values = o.measurements.filter(
              (m) => m.parameter === parameter,
            );
            return {
              date: o.observedAt,
              value: values.length
                ? values.reduce((sum, m) => sum + m.value, 0) / values.length
                : null,
            };
          })
          .filter(
            (o): o is { date: string; value: number } => o.value !== null,
          );
        const max = Math.max(1, ...samples.map((o) => o.value));
        return (
          <figure className="admin-chart" key={parameter}>
            <figcaption>
              Tren {parameter.toLowerCase()} (
              {parameter === "Tinggi" ? "cm" : "daun"})
            </figcaption>
            {samples.length ? (
              <>
                <svg
                  viewBox="0 0 500 150"
                  role="img"
                  aria-label={`Grafik ${parameter.toLowerCase()} rata-rata sampel`}
                >
                  <polyline
                    fill="none"
                    stroke="#123b61"
                    strokeWidth="3"
                    points={samples
                      .map(
                        (o, i) =>
                          `${20 + (i * 460) / Math.max(1, samples.length - 1)},${130 - (o.value / max) * 110}`,
                      )
                      .join(" ")}
                  />
                  {samples.map((o, i) => (
                    <circle
                      key={i}
                      cx={20 + (i * 460) / Math.max(1, samples.length - 1)}
                      cy={130 - (o.value / max) * 110}
                      r="4"
                      fill="#123b61"
                    >
                      <title>
                        {localDateTime(o.date)}: {o.value.toFixed(1)}
                      </title>
                    </circle>
                  ))}
                </svg>
                <ol>
                  {samples.map((o, i) => (
                    <li key={i}>
                      {localDateTime(o.date)}: {o.value.toFixed(1)}
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <p>Belum ada data parameter ini.</p>
            )}
          </figure>
        );
      })}
    </div>
  );
}

export function AdminInventory() {
  const table = useAdminRows<NurseryBatch>("/admin/batches"),
    movements = useAdminRows<Movement>("/admin/movements"),
    { adminRequest } = useShop(),
    { confirm } = useNotification();
  const [draft, setDraft] = useState<NurseryBatch | null>(null),
    [low, setLow] = useState(false);
  return (
    <>
      <Heading
        title="Persediaan"
        description="Total kumulatif = tersedia fisik + reservasi + terjual + rusak + mati. Siap jual adalah bagian stok fisik yang disetujui."
      />
      {draft && (
        <AdminForm
          key={draft.id}
          title={`Koreksi stok ${draft.id} (sebelum: ${draft.physical})`}
          onCancel={() => setDraft(null)}
          onSave={async (form) => {
            if (
              !(await confirm({
                title: "Simpan perubahan stok?",
                message:
                  "Perubahan akan dicatat di stock movement dan audit. Stok reservasi tetap dilindungi.",
              }))
            )
              return false;
            await adminRequest(
              `/admin/batches/${draft.id}/inventory`,
              {
                kind: value(form, "kind"),
                quantity: number(form, "quantity"),
                reason: value(form, "reason"),
              },
              "POST",
            );
            table.reload();
            movements.reload();
          }}
        >
          <Field label="Jenis perubahan *">
            <select name="kind">
              <option value="ADJUSTMENT">Koreksi jumlah fisik akhir</option>
              <option value="STOCK_IN">Stok masuk (jumlah tambahan)</option>
              <option value="DAMAGED">Tanaman rusak</option>
              <option value="DEAD">Tanaman mati</option>
              <option value="RETURN">Retur tanaman terjual</option>
            </select>
          </Field>
          <Field label="Jumlah *">
            <input
              name="quantity"
              required
              type="number"
              min={0}
              max={1000000}
            />
          </Field>
          <Field label="Alasan dan catatan *">
            <textarea name="reason" required minLength={5} maxLength={1000} />
          </Field>
        </AdminForm>
      )}
      <DataTable
        {...table}

        rows={table.rows.filter(
          (b) => !low || b.physical - b.reserved <= b.product.minimumStock,
        )}
        filter={
          <label>
            <input
              type="checkbox"
              checked={low}
              onChange={(e) => setLow(e.target.checked)}
            />{" "}
            Stok rendah
          </label>
        }
        columns={[
          ...batchColumns,
          {
            label: "Total kumulatif",
            value: (b) => b.physical + b.sold + b.damaged + b.dead,
          },
          { label: "Tersedia fisik", value: (b) => b.physical - b.reserved },
          { label: "Reservasi", value: (b) => b.reserved },
          {
            label: "Terjual / rusak / mati",
            value: (b) => `${b.sold} / ${b.damaged} / ${b.dead}`,
          },
        ]}
        empty="Belum ada stok tercatat. Buat kelompok terlebih dahulu."
        actions={(b) => (
          <>
            <button
              onClick={() => setDraft(b)}
              disabled={b.status === "ARCHIVED"}
            >
              Koreksi stok
            </button>
            <DeleteAction
              path={`/admin/batches/${encodeURIComponent(b.id)}`}
              name={`kelompok ${b.id}`}
              onDeleted={() => {
                table.reload();
                movements.reload();
              }}
            />
          </>
        )}
      />
      <h2>Pergerakan stok</h2>
      <DataTable
        {...movements}

        columns={[
          { label: "Tanggal", value: (m) => localDateTime(m.createdAt) },
          { label: "Kelompok", value: (m) => m.batchId },
          { label: "Jenis", value: (m) => indonesianLabel(m.kind) },
          {
            label: "Jumlah / sebelum / sesudah",
            value: (m) =>
              `${m.quantity} / ${m.beforeQuantity ?? "—"} / ${m.afterQuantity ?? "—"}`,
          },
          { label: "Alasan", value: (m) => m.reason },
        ]}
        empty="Belum ada pergerakan stok."
      />
    </>
  );
}

export function AdminMonitoring() {
  const table = useAdminRows<Monitoring>("/admin/monitoring");
  const [health, setHealth] = useState(""),
    [batch, setBatch] = useState(""),
    [staff, setStaff] = useState(""),
    [plant, setPlant] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [detail, setDetail] = useState<Monitoring | null>(null);
  return (
    <>
      <Heading
        title="Pemantauan Tanaman"
        description="Pengamatan petugas bersifat historis. Koreksi dilakukan petugas dengan catatan baru, bukan mengubah data lama."
      />
      <section
        className="admin-panel admin-monitoring-filters"
        aria-label="Penyaring pemantauan"
      >
        <div className="admin-panel-heading">
          <h2>Penyaring pemantauan</h2>
          <button
            type="button"
            className="shop-button secondary"
            disabled={!health && !batch && !staff && !plant && !from && !to}
            onClick={() => {
              setHealth("");
              setBatch("");
              setStaff("");
              setPlant("");
              setFrom("");
              setTo("");
            }}
          >
            Bersihkan penyaring
          </button>
        </div>
        <div className="admin-monitoring-filter-grid">
          <Field label="Kondisi tanaman">
            <select
              aria-label="Penyaring kesehatan"
              value={health}
              onChange={(e) => setHealth(e.target.value)}
            >
              <option value="">Semua kondisi</option>
              {["HEALTHY", "NEEDS_ATTENTION", "CRITICAL"].map((s) => (
                <option key={s} value={s}>
                  {
                    {
                      HEALTHY: "Sehat",
                      NEEDS_ATTENTION: "Perlu perhatian",
                      CRITICAL: "Kritis",
                    }[s]
                  }
                </option>
              ))}
            </select>
          </Field>
          <Field label="Kelompok">
            <select
              aria-label="Penyaring kelompok"
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
            >
              <option value="">Semua kelompok</option>
              {[...new Set(table.rows.map((o) => o.batchId))].map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </Field>
          <Field label="Petugas">
            <select
              aria-label="Penyaring petugas"
              value={staff}
              onChange={(e) => setStaff(e.target.value)}
            >
              <option value="">Semua petugas</option>
              {[
                ...new Map(
                  table.rows.map((o) => [o.observedBy, o.observer?.name]),
                ).entries(),
              ].map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tanaman">
            <select
              aria-label="Penyaring tanaman"
              value={plant}
              onChange={(e) => setPlant(e.target.value)}
            >
              <option value="">Semua tanaman</option>
              {[
                ...new Map(
                  table.rows.map((o) => [
                    o.batch.productId,
                    o.batch.product?.name,
                  ]),
                ).entries(),
              ].map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Dari tanggal">
            <input
              aria-label="Dari tanggal pemantauan"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </Field>
          <Field label="Sampai tanggal">
            <input
              aria-label="Sampai tanggal pemantauan"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </Field>
        </div>
      </section>
      <DataTable
        {...table}

        rows={table.rows.filter(
          (o) =>
            (!health || o.health === health) &&
            (!batch || o.batchId === batch) &&
            (!staff || o.observedBy === staff) &&
            (!plant || o.batch.productId === plant) &&
            (!from ||
              new Date(o.observedAt) >= new Date(`${from}T00:00:00+07:00`)) &&
            (!to || new Date(o.observedAt) <= new Date(`${to}T23:59:59+07:00`)),
        )}
        columns={[
          { label: "Tanggal", value: (o) => localDateTime(o.observedAt) },
          {
            label: "Kelompok / tanaman",
            value: (o) => `${o.batchId} / ${o.batch?.product?.name}`,
          },
          { label: "Petugas", value: (o) => o.observer?.name },
          {
            label: "Umur saat pemantauan",
            value: (o) => plantAge(o.batch.plantedAt, o.observedAt),
          },
          { label: "Kesehatan", value: (o) => indonesianLabel(o.health) },
          { label: "Kondisi", value: (o) => o.condition },
        ]}
        empty="Belum ada pengamatan. Tugaskan kelompok kepada petugas untuk memulai pemantauan."
        actions={(o) => (
          <button onClick={() => setDetail(o)}>Lihat detail / riwayat</button>
        )}
      />
      {detail && (
        <AdminModal
          detail
          title={`Detail pemantauan ${detail.batchId}`}
          onClose={() => setDetail(null)}
        >
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <h2>
                {detail.batchId} · {detail.condition}
              </h2>
            </div>
            <DetailFields
              fields={[
                { label: "Tanaman", value: detail.batch.product?.name },
                { label: "Petugas", value: detail.observer?.name },
                {
                  label: "Tanggal pemantauan",
                  value: localDateTime(detail.observedAt),
                },
                { label: "Metode", value: detail.method },
                { label: "Jumlah sampel", value: detail.sampleCount },
                { label: "Kesehatan", value: indonesianLabel(detail.health) },
              ]}
            />
            <div className="admin-staff-observation">
              <p>
                <strong>Catatan</strong>
                {detail.notes || "Tidak ada catatan."}
              </p>
              {detail.correctionOf && (
                <p>Koreksi atas pengamatan {detail.correctionOf}</p>
              )}
              {detail.photoUrl && (
                <a href={detail.photoUrl} target="_blank" rel="noreferrer">
                  Lihat foto pemantauan
                </a>
              )}
            </div>
            <GrowthChart
              observations={table.rows.filter(
                (o) => o.batchId === detail.batchId,
              )}
            />
          </section>
        </AdminModal>
      )}
    </>
  );
}

export function AdminCatalogEditor() {
  const table = useAdminRows<Plant>("/admin/products"),
    { adminRequest } = useShop(),
    { confirm } = useNotification();
  const [draft, setDraft] = useState<Plant | null>(null),
    [status, setStatus] = useState("");
  return (
    <>
      <Heading
        title="Katalog"
        description="Atur harga, diskon, foto dan stok publik dari kelompok yang telah disetujui."
      />
      {draft && (
        <AdminForm
          key={draft.id}
          title={`Entri katalog ${draft.name}`}
          onCancel={() => setDraft(null)}
          onSave={async (form) => {
            const published = value(form, "published") === "true";
            if (
              !published &&
              draft.published &&
              !(await confirm({
                title: "Unpublish katalog?",
                message:
                  "Tanaman tidak dapat dipesan lagi. Pesanan dan histori tetap tersimpan.",
              }))
            )
              return false;
            await adminRequest(
              `/admin/products/${draft.id}/catalog`,
              {
                price: number(form, "price"),
                discountPrice: value(form, "discountPrice")
                  ? number(form, "discountPrice")
                  : null,
                description: value(form, "description"),
                imageUrl: value(form, "photoUrl") || null,
                featured: value(form, "featured") === "true",
                published,
                batches: draft.batches.map((b) => ({
                  id: b.id,
                  publishedStock: number(form, `stock-${b.id}`),
                })),
              },
              "PATCH",
            );
            table.reload();
          }}
        >
          <Field label="Harga *">
            <input
              name="price"
              required
              type="number"
              min={0}
              max={2147483647}
              defaultValue={draft.price}
            />
          </Field>
          <Field label="Harga diskon (opsional)">
            <input
              name="discountPrice"
              type="number"
              min={0}
              max={2147483647}
              defaultValue={draft.discountPrice ?? ""}
            />
          </Field>
          <Field label="Deskripsi">
            <textarea
              name="description"
              defaultValue={draft.description}
              maxLength={10000}
            />
          </Field>
          <PhotoUpload defaultValue={draft.imageUrl ?? ""} />
          <Field label="Produk unggulan">
            <select name="featured" defaultValue={String(draft.featured)}>
              <option value="false">Tidak</option>
              <option value="true">Ya</option>
            </select>
          </Field>
          <Field label="Publikasi">
            <select name="published" defaultValue={String(draft.published)}>
              <option value="false">Unpublished</option>
              <option value="true">Published</option>
            </select>
          </Field>
          {draft.batches.map((b) => (
            <Field
              key={b.id}
              label={`${b.id} · ${indonesianLabel(b.status)} · tersedia ${b.approved - b.reserved}`}
            >
              <input
                name={`stock-${b.id}`}
                type="number"
                min={0}
                max={
                  ["READY_FOR_SALE", "PARTIALLY_SOLD"].includes(b.status)
                    ? b.approved - b.reserved
                    : 0
                }
                required
                defaultValue={Math.min(
                  b.publishedStock ?? 0,
                  b.approved - b.reserved,
                )}
              />
            </Field>
          ))}
          <p>
            Stok publik tidak boleh melebihi stok siap jual tersedia. Harga
            berlaku untuk seluruh kelompok tanaman pada entri katalog ini.
          </p>
        </AdminForm>
      )}
      <DataTable
        {...table}

        rows={table.rows.filter(
          (p) => !status || String(p.published) === status,
        )}
        columns={[
          ...plantColumns,
          {
            label: "Harga / diskon",
            value: (p) =>
              `${rupiah(p.price)} / ${p.discountPrice === null ? "—" : rupiah(p.discountPrice)}`,
          },
          {
            label: "Publikasi",
            value: (p) =>
              p.published
                ? p.batches.some((b) => (b.publishedStock ?? 0) > 0)
                  ? "PUBLISHED"
                  : "SOLD_OUT"
                : "UNPUBLISHED",
          },
        ]}
        filter={
          <select
            aria-label="Penyaring publikasi"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Semua publikasi</option>
            <option value="true">Published</option>
            <option value="false">Unpublished</option>
          </select>
        }
        empty="Belum ada tanaman. Buat data induk tanaman dan kelompok terlebih dahulu."
        actions={(p) => (
          <>
            <button onClick={() => setDraft(p)}>
              Ubah entri katalog / Terbitkan
            </button>
            <DeleteAction
              path={`/admin/products/${encodeURIComponent(p.id)}`}
              name={p.name}
              onDeleted={table.reload}
            />
          </>
        )}
      />
    </>
  );
}
