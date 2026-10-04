# Audit error — 4 Oktober 2026

## Temuan dan perbaikan

- Checkout pengiriman menerima alamat jalan kosong karena validasi dilakukan setelah nama wilayah digabungkan. Pengujian browser mereproduksi pesanan yang tetap dibuat. Validasi sekarang memeriksa alamat jalan asli dan batas panjang alamat lengkap.
- Kegagalan refresh katalog menghapus state pengguna dan menghilangkan draf profil. Pengujian browser mereproduksi kehilangan formulir melalui respons katalog HTTP 503. Refresh sementara yang gagal sekarang mempertahankan data terakhir serta menampilkan pemberitahuan; HTTP 401 tetap menghapus sesi lokal.
- Modal validasi profil dan alamat checkout sekarang dapat muncul kembali saat formulir yang sama dikirim ulang tanpa perubahan.
- Kegagalan jaringan dan respons JSON rusak sekarang menghasilkan ApiError dengan pesan Indonesia yang dapat dipahami, bukan TypeError/SyntaxError mentah.

## Verifikasi

- TypeScript dan ESLint lulus.
- Build produksi Next.js lulus.
- Unit: 5 pengujian lulus, termasuk kegagalan jaringan dan JSON rusak.
- API: 8 pengujian lulus dengan database pengujian terpisah.
- Browser pelanggan: 5 skenario lulus, termasuk checkout alamat kosong dan pemulihan refresh.
- Browser petugas: 3 skenario lulus.
- Audit runtime memeriksa `/`, `/katalog`, `/katalog/browser-monstera`, `/plant-care`, `/login`, `/profil`, `/checkout`, `/akun`, `/admin/pesanan`, dan `/petugas`: tidak ditemukan error JavaScript, hidrasi, atau respons gambar HTTP gagal pada kunjungan yang diuji.

## Batas pemeriksaan

Pengujian memakai layanan dan database pengujian lokal; hasil ini tidak memverifikasi konfigurasi deployment produksi. Server development masih mengeluarkan peringatan optimasi loading gambar LCP, filesystem lambat, dan konfigurasi warna terminal. Peringatan tersebut tidak menggagalkan build atau skenario yang diuji.
