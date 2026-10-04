"use client";
import { useRef, useState } from "react";
import { DSUModal } from "@/components/dsu-modal";

export function LogoutDialog({
  open,
  onOpenChange,
  onLogout,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogout: () => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  function close() {
    if (submitting.current) return;
    setError("");
    onOpenChange(false);
  }
  async function confirm() {
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setError("");
    try {
      await onLogout();
      onOpenChange(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Gagal keluar. Silakan coba lagi.",
      );
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }
  return (
    <DSUModal
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      title="Yakin mau keluar?"
      description="Anda dapat masuk kembali kapan saja untuk melihat profil dan pesanan Anda."
      onConfirm={() => void confirm()}
      confirmLabel="Ya, keluar"
      pending={pending}
      error={error}
      finalFocus={() =>
        document.querySelector<HTMLElement>(
          ".shop-profile-link, .shop-login-link",
        )
      }
    />
  );
}
