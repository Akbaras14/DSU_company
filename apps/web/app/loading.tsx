export default function Loading() {
  return (
    <main id="main" className="welcome" aria-busy="true">
      <p role="status">Memuat halaman…</p>
      <div className="skeleton" />
    </main>
  );
}
