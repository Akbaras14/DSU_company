"use client";
import { ModalNotice } from "@/components/notification-provider";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ClipboardList, LogOut, UserRound } from "lucide-react";

export function CustomerMenu({
  name,
  email,
  onLogout,
}: {
  name: string;
  email: string;
  onLogout: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    const outside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  async function logout() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await onLogout();
      setOpen(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Gagal keluar. Silakan coba lagi.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <div
      className="shop-customer-menu"
      ref={container}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="shop-profile-link"
        aria-label="Menu profil pelanggan"
        aria-expanded={open}
        aria-controls="menu-profil-pelanggan"
        onClick={() => setOpen((previous) => !previous)}
      >
        <UserRound size={20} aria-hidden="true" />
      </button>
      {open && (
        <div
          ref={panel}
          id="menu-profil-pelanggan"
          className="shop-customer-menu-panel"
        >
          <div className="shop-customer-menu-identity">
            <strong>{name}</strong>
            <span>{email}</span>
          </div>
          <nav aria-label="Menu akun pelanggan">
            <Link href="/profil" onClick={() => setOpen(false)}>
              <UserRound size={18} /> Ubah profil
            </Link>
            <Link href="/akun" onClick={() => setOpen(false)}>
              <ClipboardList size={18} /> Cek pesanan
            </Link>
            <button
              type="button"
              disabled={pending}
              onClick={() => void logout()}
            >
              <LogOut size={18} /> {pending ? "Keluar..." : "Keluar"}
            </button>
          </nav>
          {error && <ModalNotice message={error} />}
        </div>
      )}
    </div>
  );
}
