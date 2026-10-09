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

## Pemulihan dan perubahan kata sandi

Admin dapat mengganti kata sandinya dari **Pengaturan → Ganti kata sandi**. Untuk membantu petugas atau pelanggan yang lupa kata sandi, gunakan **Reset kata sandi** pada akun terkait. Masukkan kata sandi admin saat ini, kata sandi baru minimal 10 karakter, dan konfirmasinya; sampaikan kata sandi baru kepada pemilik akun secara pribadi setelah memverifikasi identitasnya. Reset tidak mengaktifkan akun yang sudah dinonaktifkan.

Jika admin tidak bisa login, operator server dapat mengisi `ADMIN_EMAIL` dan `ADMIN_PASSWORD` dengan kata sandi baru melalui environment, lalu menjalankan `npm run admin:reset-password`. Perintah hanya memperbarui admin aktif yang sudah ada. Hapus nilai kata sandi sementara dari konfigurasi setelah digunakan. Jangan menaruh kata sandi dalam argumen perintah atau Git.

Semua perubahan mencabut seluruh sesi akun dan dicatat dalam audit tanpa menyimpan kata sandi. Reset melalui tautan email belum tersedia karena belum ada layanan pengirim email.

## Portal petugas

Admin dapat membuat akun petugas serta melihat penugasan dan riwayat pengamatannya melalui `/admin/petugas`. Password awal minimal 10 karakter. Email harus unik; akun yang dibuat selalu memiliki role `PETUGAS`.

Untuk memberi tugas, klik **Pantau** pada petugas, pilih batch yang belum ditugaskan, lalu klik **Berikan penugasan**. Penugasan dapat dibatalkan dari tabel batch petugas. Pemindahan batch antarpetugas tersedia di `/admin/batch`.

Login menggunakan akun ber-role `PETUGAS` melalui `/login`. Admin menugaskan batch di `/admin/batch` atau `/admin/petugas`. Petugas hanya melihat batch tugasnya dan dapat mencatat metode, kondisi, tinggi sampel dalam cm, serta catatan melalui detail batch. Pengamatan tersimpan di MySQL dan tidak mengubah stok siap jual. Batch tanpa penugasan tidak muncul di portal petugas. Terapkan `npm run db:migrate` dan `npm run db:generate` setelah pembaruan ini.

Halaman `/petugas` menyediakan ringkasan penugasan dan kelompok yang perlu dipantau berdasarkan interval pemantauan di pengaturan admin. Daftar dapat dicari dan disaring menurut kategori/status; pada ponsel, tiap kelompok ditampilkan sebagai kartu dengan tombol detail. Petugas dapat mengunggah foto, mencatat jumlah daun per sampel, dan membuat koreksi tanpa menghapus pengamatan awal. Riwayat menampilkan pengukuran setiap sampel serta foto tersimpan.

Menu **Penugasan** menampilkan kelompok tugas petugas dan formulir pengamatan. Menu **Pengajuan jual** menyediakan pilihan kelompok, formulir pengajuan, serta status dan catatan keputusan admin dari MySQL, termasuk setelah halaman dimuat ulang. Pengajuan memerlukan pengamatan sehat milik petugas dan jumlah yang tidak melebihi stok fisik belum disetujui. Pengajuan yang masih menunggu pemeriksaan tidak dapat diajukan ulang. Kegagalan pembaruan sementara mempertahankan isian pengamatan. Akun dan penugasan dibuat oleh admin; halaman operasional tidak membuat data contoh.

## Data dummy lokal

Jalankan `npm run db:seed` setelah migrasi untuk mengisi MySQL lokal `db_dsu` dengan 5 akun (admin, 2 petugas, 2 pelanggan), 10 tanaman dan penugasan, 9 pengamatan, 6 pengajuan jual, 7 pesanan, 5 pembayaran simulasi, dan 2 keranjang. Katalog memuat 4 tanaman siap jual; kelompok lainnya menunjukkan pemantauan, kesehatan bermasalah, pengajuan menunggu, dan pengajuan ditolak. Pesanan mencakup menunggu pembayaran, verifikasi, diproses, dikirim, selesai, dibatalkan, dan pembayaran ditolak.

Semua produk/lokasi dan catatan simulasi ditandai **Dummy**. Kata sandi acak tersimpan di `.env.dummy.local` yang diabaikan Git. Login petugas: `budi@dummy.dsu.local` atau `sari@dummy.dsu.local`; pelanggan: `andi@dummy.dsu.local` atau `rina@dummy.dsu.local`; admin: `admin@dummy.dsu.local`. Gunakan kata sandi masing-masing dari file tersebut.

Seed hanya dapat berjalan pada lingkungan development dengan database lokal `db_dsu`. Data yang sudah ada tidak diubah. Seluruh penambahan database dilakukan dalam satu transaksi dan stok diperiksa sebelum commit. Menjalankan ulang seed mempertahankan data, stok, dan kata sandi, termasuk perubahan yang sudah dilakukan melalui aplikasi. Bukti pembayaran berlabel simulasi dan tidak mewakili transfer nyata.

## Modul admin

Implementasi mengikuti alur `admin.md`: master tanaman/kategori/lokasi ? batch ? monitoring petugas ? pengajuan siap jual ? approval admin ? katalog ? checkout dan reservasi ? verifikasi pembayaran ? fulfillment. Modul tersedia melalui sidebar `/admin`, termasuk inventory, laporan, audit, notifikasi, pelanggan, dan pengaturan. Data tersimpan di MySQL; hak akses dan validasi diperiksa oleh API.

Pengamatan tidak langsung menambah stok siap jual. Admin harus menyetujui pengajuan sebelum mempublikasikan stok batch. Pembayaran pelanggan menggunakan foto bukti; verifikasi admin memindahkan reservasi ke stok terjual tepat satu kali. Ongkir dapat diatur sebelum bukti pembayaran diajukan. Riwayat transaksi dan audit dipertahankan saat tanaman, lokasi, kategori, atau akun dinonaktifkan.

Ekspor Excel menggunakan SpreadsheetML (`.xml`, dapat dibuka di Excel). Ekspor PDF membuka dialog cetak browser; pilih **Save as PDF**. Foto disimpan di `apps/api/uploads`; foto monitoring dan bukti pembayaran hanya dapat diakses pemilik dan admin. Cadangkan folder ini bersama database.

Harga katalog berlaku per jenis tanaman untuk seluruh batch pada listing yang sama. Persediaan fisik, stok siap jual, dan stok publik dibedakan. Pencarian dan pagination tabel dilakukan di browser, sesuai skala nursery lokal; pindahkan ke API jika data membesar.

Umur tanaman dihitung dalam hari dari **Tanggal tanam** pada tambah/edit batch, berdasarkan tanggal kalender Asia/Jakarta. Pada master tanaman, beberapa batch ditampilkan sebagai rentang umur. Monitoring menampilkan umur saat pengamatan; laporan inventory menyertakan tanggal tanam dan umur dalam hari. Tanggal tanam kosong tidak dianggap sebagai umur nol.

Prioritas P0 dan P1 dari `admin.md` tersedia, termasuk lokasi nursery dan pengaturan sistem. P2 sudah mencakup pencarian global; advanced analytics, advanced export, dan dashboard customization tetap menjadi pengembangan berikutnya sesuai prioritas dokumen.

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
