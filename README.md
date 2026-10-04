# Delta Sinergi Utama

Website pembibitan tanaman CV. Delta Sinergi Utama: katalog, profil pelanggan, keranjang, pemesanan melalui WhatsApp, perawatan tanaman, dashboard admin, dan portal petugas.

## Menjalankan lokal

Prasyarat: Node.js 22+, npm, dan MySQL/MariaDB.

1. Salin `.env.example` menjadi `.env`, lalu isi koneksi database dan konfigurasi lokal.
2. Jalankan `npm ci`.
3. Jalankan `npm run db:generate` dan `npm run db:migrate`.
4. Jalankan `npm run dev`.

Website berjalan di `http://localhost:3000`, API di `http://localhost:4000`.

## Akun admin

Isi `ADMIN_NAME`, `ADMIN_EMAIL`, dan `ADMIN_PASSWORD` di `.env`, lalu jalankan `npm run admin:create`. Password minimal 10 karakter. Login melalui `/login`; akun admin diarahkan ke `/admin`. Tidak ada kredensial admin bawaan di repository.

## Struktur

- `apps/web`: Next.js dan React.
- `apps/api`: Express, Prisma, dan MySQL.
- `packages/contracts`: kontrak data bersama.
- `apps/api/prisma/migrations`: migrasi database.

Pesanan pengiriman memerlukan nomor resi sebelum admin mengubah status menjadi **Dikirim**. Pesanan ambil di tempat memakai status **Siap diambil**.

## Pemeriksaan

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

`npm run test:api`, `npm run test:customer`, dan `npm run test:frontend` menggunakan database pengujian terpisah `db_dsu_test`. Terapkan migrasi pada database pengujian sebelum menjalankan pengujian integrasi. Pengujian browser memerlukan Google Chrome.

File `.env`, kredensial, dependency, dan hasil build tidak disimpan dalam Git. Aplikasi web memerlukan API dan database yang berjalan saat digunakan.
