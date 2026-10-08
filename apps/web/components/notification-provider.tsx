"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DSUModal, type NoticeKind } from "./dsu-modal";

type Message = {
  title?: string;
  message: string;
  kind?: NoticeKind;
  confirmLabel?: string;
  destructive?: boolean;
};
type Entry = Message & { resolve: (confirmed: boolean) => void };
type Notifications = {
  notify: (message: Message) => void;
  confirm: (message: Message) => Promise<boolean>;
};
const Context = createContext<Notifications | null>(null);
const titles = {
  success: "Berhasil!",
  error: "Belum berhasil",
  info: "Informasi",
  confirm: "Anda yakin?",
};
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Entry[]>([]);
  const confirm = useCallback(
    (message: Message) =>
      new Promise<boolean>((resolve) => {
        setQueue((previous) => [
          ...previous,
          { ...message, kind: message.kind || "confirm", resolve },
        ]);
      }),
    [],
  );
  const notify = useCallback(
    (message: Message) => {
      void confirm({ ...message, kind: message.kind || "info" });
    },
    [confirm],
  );
  const current = queue[0];
  function finish(confirmed: boolean) {
    current?.resolve(confirmed);
    setQueue((previous) => previous.slice(1));
  }
  return (
    <Context.Provider value={{ notify, confirm }}>
      {children}
      <DSUModal
        open={Boolean(current)}
        onOpenChange={(open) => {
          if (!open) finish(false);
        }}
        title={current?.title || titles[current?.kind || "info"]}
        description={current?.message || ""}
        kind={current?.kind || "info"}
        destructive={current?.destructive}
        confirmLabel={
          current?.confirmLabel ||
          (current?.kind === "confirm" ? "Ya, lanjutkan" : "Mengerti")
        }
        onConfirm={() => finish(true)}
      />
    </Context.Provider>
  );
}
export function useNotification() {
  const context = useContext(Context);
  if (!context) throw new Error("NotificationProvider diperlukan.");
  return context;
}
/** Show each newly rendered message once; ordinary rerenders never reopen it. */
export function ModalNotice({ message, kind = "error", title }: Message) {
  const { notify } = useNotification();
  const last = useRef("");
  useEffect(() => {
    const key = `${kind}:${title || ""}:${message}`;
    if (message && last.current !== key) {
      last.current = key;
      notify({ message, kind, title });
    }
  }, [message, kind, title, notify]);
  return null;
}
