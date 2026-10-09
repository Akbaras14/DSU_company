# UX admin dan petugas

Tema biru-putih customer dipertahankan. TasteSkill diterapkan untuk konsistensi visual dan keterbacaan dengan struktur komponen operasional yang sudah tersedia; tidak menambahkan library atau efek animasi.

Perubahan:

- Beranda admin menyediakan tindakan utama dengan jumlah pengajuan/pembayaran yang menunggu dan akses penugasan.
- Tabel bersama admin menjadi kartu berlabel pada ponsel. Pencarian memiliki label, tombol hapus, rentang hasil, dan tombol coba lagi saat pemuatan gagal.
- Form admin menjelaskan tanda wajib, mempertahankan nilai saat gagal, mengarahkan fokus ke kesalahan, dan mencegah pengiriman ganda. Pengaturan stok, pembayaran, dan pemantauan mempunyai petunjuk yang terhubung lewat aria-describedby.
- Petugas mendapat petunjuk langkah kerja sesuai menu, label filter terlihat, tombol detail dengan teks, dan reset filter pada hasil kosong.
- Perpindahan menu/kelompok dan penutupan detail meminta konfirmasi jika pengamatan atau pengajuan belum disimpan. Batal mempertahankan isian dan kelompok pilihan. Navigasi dinonaktifkan selama pengajuan dikirim.
- Kesalahan pemuatan petugas ditampilkan langsung di halaman agar tidak meninggalkan modal yang menghalangi data setelah pulih.

Acuan aksesibilitas: [label dan instruksi W3C](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html), [ukuran target minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), dan [pesan status](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html). Penerapan prinsip ini bukan sertifikasi kepatuhan WCAG seluruh aplikasi.

Validasi: pemeriksaan tipe, lint, format, dan build produksi. Empat belas skenario browser unik lolos dalam pengujian bertahap dengan MySQL terisolasi db_dsu_test, termasuk modul admin, error/fokus formulir, pengiriman pengamatan dan pengajuan, pembatalan perpindahan draf, pemulihan tabel, label kartu ponsel, dan CRUD parameter tanaman. Pemeriksaan visual memakai screenshot ux-admin-desktop/mobile dan ux-petugas-desktop/mobile.

Uji awal menemukan ekspektasi pesan validasi lama dan modal pemuatan yang tertinggal; ekspektasi dan akar masalah diperbaiki sebelum pengulangan. Skenario akhir dijalankan pada sesi API baru karena batas percobaan login berlaku juga pada fixture browser. Runner Windows dihentikan setelah hasil semua skenario keluar karena teardown tertahan. Preview memakai font fallback saat Google Fonts tidak terjangkau.

Tidak mengubah API, hak akses, atau data MySQL perusahaan. Belum melakukan deployment, pengujian dengan pengguna langsung, maupun audit aksesibilitas menyeluruh dengan pembaca layar.
