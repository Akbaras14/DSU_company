"use client";
import { ModalNotice } from "@/components/notification-provider";
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  LogIn,
  LogOut,
  ShoppingBag,
  MessageCircle,
  Trash2,
} from "lucide-react";
import { useShop } from "./provider";
import { COMPANY_ADDRESS, COMPANY_MAP_URL } from "@/lib/company";
import {
  CatalogContent,
  DetailContent,
  HomeContent,
  PlantCareContent,
} from "./catalog";
import { CartContent, CheckoutContent, OrdersContent } from "./purchase";
import { LoginContent } from "./login";
import { CustomerMenu } from "./customer-menu";
import { LogoutDialog } from "./logout-dialog";
import { ProfileContent } from "./profile";
import { DSUMascot } from "@/components/dsu-mascot";
import "./storefront.css";
export type CustomerView =
  | "home"
  | "catalog"
  | "detail"
  | "cart"
  | "checkout"
  | "orders"
  | "profile"
  | "login"
  | "plant-care";
export function Storefront({ view, id }: { view: CustomerView; id?: string }) {
  const {
    state,
    user,
    settings,
    loading,
    error,
    refresh,
    logout,
    update,
    remove,
  } = useShop();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartError, setCartError] = useState("");
  const [cartPending, setCartPending] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const [overHero, setOverHero] = useState(true);
  useEffect(() => {
    if (view !== "home" && view !== "catalog") return;
    const header = headerRef.current;
    const hero = document.querySelector<HTMLElement>(".shop-hero");
    if (!header || !hero) return;
    const updateHeader = () => {
      const height = header.offsetHeight;
      header.parentElement?.style.setProperty(
        "--shop-header-height",
        `${height}px`,
      );
      setOverHero(hero.getBoundingClientRect().bottom > height);
    };
    updateHeader();
    const observer = new ResizeObserver(updateHeader);
    observer.observe(header);
    observer.observe(hero);
    window.addEventListener("scroll", updateHeader, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", updateHeader);
    };
  }, [view, loading, error]);
  const pathname = usePathname();
  const count = state.cart.reduce((sum, line) => sum + line.quantity, 0);
  const privatePage = ["cart", "checkout", "orders", "profile"].includes(view);
  const whatsapp = `https://wa.me/${settings?.whatsappNumber || "6285893802972"}`;
  async function changeFloatingCart(id: string, quantity?: number) {
    if (cartPending) return;
    setCartPending(true);
    setCartError("");
    try {
      if (quantity === undefined) await remove(id);
      else await update(id, quantity);
    } catch (cause) {
      setCartError(
        cause instanceof Error
          ? cause.message
          : "Keranjang belum dapat diperbarui.",
      );
    } finally {
      setCartPending(false);
    }
  }
  if (view === "login") {
    return (
      <div className="shop shop-auth">
        <main id="main" className="shop-main">
          <Suspense fallback={<p role="status">Memuat formulir...</p>}>
            <LoginContent />
          </Suspense>
        </main>
      </div>
    );
  }
  return (
    <MotionConfig reducedMotion="never">
      <div
        className={`shop${view === "home" || view === "catalog" ? " shop-home" : ""}`}
      >
        <motion.header
          ref={headerRef}
          className="shop-header"
          data-over-hero={(view === "home" || view === "catalog") && overHero}
          initial={{ y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.35 }}
        >
          <div className="shop-header-inner">
            <Link href="/" className="shop-brand">
              <Image
                className="shop-brand-logo"
                src="/images/logo/dsu_logo.svg"
                alt=""
                width={1798}
                height={875}
                unoptimized
              />
              <span className="shop-brand-copy">
                <strong>
                  Delta Sinergi Utama<span>.</span>
                </strong>
                <small>PEMBIBITAN & TANAMAN</small>
              </span>
            </Link>
            <nav className="shop-nav" aria-label="Navigasi utama">
              {[
                { href: "/", label: "Beranda" },
                { href: "/katalog", label: "Katalog" },
                { href: "/plant-care", label: "Perawatan Tanaman" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="shop-header-actions">
              {user?.role === "PELANGGAN" && (
                <button
                  type="button"
                  className="shop-cart-trigger"
                  onClick={() => setCartOpen((open) => !open)}
                  aria-label={`Keranjang, ${count} tanaman`}
                  aria-expanded={cartOpen}
                  aria-controls="ringkasan-keranjang"
                >
                  <ShoppingBag size={20} />
                  <span>{count}</span>
                </button>
              )}
              {user?.role === "PELANGGAN" && (
                <CustomerMenu
                  name={user.name}
                  email={user.email}
                  onLogout={async () => {
                    setLogoutOpen(true);
                  }}
                />
              )}
              {user && user.role !== "PELANGGAN" ? (
                <button
                  className="shop-login-link"
                  onClick={() => setLogoutOpen(true)}
                >
                  <LogOut size={17} />
                  <span>Keluar</span>
                </button>
              ) : !user ? (
                <Link href="/login" className="shop-login-link">
                  <LogIn size={17} />
                  <span>Masuk</span>
                </Link>
              ) : null}
            </div>
          </div>
        </motion.header>
        <LogoutDialog
          open={logoutOpen}
          onOpenChange={setLogoutOpen}
          onLogout={logout}
        />
        <main id="main" className="shop-main">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              {error ? (
                <section className="shop-empty" role="alert">
                  <ModalNotice
                    message={error}
                    title="Layanan belum dapat dimuat"
                  />
                  <DSUMascot file="maskot_tree.webp" />
                  <h1>Layanan belum dapat dimuat</h1>
                  <p>{error}</p>
                  <button
                    className="shop-button"
                    onClick={() => void refresh()}
                  >
                    Coba lagi
                  </button>
                </section>
              ) : loading ? (
                <div className="shop-loading" aria-busy="true">
                  <p role="status">Memuat tanaman dan akun Anda...</p>
                  <div />
                  <div />
                </div>
              ) : privatePage && !user ? (
                <section className="shop-empty">
                  <DSUMascot file="maskot_two.webp" />
                  <h1>Masuk untuk melanjutkan</h1>
                  <p>Keranjang dan pesanan tersimpan aman di akun Anda.</p>
                  <Link
                    className="shop-button"
                    href={`/login?next=${encodeURIComponent(pathname)}`}
                  >
                    Masuk atau daftar
                  </Link>
                </section>
              ) : privatePage && user?.role !== "PELANGGAN" ? (
                <section className="shop-empty">
                  <DSUMascot file="maskot_one.webp" />
                  <h1>Area pelanggan</h1>
                  <p>Gunakan akun pelanggan untuk melakukan pemesanan.</p>
                  <Link className="shop-button" href="/admin/pesanan">
                    Kelola pesanan
                  </Link>
                </section>
              ) : view === "home" ? (
                <HomeContent />
              ) : view === "catalog" ? (
                <CatalogContent />
              ) : view === "plant-care" ? (
                <PlantCareContent />
              ) : view === "detail" ? (
                <DetailContent id={id ?? ""} />
              ) : view === "cart" ? (
                <CartContent />
              ) : view === "checkout" ? (
                <CheckoutContent />
              ) : view === "profile" ? (
                <ProfileContent />
              ) : (
                <OrdersContent />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
        <AnimatePresence>
          {user?.role === "PELANGGAN" && cartOpen && (
            <motion.aside
              id="ringkasan-keranjang"
              className="shop-cart-popover"
              initial={{ opacity: 0, y: -10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              transition={{ duration: 0.2 }}
            >
              <div>
                <strong>Keranjang Anda</strong>
                <button type="button" onClick={() => setCartOpen(false)}>
                  Tutup
                </button>
              </div>
              {state.cart.length ? (
                <>
                  <p>{count} tanaman telah dipilih.</p>
                  {cartError && <ModalNotice message={cartError} />}
                  <ul>
                    {state.cart.slice(0, 3).map((line) => (
                      <li key={line.productId}>
                        <span>{line.name}</span>
                        <div className="shop-cart-popover-controls">
                          <button
                            type="button"
                            aria-label={`Kurangi ${line.name}`}
                            disabled={cartPending || line.quantity <= 1}
                            onClick={() =>
                              void changeFloatingCart(
                                line.productId,
                                line.quantity - 1,
                              )
                            }
                          >
                            −
                          </button>
                          <span aria-live="polite">{line.quantity}</span>
                          <button
                            type="button"
                            aria-label={`Tambah ${line.name}`}
                            disabled={
                              cartPending ||
                              (line.available !== undefined &&
                                line.quantity >= line.available)
                            }
                            onClick={() =>
                              void changeFloatingCart(
                                line.productId,
                                line.quantity + 1,
                              )
                            }
                          >
                            +
                          </button>
                          <button
                            type="button"
                            aria-label={`Hapus ${line.name}`}
                            disabled={cartPending}
                            onClick={() =>
                              void changeFloatingCart(line.productId)
                            }
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <Link
                    className="shop-button"
                    href="/checkout"
                    onClick={() => setCartOpen(false)}
                  >
                    Lanjut pemesanan
                  </Link>
                </>
              ) : (
                <>
                  <p>Keranjang Anda masih kosong.</p>
                  <Link
                    className="shop-button"
                    href="/katalog"
                    onClick={() => setCartOpen(false)}
                  >
                    Pilih tanaman
                  </Link>
                </>
              )}
            </motion.aside>
          )}
        </AnimatePresence>
        <footer className="shop-footer">
          <div className="shop-footer-top">
            <div>
              <Link href="/" className="shop-brand">
                <Image
                  className="shop-brand-logo"
                  src="/images/logo/dsu_logo.svg"
                  alt=""
                  width={1798}
                  height={875}
                  unoptimized
                />
                <span className="shop-brand-copy">
                  <strong>
                    Delta Sinergi Utama<span>.</span>
                  </strong>
                  <small>PEMBIBITAN & TANAMAN</small>
                </span>
              </Link>
              <p>
                Temukan tanaman untuk rumah, taman, dan ruang yang Anda cintai.
              </p>
            </div>
            <div>
              <h2>Jelajahi</h2>
              <Link href="/katalog">Katalog tanaman</Link>
              {user?.role === "PELANGGAN" && (
                <Link href="/keranjang">Keranjang</Link>
              )}
              <Link href="/akun">Pesanan saya</Link>
            </div>
            <div>
              <h2>Alamat perusahaan</h2>
              <address>{COMPANY_ADDRESS}</address>
              <a href={COMPANY_MAP_URL} target="_blank" rel="noreferrer">
                Buka Google Maps
              </a>
              <a href={whatsapp} target="_blank" rel="noreferrer">
                <MessageCircle size={16} /> 0858 9380 2972
              </a>
            </div>
          </div>
          <div className="shop-footer-bottom">
            <span>© {new Date().getFullYear()} CV. Delta Sinergi Utama</span>
            <span>
              Konfirmasi via WhatsApp · Pengambilan di tempat pembibitan
            </span>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}
