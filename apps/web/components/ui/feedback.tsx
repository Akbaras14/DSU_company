"use client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** Recoverable request failure. Retry is explicitly triggered by the user. */
export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <section className="empty" role="alert">
      <h2>Data belum dapat ditampilkan</h2>
      <p>{message}</p>
      <Button onClick={onRetry}>Coba lagi</Button>
    </section>
  );
}
/** Announces pending reads without displaying invented data. */
export function LoadingState() {
  return (
    <section aria-busy="true">
      <p role="status">Memuat data pembibitan…</p>
      <Skeleton className="h-32 my-5" />
      <Skeleton className="h-32 my-5" />
    </section>
  );
}
