# Data dummy proyek

Seed `apps/api/src/seed-dummy.ts` dijalankan pada MySQL development lokal `db_dsu`.

Data tambahan: 5 akun (1 admin, 2 petugas, 2 pelanggan), 3 lokasi, 10 tanaman dan penugasan, 9 pengamatan, 6 pengajuan jual, 7 pesanan dengan reservasi dan riwayat status, 5 pembayaran simulasi, serta 2 keranjang. Empat tanaman dummy tersedia di katalog. Pengajuan mencakup 4 disetujui, 1 menunggu pemeriksaan, dan 1 ditolak. Pengamatan mencakup tanaman sehat, perlu perhatian, kritis, dan pemantauan yang telah jatuh tempo.

Verifikasi:

- Seed dijalankan dua kali; penambahan hanya terjadi sekali.
- Fingerprint seluruh akun, produk, dan batch yang sudah ada sama sebelum dan sesudah seed.
- Assert dalam transaksi memeriksa stok fisik, stok disetujui, reservasi aktif, penjualan, dan stok publik. Hash kata sandi semua akun baru diverifikasi.
- Login melalui API untuk kelima akun dummy berhasil; masing-masing petugas menerima 5 penugasan dan 3 pengajuan miliknya.
- Pelanggan pertama menerima 4 pesanan; pelanggan kedua 3 pesanan; masing-masing memiliki 1 isi keranjang.
- Admin dapat membaca 7 pesanan, 5 pembayaran, serta gambar bukti simulasi melalui endpoint media yang memerlukan autentikasi.
- Pemeriksaan tipe API lolos.

Kata sandi acak berada di `.env.dummy.local`, tidak ditampilkan dalam log maupun disimpan dalam dokumentasi. Menjalankan ulang `npm run db:seed` mempertahankan data yang telah digunakan melalui aplikasi. Tidak ada operasi hapus atau reset data lama.

Lingkungan sandbox Windows gagal menjalankan `tsx` karena `uv_os_get_passwd ENOMEM`; seed dan pemeriksaan API dijalankan melalui bundle esbuild sementara dari sumber yang sama. Bundle sementara dihapus setelah pemeriksaan. Tidak ada perubahan UI pada tugas ini dan tidak dilakukan deployment.
