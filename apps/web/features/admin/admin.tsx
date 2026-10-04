"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Sprout,
  ArrowUpRight,
  LogOut,
  RefreshCw,
  Clock3,
  PackageCheck,
  Search,
  Menu,
  X,
} from "lucide-react";
import { orderLabels } from "@dsu/contracts";
import { useShop } from "@/features/storefront/provider";
import { LogoutDialog } from "@/features/storefront/logout-dialog";
import { ModalNotice } from "@/components/notification-provider";
import { DSUMascot } from "@/components/dsu-mascot";
import { rupiah, localDateTime } from "@/lib/format";
import type { ShopOrder } from "@/features/storefront/service";
import "@/features/storefront/storefront.css";
import "./admin.css";

const navigation = [
  { href: "/admin", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/admin/pesanan", label: "Pesanan", icon: ClipboardList },
  { href: "/admin/tanaman", label: "Katalog tanaman", icon: Sprout },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, loading, error, refresh, logout } = useShop();
  const pathname = usePathname();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  if (loading || error || user?.role !== "ADMIN")
    return (
      <main id="main" className="shop admin-gate">
        <DSUMascot file="maskot_two.webp" />
        <h1>
          {loading
            ? "Memuat administrasi…"
            : error
              ? "Layanan belum tersedia"
              : user
                ? "Akses ditolak"
                : "Masuk sebagai admin"}
        </h1>
        {error ? (
          <>
            <p>{error}</p>
            <button className="shop-button" onClick={() => void refresh()}>
              Coba lagi
            </button>
          </>
        ) : (
          !loading && (
            <>
              <p>
                {user
                  ? "Halaman ini hanya untuk admin."
                  : "Gunakan akun admin untuk mengelola pesanan dan melihat katalog."}
              </p>
              <Link className="shop-button" href={user ? "/" : "/login"}>
                {user ? "Kembali ke beranda" : "Masuk"}
              </Link>
            </>
          )
        )}
      </main>
    );
  const title =
    navigation.find((item) => item.href === pathname)?.label || "Administrasi";
  return (
    <div className="shop admin-shell">
      <aside className="admin-sidebar" data-open={menu}>
        <Link
          href="/admin"
          className="admin-brand"
          aria-label="DSU — dashboard admin"
        >
          <Image
            src="/images/logo/dsu_logo.svg"
            alt="Delta Sinergi Utama"
            width={1798}
            height={875}
            unoptimized
          />
        </Link>
        <span className="admin-nav-label">ADMINISTRASI</span>
        <nav aria-label="Navigasi admin">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              onClick={() => setMenu(false)}
            >
              <Icon size={19} aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <Link href="/">
            <ArrowUpRight size={18} />
            Lihat website
          </Link>
          <button onClick={() => setLogoutOpen(true)}>
            <LogOut size={18} />
            Keluar
          </button>
        </div>
      </aside>
      <div className="admin-workspace">
        <header className="admin-topbar">
          <button
            className="admin-menu-toggle"
            aria-label={menu ? "Tutup navigasi admin" : "Buka navigasi admin"}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X size={21} /> : <Menu size={21} />}
          </button>
          <span className="admin-breadcrumb">
            Administrasi <span>/</span> <strong>{title}</strong>
          </span>
          <div className="admin-user">
            <span className="admin-avatar">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{user.name}</strong>
              <small>Administrator</small>
            </div>
          </div>
        </header>
        <main id="main" className="admin-main">
          {children}
        </main>
        <footer className="admin-footer">
          CV. Delta Sinergi Utama <span>Administrasi pembibitan</span>
        </footer>
      </div>
      <LogoutDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        onLogout={async () => {
          await logout();
          router.replace("/login");
        }}
      />
    </div>
  );
}

