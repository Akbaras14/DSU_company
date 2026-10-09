# Navigasi petugas mengikuti admin

Petugas menggunakan kelas sidebar, logo, label area, breadcrumb, header, avatar, dan menu ponsel dari admin.css. CSS menu menerima tombol petugas maupun tautan admin. Sidebar desktop berukuran 216 piksel; menu tetap Penugasan, Riwayat pemantauan, dan Pengajuan jual. Konten petugas tetap memakai layout operasionalnya sendiri. Tidak menambahkan motion atau mengubah backend.

Pemeriksaan tipe, lint, format, dan build produksi lolos. Tujuh skenario browser pada MySQL terisolasi `db_dsu_test` lolos: menu aksi admin, navigasi/fokus petugas, penugasan dan riwayat, layout 280/390/768/1440 piksel, pengamatan dan pengajuan jual sampai keputusan admin, pemulihan draf, dan logout. Uji awal menemukan konten tablet melebar; diperbaiki dengan batas lebar konten sebelum pengulangan uji.

Pemeriksaan visual dan computed styles memastikan sidebar, padding, warna, garis, skala menu, dan minimum tinggi header mengikuti admin. Screenshot: `navbar-admin-reference.png`, `navbar-petugas-desktop.png`, `navbar-petugas-mobile.png`, dan `navbar-petugas-drawer.png`.

Preview menggunakan font fallback saat Google Fonts tidak dapat diakses. Runner Playwright Windows dihentikan setelah semua hasil skenario keluar karena teardown tertahan. Deployment belum dilakukan.
