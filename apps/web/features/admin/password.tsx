"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useShop } from "@/features/storefront/provider";
import { useNotification } from "@/components/notification-provider";
import { AdminForm, Field, value } from "./shared";

export function PasswordAction() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="shop-button secondary"
        onClick={() => setOpen(true)}
      >
        Ganti kata sandi
      </button>
      {open && <PasswordForm onClose={() => setOpen(false)} />}
    </>
  );
}

export function PasswordForm({
  target,
  onClose,
}: {
  target?: { id: string; name: string };
  onClose: () => void;
}) {
  const { adminRequest, refresh } = useShop();
  const { confirm } = useNotification();
  const router = useRouter();
  const label = target ? "Reset kata sandi" : "Ganti kata sandi";
  return (
    <AdminForm
      title={target ? `${label}: ${target.name}` : label}
      successMessage={
        target
          ? "Kata sandi akun berhasil direset. Sampaikan kata sandi baru secara pribadi kepada pemilik akun."
          : "Kata sandi berhasil diubah. Silakan masuk kembali."
      }
      onCancel={onClose}
      onSave={async (form) => {
        const newPassword = value(form, "newPassword");
        const confirmPassword = value(form, "confirmPassword");
        if (newPassword !== confirmPassword)
          throw new Error("Konfirmasi kata sandi tidak sama.");
        if (
          !(await confirm({
            title: `${label}?`,
            message: target
              ? `Seluruh sesi ${target.name} akan dicabut. Akun harus masuk kembali dengan kata sandi baru.`
              : "Seluruh sesi akun Anda akan dicabut. Anda harus masuk kembali.",
          }))
        )
          return false;
        await adminRequest(
          target ? `/admin/users/${target.id}/password` : "/auth/password",
          {
            currentPassword: value(form, "currentPassword"),
            newPassword,
            confirmPassword,
          },
          "POST",
        );
        if (!target) {
          await refresh();
          router.replace("/login");
        }
      }}
    >
      <p>
        Kata sandi baru minimal 10 karakter. Semua sesi akun akan dicabut
        setelah perubahan berhasil.
      </p>
      <Field
        label={target ? "Kata sandi admin saat ini *" : "Kata sandi saat ini *"}
      >
        <input
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          minLength={10}
          maxLength={128}
        />
      </Field>
      <Field label="Kata sandi baru *">
        <input
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          maxLength={128}
        />
      </Field>
      <Field label="Konfirmasi kata sandi baru *">
        <input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          maxLength={128}
        />
      </Field>
    </AdminForm>
  );
}
