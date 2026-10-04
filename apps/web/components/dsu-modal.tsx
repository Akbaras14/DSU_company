"use client";
import { useRef, type ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { CircleCheck, CircleAlert, Info, X } from "lucide-react";
import { DSUMascot } from "./dsu-mascot";
import styles from "@/features/storefront/logout-dialog.module.css";

export type NoticeKind = "success" | "error" | "info" | "confirm";
export function DSUModal({
  open,
  onOpenChange,
  title,
  description,
  kind = "confirm",
  onConfirm,
  confirmLabel = "Mengerti",
  pending = false,
  error,
  children,
  finalFocus,
  dismissible = true,
  confirmHref,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  kind?: NoticeKind;
  onConfirm: () => void;
  confirmLabel?: string;
  pending?: boolean;
  error?: string;
  children?: ReactNode;
  finalFocus?: () => HTMLElement | null;
  dismissible?: boolean;
  confirmHref?: string;
}) {
  const firstAction = useRef<HTMLButtonElement>(null);
  const linkAction = useRef<HTMLAnchorElement>(null);
  const Icon =
    kind === "success" ? CircleCheck : kind === "error" ? CircleAlert : Info;
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!pending && (next || dismissible)) onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className={styles.backdrop} />
        <Dialog.Popup
          className={styles.popup}
          initialFocus={confirmHref ? linkAction : firstAction}
          finalFocus={finalFocus}
        >
          {dismissible && (
            <button
              type="button"
              className={styles.close}
              aria-label="Tutup notifikasi"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              <X size={20} />
            </button>
          )}
          <div className={styles.mascot}>
            <DSUMascot
              file={kind === "success" ? "maskot_four.webp" : "maskot_two.webp"}
            />
          </div>
          <span className={styles.eyebrow}>DELTA SINERGI UTAMA</span>
          {kind !== "confirm" && (
            <div className={styles.indicator} data-kind={kind}>
              <Icon size={22} aria-hidden="true" />
            </div>
          )}
          <Dialog.Title className={styles.title}>{title}</Dialog.Title>
          <Dialog.Description className={styles.description}>
            {description}
          </Dialog.Description>
          {children}
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <div
            className={styles.actions}
            data-single={kind !== "confirm" || !dismissible}
          >
            {kind === "confirm" && dismissible && (
              <button
                type="button"
                ref={firstAction}
                className={styles.cancel}
                disabled={pending}
                onClick={() => onOpenChange(false)}
              >
                Batal
              </button>
            )}
            {confirmHref ? (
              <a
                ref={linkAction}
                className={styles.confirm}
                href={confirmHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onConfirm}
              >
                {confirmLabel}
              </a>
            ) : (
              <button
                type="button"
                ref={kind === "confirm" ? undefined : firstAction}
                className={styles.confirm}
                disabled={pending}
                onClick={onConfirm}
              >
                {pending ? "Memproses..." : confirmLabel}
              </button>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
