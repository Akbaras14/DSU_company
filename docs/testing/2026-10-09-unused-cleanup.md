# Audit dan pembersihan file tidak terpakai

Audit memeriksa import/re-export dan pemakaian simbol melalui TypeScript pada web/API, entry point dari package.json, konvensi route Next.js, referensi aset literal/dinamis, konfigurasi, skrip, tes, serta dokumentasi. Kandidat diperiksa kembali sebelum dihapus; tidak menggunakan jumlah import sebagai satu-satunya dasar.

## Yang dihapus

- `scripts/seed-local-catalog.mts`: seed lama merujuk `data/catalog-dummy.json` yang sudah tidak ada dan tidak dipanggil dari skrip npm. Seed aktif tersedia melalui `npm run db:seed`.
- `scripts/bootstrap-local-admin.mts` dan `scripts/bootstrap-local-petugas.mts`: skrip setup lokal sekali pakai tanpa pemanggil atau dokumentasi aktif. Pembuatan admin tersedia melalui `npm run admin:create`; akun petugas dibuat melalui admin; akun simulasi dibuat oleh seed aktif.
- Sembilan kontrak tanpa pemakai di workspace privat: User, PaymentStatus, Finding, ReadinessRequest, CartItem, OrderItemSnapshot, Payment, Reservation, dan NurseryReadService. Tipe Prisma dan tipe operasional yang masih digunakan tetap disimpan.
- Komponen EmptyState, SheetClose, SheetFooter, serta re-export DrawerClose/DrawerFooter yang tidak dipanggil. `buttonVariants` tetap digunakan di dalam Button, sehingga hanya ekspornya dihapus.
- 23 aturan CSS navigasi lama di globals.css dan dua aturan `.shop-profile` lama di storefront.css. Navigasi aktif memakai kelas admin; halaman profil aktif memakai `.shop-profile-page`.
- 15 screenshot lama tanpa referensi kode, tes, atau dokumentasi: admin-addplant-mobile; admin-assignment-desktop/mobile; admin-clean-desktop/mobile; admin-compact-desktop; admin-compact-modal-desktop/mobile; admin-submenus-desktop; admin-taste-desktop/mobile; monitoring-filters-1440/390; petugas-pengajuan-jual-desktop/mobile. Total ukuran 1.261.788 byte.
- Folder cache browser `.next-customer-test` lama (502 file, 322.748.255 byte), folder hasil tes, dan cache incremental TypeScript. Cache dapat dibuat kembali saat pengujian atau pemeriksaan tipe berjalan.

## Yang dipertahankan

Semua 12 aset gambar di public masih dipakai, termasuk mascot dengan nama dinamis dan foto tanaman yang dipakai seed/fixture. CREDITS dan lisensi React Bits tetap ada. Screenshot yang dirujuk task.md, laporan pengujian, pola theme/ux, atau output tes browser tetap disimpan.

Route, layout, error/loading page, favicon, konfigurasi Next.js, entry point API/CLI, tes, dan fixture tetap ada meskipun tidak selalu di-import langsung. `lib/utils.ts` dipertahankan karena alias konfigurasi shadcn merujuknya. Dependency yang terpasang masih dipakai kode atau toolchain. Dokumen kebutuhan dan instruksi agent tetap dipertahankan.

Tidak menghapus dependency terpasang, hasil build produksi, environment/kredensial, isi database MySQL, migrasi, foto upload pengguna, atau fixture bukti pembayaran seed.

## Validasi

Pemeriksaan tipe, lint, format, dan build produksi lolos. Tujuh unit test dan tiga skenario browser terarah lolos: navigasi/fokus petugas di ponsel; layout petugas pada 280/390/768/1440 piksel; pemulihan tabel admin dan label kartu ponsel. Browser memakai MySQL terisolasi db_dsu_test.

Runner browser memakai kompilasi esbuild sementara karena tsx gagal membaca informasi akun Windows. Ketiga skenario selesai berhasil; runner dihentikan setelah hasil keluar karena teardown Windows tertahan. Preview memakai font fallback karena Google Fonts tidak terjangkau. Build awal bersamaan dengan penghapusan cache sempat gagal membaca tipe hasil tes yang baru dihapus; pengulangan setelah pembersihan cache selesai lolos. Semua berkas audit, kompilasi, konfigurasi, dan log sementara dibersihkan.

Pembersihan bukan audit keamanan menyeluruh. Referensi dari sistem eksternal di luar workspace tidak dapat diperiksa; kontrak yang dihapus berasal dari package workspace privat. Tidak menjalankan ulang seluruh tes integrasi transaksi atau melakukan deployment.
