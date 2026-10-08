"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Sprout,
  ArrowUpRight,
  LogOut,
  Bell,
  PackageCheck,
  Menu,
  X,
  Users,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useShop } from "@/features/storefront/provider";
import { LogoutDialog } from "@/features/storefront/logout-dialog";
import { DSUMascot } from "@/components/dsu-mascot";
import "@/features/storefront/storefront.css";
import "./admin.css";
import { AdminNotifications, AdminSearch } from "./system";
import { AdminModal } from "./shared";

const navigation = [
  { href: "/admin", label: "Beranda", icon: LayoutDashboard, group: "" },
  {
    href: "/admin/tanaman",
    label: "Tanaman",
    icon: Sprout,
    group: "Pembibitan",
  },
  {
    href: "/admin/kategori",
    label: "Kategori",
    icon: Sprout,
    group: "Pembibitan",
  },
  {
    href: "/admin/batch",
    label: "Kelompok Tanaman",
    icon: Sprout,
    group: "Pembibitan",
  },
  {
    href: "/admin/lokasi",
    label: "Lokasi Pembibitan",
    icon: Sprout,
    group: "Pembibitan",
  },
  {
    href: "/admin/inventory",
    label: "Persediaan",
    icon: PackageCheck,
    group: "Pembibitan",
  },
  {
    href: "/admin/monitoring",
    label: "Pemantauan Tanaman",
    icon: ClipboardList,
    group: "Pemantauan",
  },
  {
    href: "/admin/approval",
    label: "Persetujuan Siap Jual",
    icon: ClipboardList,
    group: "Pemantauan",
  },
  {
    href: "/admin/katalog",
    label: "Katalog",
    icon: Sprout,
    group: "Penjualan",
  },
  {
    href: "/admin/pesanan",
    label: "Pesanan",
    icon: ClipboardList,
    group: "Penjualan",
  },
  {
    href: "/admin/pembayaran",
    label: "Pembayaran",
    icon: PackageCheck,
    group: "Penjualan",
  },
  { href: "/admin/petugas", label: "Petugas", icon: Users, group: "Pengguna" },
  {
    href: "/admin/pelanggan",
    label: "Pelanggan",
    icon: Users,
    group: "Pengguna",
  },
  {
    href: "/admin/laporan",
    label: "Laporan",
    icon: ClipboardList,
    group: "Laporan",
  },
  {
    href: "/admin/audit",
    label: "Catatan Aktivitas",
    icon: ClipboardList,
    group: "Sistem",
  },
  {
    href: "/admin/pengaturan",
    label: "Pengaturan",
    icon: ClipboardList,
    group: "Sistem",
  },
];

function AdminNotificationBell() {
  const { adminRequest } = useShop();
  const pathname = usePathname();
  const [unread, setUnread] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const rows = await adminRequest<{ read: boolean }[]>(
          "/admin/notifications",
        );
        if (active) setUnread(rows.filter((row) => !row.read).length);
      } catch {
        // Keep the last known count; the notification modal offers error recovery.
      }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60000);
    window.addEventListener("focus", refresh);
    window.addEventListener("admin-notifications-updated", refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("admin-notifications-updated", refresh);
    };
  }, [adminRequest, pathname]);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="admin-notification-bell"
        aria-label={
          unread ? `Notifikasi, ${unread} belum dibaca` : "Notifikasi"
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Notifikasi"
      >
        <Bell size={21} aria-hidden="true" />
        {Boolean(unread) && (
          <span className="admin-notification-badge" aria-hidden="true">
            {unread! > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <AdminModal title="Notifikasi" onClose={() => setOpen(false)}>
          <AdminNotifications onNavigate={() => setOpen(false)} />
        </AdminModal>
      )}
    </>
  );
}

function AdminNavigation({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate: () => void;
}) {
  const link = ({ href, label, icon: Icon }: (typeof navigation)[number]) => (
    <Link
      key={href}
      href={href}
      aria-current={pathname === href ? "page" : undefined}
      onClick={onNavigate}
    >
      <Icon size={18} aria-hidden="true" />
      {label}
    </Link>
  );
  return [...new Set(navigation.map((item) => item.group))].map((group) => {
    const items = navigation.filter((item) => item.group === group);
    if (items.length === 1) return link(items[0]);
    const active = items.some((item) => item.href === pathname),
      Icon = items[0].icon;
    return (
      <details
        key={group}
        className="admin-submenu"
        open={active}
        data-active={active}
      >
        <summary>
          <Icon size={18} aria-hidden="true" />
          <span>{group}</span>
          <span className="admin-submenu-caret" aria-hidden="true">
            <ChevronRight className="admin-submenu-collapsed" size={16} />
            <ChevronDown className="admin-submenu-expanded" size={16} />
          </span>
        </summary>
        <div className="admin-submenu-items">{items.map(link)}</div>
      </details>
    );
  });
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, loading, error, refresh, logout } = useShop();
  const pathname = usePathname();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const drawer = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (menu) drawer.current?.showModal();
    else drawer.current?.close();
  }, [menu]);
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
    navigation.find((item) => item.href === pathname)?.label ||
    (pathname === "/admin/notifikasi" ? "Notifikasi" : "Administrasi");
  return (
    <div className="shop admin-shell">
      <aside className="admin-sidebar">
        <Link
          href="/admin"
          className="admin-brand"
          aria-label="DSU — beranda admin"
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
          <AdminNavigation
            pathname={pathname}
            onNavigate={() => setMenu(false)}
          />
        </nav>
        <div className="admin-sidebar-bottom">
          <Link href="/">
            <ArrowUpRight size={18} />
            Lihat situs
          </Link>
          <button onClick={() => setLogoutOpen(true)}>
            <LogOut size={18} />
            Keluar
          </button>
        </div>
      </aside>
      <dialog
        ref={drawer}
        className="admin-mobile-drawer"
        aria-label="Navigasi admin"
        onClose={() => setMenu(false)}
      >
        <button
          className="shop-button secondary"
          onClick={() => setMenu(false)}
        >
          Tutup navigasi admin
        </button>
        <nav aria-label="Menu admin seluler">
          <AdminNavigation
            pathname={pathname}
            onNavigate={() => setMenu(false)}
          />
        </nav>
        <button
          className="shop-button secondary"
          onClick={() => {
            setMenu(false);
            setLogoutOpen(true);
          }}
        >
          Keluar
        </button>
      </dialog>
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
            <AdminNotificationBell />
            <span className="admin-avatar">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{user.name}</strong>
              <small>Pengelola</small>
            </div>
          </div>
        </header>
        <main id="main" className="admin-main">
          <AdminSearch />
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
