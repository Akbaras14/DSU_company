# Portal petugas operasional — 9 Oktober 2026

Halaman `/petugas` menggunakan sesi dan data MySQL melalui API. Akun serta penugasan dibuat admin. Tidak ada data contoh atau fallback demo pada halaman operasional.

## Perubahan

- Ringkasan penugasan, stok fisik, kelompok yang perlu dipantau, dan pengajuan menunggu persetujuan. Interval pemantauan berasal dari pengaturan admin; pengingat menggunakan pengamatan petugas yang sedang masuk.
- Pencarian serta filter kategori/status, status kelompok, umur tanaman, waktu pemantauan, dan kesehatan terakhir. Daftar berubah menjadi kartu pada ponsel.
- Pencatatan pengukuran, jumlah daun, foto, dan koreksi; foto formulir direset setelah penyimpanan agar tidak terbawa ke pengamatan berikutnya.
- Riwayat pengukuran setiap sampel, tautan foto, dan keterangan koreksi.
- Pengajuan siap jual dibatasi stok belum disetujui serta pengamatan sehat. Status pengajuan dimuat bersama data penugasan dan diperbarui setelah pengajuan berhasil. Hasil pemeriksaan admin tetap tersedia setelah reload.
- Kegagalan pembaruan sementara mempertahankan data terakhir dan draf pengamatan. Navigasi ponsel menyediakan keluar akun dengan konfirmasi.

## Verifikasi

- TypeScript, ESLint, 7 unit test, dan build produksi Next.js lulus.
- Tes API petugas lulus pada `db_dsu_test`: sesi/role/CSRF, kepemilikan penugasan, penyimpanan pengamatan, batas jumlah pengajuan, penolakan pengajuan ganda, isolasi riwayat antarpetugas, dan persetujuan admin yang memperbarui stok.
- Enam skenario browser petugas lulus: navigasi dan fokus ponsel; pencarian/detail/persistensi pengamatan; ukuran layar 280/390/768/1440; foto/pengukuran/pengajuan/keputusan admin setelah reload; draf saat koneksi gagal; logout ponsel.
- Tampilan diperiksa melalui `petugas-live-desktop.png` dan `petugas-live-mobile.png` di direktori ini. Data pada tangkapan layar adalah fixture pengujian, bukan data operasional.

## Lingkungan pengujian

MySQL lokal menggunakan database pengujian terpisah; migrasi diterapkan hanya ke `db_dsu_test`. Database operasional `db_dsu` tidak diubah.

`tsx` gagal membaca informasi akun Windows (`uv_os_get_passwd`); tes API dan server tes browser dijalankan dari kompilasi esbuild sementara dengan dependency aplikasi yang sama. Semua enam skenario browser melaporkan berhasil, tetapi proses runner macet saat penghentian server di Windows dan dihentikan setelah skenario selesai. Berkas kompilasi/config sementara dihapus setelah pemeriksaan.

Server development memakai font fallback karena Google Fonts tidak dapat diakses. Konfigurasi dan deployment produksi belum diuji.