export function AdminDashboard() {
  const { user, state, adminRequest } = useShop();
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    adminRequest<ShopOrder[]>("/admin/orders")
      .then((data) => {
        if (active) {
          setOrders(data);
          setError("");
        }
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Pesanan belum dapat dimuat.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [adminRequest, attempt]);
  const awaiting = orders.filter(
    (order) => order.status === "PENDING_CONFIRMATION",
  );
  const activeOrders = orders.filter((order) =>
    ["CONFIRMED", "PROCESSING", "READY_FOR_PICKUP", "SHIPPED"].includes(
      order.status,
    ),
  );
  const completed = orders.filter((order) => order.status === "COMPLETED");
  const recent = [...orders]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 5);
  const metrics = [
    {
      label: "Menunggu konfirmasi",
      value: awaiting.length,
      icon: Clock3,
      note: "Perlu ditindaklanjuti",
    },
    {
      label: "Pesanan aktif",
      value: activeOrders.length,
      icon: ClipboardList,
      note: "Dikonfirmasi hingga siap diambil",
    },
    {
      label: "Pesanan selesai",
      value: completed.length,
      icon: PackageCheck,
      note: "Seluruh pesanan yang diselesaikan",
    },
    {
      label: "Tanaman tersedia",
      value: state.products.filter((p) => p.available > 0).length,
      icon: Sprout,
      note: "Jenis tanaman di katalog",
    },
  ];
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="admin-kicker">DASHBOARD</span>
          <h1>Ringkasan usaha</h1>
          <p>
            Selamat datang, {user?.name}. Pantau pesanan dan ketersediaan
            tanaman Anda.
          </p>
        </div>
        <button
          className="shop-button secondary"
          onClick={() => {
            setLoading(true);
            setAttempt((n) => n + 1);
          }}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Perbarui data
        </button>
      </div>
      {error && <ModalNotice message={error} />}
      <div className="admin-metrics" aria-busy={loading}>
        {metrics.map(({ label, value, icon: Icon, note }) => (
          <article key={label}>
            <div>
              <span>{label}</span>
              <Icon size={20} />
            </div>
            <strong>{loading || error ? "—" : value}</strong>
            <small>{note}</small>
          </article>
        ))}
      </div>
      <div className="admin-overview-grid">
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>Pesanan terbaru</h2>
              <p>Lima pesanan terakhir yang masuk.</p>
            </div>
            <Link href="/admin/pesanan">
              Lihat semua <ArrowUpRight size={16} />
            </Link>
          </div>
          {loading ? (
            <p className="admin-empty" role="status">
              Memuat pesanan…
            </p>
          ) : error ? (
            <p className="admin-empty">
              Data pesanan belum dapat ditampilkan. Klik Perbarui data untuk
              mencoba lagi.
            </p>
          ) : !recent.length ? (
            <p className="admin-empty">Belum ada pesanan masuk.</p>
          ) : (
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Pesanan / pelanggan</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link href="/admin/pesanan">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </Link>
                        <strong>{order.contact.name}</strong>
                        <small>{localDateTime(order.createdAt)}</small>
                      </td>
                      <td>{rupiah(order.total)}</td>
                      <td>
                        <span
                          className="admin-status"
                          data-status={order.status}
                        >
                          {orderLabels[order.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <aside className="admin-panel admin-attention">
          <DSUMascot file="maskot_one.webp" />
          <span className="admin-kicker">TINDAK LANJUT</span>
          <h2>
            {loading || error
              ? "Pantau pesanan Anda"
              : awaiting.length
                ? `${awaiting.length} pesanan menunggu`
                : "Semua sudah ditinjau"}
          </h2>
          <p>
            Periksa percakapan WhatsApp pelanggan sebelum mengonfirmasi pesanan.
          </p>
          <Link href="/admin/pesanan" className="shop-button">
            Kelola pesanan <ArrowUpRight size={16} />
          </Link>
        </aside>
      </div>
      <section className="admin-summary">
        <div>
          <span>Nilai pesanan selesai</span>
          <strong>
            {loading || error
              ? "—"
              : rupiah(completed.reduce((sum, order) => sum + order.total, 0))}
          </strong>
        </div>
        <p>
          Total nilai pesanan berstatus selesai, di luar ongkir. Status pesanan
          tidak menunjukkan verifikasi pembayaran.
        </p>
      </section>
    </>
  );
}

export function AdminCatalog() {
  const { state, refresh } = useShop();
  const [query, setQuery] = useState("");
  const products = state.products.filter((product) =>
    `${product.id} ${product.name} ${product.category}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="admin-kicker">KATALOG</span>
          <h1>Katalog tanaman</h1>
          <p>Harga dan stok tersedia yang ditampilkan kepada pelanggan.</p>
        </div>
        <DSUMascot file="maskot_four.webp" compact />
      </div>
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <label className="admin-search">
            <Search size={18} />
            <input
              aria-label="Cari tanaman"
              placeholder="Cari nama atau kategori tanaman"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <button
            className="shop-button secondary"
            onClick={() => void refresh()}
          >
            <RefreshCw size={16} />
            Perbarui
          </button>
        </div>
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tanaman</th>
                <th>Kategori</th>
                <th>Harga</th>
                <th>Stok tersedia</th>
                <th>Katalog</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                    <small>{p.id}</small>
                  </td>
                  <td>{p.category}</td>
                  <td>{rupiah(p.price)}</td>
                  <td>
                    <strong>{p.available}</strong>
                    <small>tanaman</small>
                  </td>
                  <td>
                    <Link href={`/katalog/${p.id}`}>
                      Lihat tanaman <ArrowUpRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!products.length && (
          <p className="admin-empty">
            {query
              ? "Tidak ada tanaman yang sesuai pencarian."
              : "Belum ada tanaman di katalog."}
          </p>
        )}
      </section>
      <p className="admin-note">
        Stok tersedia sudah memperhitungkan kesiapan jual dan reservasi pesanan.
        Halaman ini menampilkan tanaman yang telah diterbitkan.
      </p>
    </>
  );
}
