"use client";
import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useShop } from "@/features/storefront/provider";
import { useNotification } from "@/components/notification-provider";
import { Dialog } from "@base-ui/react/dialog";
import { Popover } from "@base-ui/react/popover";
import { ChevronDown, X } from "lucide-react";

export function RowActions({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className="admin-action-trigger">
        Aksi <ChevronDown size={14} aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align="end"
          sideOffset={6}
          className="admin-action-positioner"
        >
          <Popover.Popup
            className="shop admin-action-menu"
            aria-label="Pilihan aksi"
            onClick={(event) => {
              const target = event.target as HTMLElement;
              const action = target.closest("button, a");
              if (action && !action.matches(":disabled")) setOpen(false);
            }}
          >
            {children}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function AdminModal({
  title,
  children,
  onClose,
  pending = false,
  detail = false,
  finalFocus,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  pending?: boolean;
  detail?: boolean;
  finalFocus?: RefObject<HTMLElement | null>;
}) {
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="admin-form-backdrop" />
        <Dialog.Popup
          className={`shop admin-form-modal${detail ? " admin-detail-modal" : ""}`}
          aria-label={title}
          finalFocus={finalFocus}
        >
          <button
            type="button"
            className="admin-form-close"
            aria-label={`Tutup ${title}`}
            disabled={pending}
            onClick={onClose}
          >
            <X size={20} aria-hidden="true" />
          </button>
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function DetailFields({
  fields,
}: {
  fields: { label: string; value: ReactNode }[];
}) {
  return (
    <dl className="admin-detail-fields">
      {fields.map(({ label, value }) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DeleteAction({
  path,
  name,
  onDeleted,
}: {
  path: string;
  name: string;
  onDeleted: () => void;
}) {
  const { adminRequest } = useShop();
  const { confirm, notify } = useNotification();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`Hapus ${name}`}
      data-destructive="true"
      onClick={async () => {
        setPending(true);
        try {
          if (
            !(await confirm({
              title: `Hapus ${name}?`,
              message:
                "Data akan dihapus permanen. Data yang masih digunakan atau memiliki histori operasional tidak dapat dihapus.",
              confirmLabel: "Ya, hapus",
              destructive: true,
            }))
          )
            return;
          await adminRequest(path, {}, "DELETE");
          onDeleted();
          notify({ kind: "success", message: "Data berhasil dihapus." });
        } catch (cause) {
          notify({
            kind: "error",
            message:
              cause instanceof Error ? cause.message : "Data gagal dihapus.",
          });
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? "Menghapus…" : "Hapus"}
    </button>
  );
}

export function useAdminRows<T>(path: string) {
  const { adminRequest } = useShop();
  const [rows, setRows] = useState<T[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    adminRequest<T[]>(path)
      .then((result) => {
        if (active) {
          setRows(result);
          setError("");
        }
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error ? cause.message : "Data gagal dimuat.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path, adminRequest, attempt]);
  return {
    rows,
    error,
    loading,
    reload: () => {
      setLoading(true);
      setAttempt((value) => value + 1);
    },
  };
}
export function Heading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="admin-page-heading">
      <div>
        <span className="admin-kicker">DSU ADMIN</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </div>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <label className="admin-field">
      <span id={id}>{label}</span>
      {isValidElement<{ "aria-labelledby"?: string }>(children)
        ? cloneElement(children, { "aria-labelledby": id })
        : children}
    </label>
  );
}
export function AdminForm({
  title,
  children,
  onSave,
  onCancel,
  modal = true,
  successMessage = "Data berhasil disimpan.",
}: {
  title: string;
  children: ReactNode;
  onSave: (values: FormData) => Promise<void | boolean>;
  onCancel: () => void;
  modal?: boolean;
  successMessage?: string;
}) {
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const { notify } = useNotification();
  const content = (
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <h2>{title}</h2>
      </div>
      <form
        className="admin-staff-form"
        onSubmit={async (event) => {
          event.preventDefault();
          const values = new FormData(event.currentTarget);
          setPending(true);
          setError("");
          try {
            if ((await onSave(values)) === false) return;
            notify({ kind: "success", message: successMessage });
            onCancel();
          } catch (cause) {
            setError(
              cause instanceof Error ? cause.message : "Data gagal disimpan.",
            );
          } finally {
            setPending(false);
          }
        }}
      >
        <fieldset disabled={pending}>
          {children}
          <div className="admin-actions">
            <button className="shop-button" type="submit">
              {pending ? "Menyimpan…" : "Simpan"}
            </button>
            <button
              className="shop-button secondary"
              type="button"
              onClick={onCancel}
            >
              Batal
            </button>
          </div>
        </fieldset>
        {error && <p role="alert">{error}</p>}
      </form>
    </section>
  );
  return modal ? (
    <AdminModal title={title} onClose={onCancel} pending={pending}>
      {content}
    </AdminModal>
  ) : (
    content
  );
}
export function DataTable<T>({
  rows,
  columns,
  loading,
  error,
  empty,
  filter,
  actions,
  searchLabel = "Cari data",
}: {
  rows: T[];
  columns: { label: string; value: (row: T) => ReactNode }[];
  loading: boolean;
  error: string;
  empty: string;
  filter?: ReactNode;
  actions?: (row: T) => ReactNode;
  searchLabel?: string;
}) {
  const [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [sort, setSort] = useState("newest");
  // ponytail: browser pagination fits a local nursery; move filtering to API for large datasets.
  const filtered = rows.filter((row) =>
    JSON.stringify(row).toLowerCase().includes(query.toLowerCase()),
  );
  if (sort !== "newest")
    filtered.sort(
      (a, b) =>
        JSON.stringify(a).localeCompare(JSON.stringify(b), "id") *
        (sort === "asc" ? 1 : -1),
    );
  const pages = Math.max(1, Math.ceil(filtered.length / 10)),
    current = Math.min(page, pages);
  return (
    <section className="admin-panel">
      <div className="admin-panel-heading admin-table-toolbar">
        <label className="admin-search">
          <input
            aria-label={searchLabel}
            value={query}
            placeholder={searchLabel}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </label>
        {filter}
        <select
          aria-label="Urutan tabel"
          value={sort}
          onChange={(event) => setSort(event.target.value)}
        >
          <option value="newest">Urutan data terbaru</option>
          <option value="asc">A–Z</option>
          <option value="desc">Z–A</option>
        </select>
      </div>
      {loading ? (
        <p className="admin-empty" role="status">
          Memuat data…
        </p>
      ) : error ? (
        <p className="admin-empty" role="alert">
          {error}
        </p>
      ) : (
        <>
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.label} scope="col">
                      {column.label}
                    </th>
                  ))}
                  {actions && (
                    <th scope="col" className="admin-table-actions">
                      Aksi
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered
                  .slice((current - 1) * 10, current * 10)
                  .map((row, index) => (
                    <tr key={index}>
                      {columns.map((column) => (
                        <td key={column.label}>{column.value(row)}</td>
                      ))}
                      {actions && (
                        <td className="admin-table-actions">
                          <RowActions>{actions(row)}</RowActions>
                        </td>
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {!filtered.length && (
            <p className="admin-empty">
              {query ? "Tidak ada hasil sesuai pencarian." : empty}
            </p>
          )}
          <div className="admin-panel-heading admin-table-footer">
            <span>
              {filtered.length} data · Halaman {current} dari {pages}
            </span>
            <div className="admin-actions">
              <button
                className="shop-button secondary"
                disabled={current <= 1}
                onClick={() => setPage(current - 1)}
              >
                Sebelumnya
              </button>
              <button
                className="shop-button secondary"
                disabled={current >= pages}
                onClick={() => setPage(current + 1)}
              >
                Berikutnya
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
export function PhotoUpload({
  purpose = "plant",
  defaultValue = "",
}: {
  purpose?: "plant" | "monitoring" | "payment";
  defaultValue?: string;
}) {
  const { adminRequest } = useShop();
  const [url, setUrl] = useState(defaultValue),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  return (
    <div>
      <Field label="Foto (PNG, JPEG, WebP; maksimal 5 MB)">
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-disabled={pending}
          ref={(input) => {
            input?.setCustomValidity(
              pending ? "Tunggu foto selesai diunggah." : error,
            );
          }}
          onChange={async (event) => {
            if (pending) return;
            const file = event.target.files?.[0];
            if (!file) return;
            setError("");
            if (file.size > 5 * 1024 * 1024) {
              setError("Ukuran foto maksimal 5 MB.");
              return;
            }
            setPending(true);
            try {
              const data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () =>
                  resolve(String(reader.result).split(",")[1]);
                reader.onerror = () => reject(new Error("Foto gagal dibaca."));
                reader.readAsDataURL(file);
              });
              const result = await adminRequest<{ url: string }>(
                "/media",
                { purpose, data },
                "POST",
              );
              setUrl(result.url);
            } catch (cause) {
              setError(
                cause instanceof Error ? cause.message : "Foto gagal diunggah.",
              );
            } finally {
              setPending(false);
            }
          }}
        />
      </Field>
      <input type="hidden" name="photoUrl" value={url} />
      {pending && <p role="status">Mengunggah foto…</p>}
      {error && <p role="alert">{error}</p>}
      {url && (
        <a href={url} target="_blank" rel="noreferrer">
          Lihat foto tersimpan
        </a>
      )}
    </div>
  );
}
export const value = (form: FormData, name: string) =>
  String(form.get(name) ?? "");
export const number = (form: FormData, name: string) =>
  Number(value(form, name));
