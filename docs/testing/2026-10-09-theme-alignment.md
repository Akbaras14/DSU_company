# Penyelarasan tema admin dan petugas

Menggunakan design-taste-frontend (TasteSkill) untuk mempertahankan identitas customer: latar #fafcfd, panel putih, teks #123b61, aksen #246b92, dan garis #dce5eb. Kepadatan tabel operasional dipertahankan. Tidak menambahkan efek atau dependency animasi. MySQL dan alur API tetap digunakan.

Palet customer dipindahkan ke variabel bersama `--dsu-*` di globals.css; storefront, admin, dan petugas memakai nilai yang sama. Dialog admin, menu aksi, navigasi ponsel, fokus keyboard, dan logo petugas diselaraskan.

Verifikasi:

- Lint, typecheck, dan build produksi lolos.
- Browser Chrome dengan fixture pada MySQL lokal terisolasi `db_dsu_test`: warna dasar customer/admin/petugas cocok; sidebar putih; menu aksi serta navigasi ponsel cocok.
- Uji menu aksi tanpa perubahan lebar tabel, navigasi petugas dengan pengembalian fokus, dan tata letak pada lebar 280/390/768/1440 piksel lolos.
- Screenshot desktop dan ponsel diperiksa; lihat file `theme-*.png` di direktori ini.

Catatan lingkungan: preview memakai font fallback karena Google Fonts tidak dapat diakses. Runner Playwright di Windows dihentikan setelah hasil semua skenario keluar karena proses teardown tertahan. Deployment dan pengujian seluruh alur transaksi tidak dilakukan untuk perubahan tampilan ini.
