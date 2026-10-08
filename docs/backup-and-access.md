# Hak akses dan pencadangan

API memeriksa sesi, status akun, dan peran pada setiap request. ADMIN mengelola operasional; PETUGAS hanya mengakses penugasan dan pengamatannya; PELANGGAN hanya mengakses transaksi dan profilnya. Mutasi memerlukan origin aplikasi dan token CSRF. Peran tidak dapat diubah melalui formulir profil. Akun nonaktif serta sesi kedaluwarsa ditolak. Sesi baru ADMIN/PETUGAS berlaku 8 jam, PELANGGAN 7 hari; sesi lama mengikuti masa berlaku sebelumnya sampai logout/kedaluwarsa. Reset kata sandi dan penonaktifan akun mencabut sesi.

## Backup terenkripsi

Gunakan klien `mysql` dan `mysqldump` yang kompatibel dengan server serta `tar` bawaan OS. Pada instalasi Windows ini, klien MySQL ada di `C:/laragon/bin/mysql/mysql-8.4.3-winx64/bin`.

Tambahkan konfigurasi berikut ke `.env` pada server:

```dotenv
MYSQL_BIN=C:/laragon/bin/mysql/mysql-8.4.3-winx64/bin
BACKUP_DIR=./backups
BACKUP_KEY=ISI_DENGAN_64_KARAKTER_HEX_ACAK
```

Operator dapat membuat kunci dengan `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`, lalu menyimpannya langsung di pengelola rahasia atau `.env` yang aksesnya dibatasi. Jangan memasukkan kunci ke Git, screenshot, atau log. Simpan salinan kunci terpisah dari arsip; tanpa kunci, backup tidak bisa dipulihkan.

```powershell
npm.cmd run backup:data
```

Arsip `.dsu` mencakup seluruh skema/data MySQL, migrasi, audit, foto, dan metadata unggahan. Arsip dikompresi lalu dienkripsi AES-256-GCM; password MySQL tidak diteruskan lewat argumen command. File sementara dibersihkan dan file akhir hanya muncul setelah backup berhasil. Database diambil dengan snapshot `--single-transaction`; jangan menjalankan migrasi bersamaan. Folder unggahan bersifat append-only dalam aplikasi; untuk snapshot saat aktivitas administrasi file/migrasi, hentikan penulisan terlebih dahulu.

Batasi ACL folder backup dan `.env` ke akun operator/service; mode POSIX 0600/0700 tidak menggantikan ACL Windows. Direktori kerja sementara berisi plaintext selama proses berlangsung. Folder `backups/` diabaikan Git dan tidak dilayani web. Salin arsip terenkripsi ke penyimpanan terpisah setiap hari. Tidak ada penghapusan backup otomatis.

## Penjadwalan harian

Di Windows Task Scheduler, buat tugas harian yang berjalan sebagai akun service. Program: `cmd.exe`; arguments: `/c npm.cmd run backup:data`; Start in: folder root proyek. Pada Linux, jalankan perintah yang sama melalui cron/systemd dengan working directory root proyek. Pastikan kunci dan DATABASE_URL tersedia untuk akun service. Penjadwalan OS belum didaftarkan otomatis oleh kode. Pantau exit code: `0` berhasil, `1` gagal. Pertahankan minimal 7 backup harian dan 4 mingguan di penyimpanan terpisah; hapus arsip lama hanya setelah salinan baru dan uji pemulihan berhasil.

## Pemulihan

Hentikan API dan semua job yang menulis database. Pastikan `DATABASE_URL` mengarah ke database tujuan yang sudah tersedia. Pemulihan mengganti tabel aplikasi dari backup; gunakan server/database staging terlebih dahulu. Untuk menguji dengan unggahan terpisah, set `BACKUP_UPLOADS_DIR` ke folder staging, bukan folder foto produksi.

```powershell
$env:BACKUP_MAINTENANCE='true'
npm.cmd run restore:data -- "backups/FILE.dsu" --confirm=NAMA_DATABASE_TUJUAN
Remove-Item Env:BACKUP_MAINTENANCE
```

Flag maintenance merupakan pernyataan operator, bukan penghentian API otomatis. Arsip diverifikasi seluruhnya sebelum database diubah. Backup database/foto tujuan dibuat otomatis sebelum restore. Semua sesi login dalam snapshot dihapus agar cookie lama tidak aktif kembali. Upload tujuan diganti oleh upload dari backup. Proses restore MySQL bukan transaksi atomik: jika terputus, pertahankan maintenance dan pulihkan arsip sebelum restore; jangan membuka API dengan database parsial. Setelah selesai, periksa jumlah data, pesanan, stok, dan foto, lalu aktifkan API serta login kembali.

## Pengujian

`npm run test:api` menguji hak akses, CSRF, kepemilikan, penonaktifan akun, dan reset kata sandi. `MYSQL_BIN` harus menunjuk klien yang cocok, lalu `npm run test:backup` membuat dua database sementara berakhiran `_test`, menguji pemulihan SQL/foto, pencabutan sesi, serta penolakan kunci salah/arsip rusak. Tes menghapus database dan folder sementara miliknya, tanpa mengubah database atau foto produksi.

Referensi: [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html), [MySQL mysqldump](https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html).
