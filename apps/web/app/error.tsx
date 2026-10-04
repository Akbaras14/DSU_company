"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="welcome">
      <h1>Halaman gagal dimuat</h1>
      <p>Silakan ulangi pemuatan halaman.</p>
      <button onClick={reset}>Coba lagi</button>
    </main>
  );
}
