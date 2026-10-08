# ADMIN MODULE — DSU NURSERY MANAGEMENT SYSTEM

## 1. Overview

Admin merupakan pusat kontrol utama pada **Sistem Informasi Inventory dan Monitoring Pertumbuhan Tanaman CV Delta Sinergi Utama (DSU)**.

Admin bertanggung jawab terhadap pengelolaan master tanaman, batch tanaman, inventory, pengawasan monitoring pertumbuhan, persetujuan tanaman siap jual, katalog, pesanan pelanggan, pembayaran, pengguna, laporan, serta audit aktivitas sistem.

Admin tidak bertugas melakukan monitoring pertumbuhan tanaman secara rutin. Aktivitas monitoring merupakan tanggung jawab **Petugas**, sedangkan Admin berperan sebagai supervisor dan pengambil keputusan.

### Role

```text
ADMIN
```

### Prinsip Utama

```text
Inventory
    ↓
Monitoring
    ↓
Pengajuan Siap Jual
    ↓
Approval Admin
    ↓
Katalog
    ↓
Online Order
    ↓
Pembayaran
    ↓
Pemrosesan Pesanan
    ↓
Update Inventory
```

---

# 2. Admin Dashboard

## 2.1 Tujuan

Dashboard memberikan gambaran kondisi nursery dan operasional bisnis secara cepat kepada Admin.

Dashboard tidak hanya menampilkan statistik, tetapi juga informasi yang membutuhkan tindakan Admin.

---

## 2.2 Summary Cards

Tampilkan informasi:

- Total jenis tanaman aktif
- Total batch aktif
- Total stok tanaman
- Total tanaman siap jual
- Total tanaman dalam monitoring
- Total stok rendah
- Total pesanan baru
- Total pembayaran menunggu verifikasi

Contoh:

```text
┌───────────────────────┐
│ Total Stok            │
│ 1.245 Tanaman         │
└───────────────────────┘

┌───────────────────────┐
│ Siap Jual             │
│ 435 Tanaman           │
└───────────────────────┘

┌───────────────────────┐
│ Perlu Approval        │
│ 12 Pengajuan          │
└───────────────────────┘

┌───────────────────────┐
│ Pesanan Baru          │
│ 8 Pesanan             │
└───────────────────────┘
```

---

## 2.3 Action Required

Dashboard harus memiliki bagian **Perlu Tindakan**.

Tampilkan:

- Pengajuan tanaman siap jual
- Pembayaran menunggu verifikasi
- Pesanan baru
- Stok rendah
- Monitoring bermasalah
- Batch yang lama belum dimonitor

Setiap item memiliki tombol menuju halaman terkait.

Contoh:

```text
Perlu Tindakan

12 Pengajuan Siap Jual       → Review
5 Pembayaran Baru            → Verifikasi
8 Pesanan Baru               → Proses
3 Tanaman Stok Rendah        → Lihat Inventory
2 Batch Bermasalah           → Lihat Monitoring
```

---

## 2.4 Dashboard Charts

Tampilkan:

### Grafik Penjualan

Filter:

- 7 hari
- 30 hari
- Bulan ini
- Tahun ini

Data:

- Jumlah transaksi
- Pendapatan
- Jumlah tanaman terjual

### Grafik Inventory

Menampilkan distribusi:

- Dalam monitoring
- Siap jual
- Reserved
- Terjual
- Bermasalah

### Grafik Pertumbuhan

Menampilkan tren hasil monitoring tanaman berdasarkan batch.

---

## 2.5 Aktivitas Terbaru

Tampilkan aktivitas penting terbaru.

Contoh:

```text
10:42 — Admin menyetujui Batch BTH-001
10:21 — Petugas menambahkan monitoring Batch BTH-004
09:50 — Pembayaran ORD-20261005-001 diterima
09:32 — Pesanan baru ORD-20261005-002
```

---

# 3. Manajemen Tanaman

## 3.1 Tujuan

Mengelola master data tanaman yang digunakan oleh seluruh modul sistem.

---

## 3.2 Data Tanaman

Setiap tanaman memiliki:

```text
ID Tanaman
Kode Tanaman
Nama Tanaman
Kategori
Varietas
Deskripsi
Satuan
Foto
Parameter Pertumbuhan
Status
Created At
Updated At
```

---

## 3.3 Fitur

Admin dapat:

- Menambah tanaman
- Melihat tanaman
- Mengubah tanaman
- Mengaktifkan/nonaktifkan tanaman
- Upload foto
- Mengatur kategori
- Mengatur parameter pertumbuhan
- Melakukan pencarian
- Filter kategori
- Filter status

Hindari hard delete apabila tanaman sudah memiliki histori transaksi.

Gunakan:

```text
ACTIVE
INACTIVE
```

---

# 4. Kategori Tanaman

Admin dapat mengelola kategori tanaman.

Contoh:

```text
Tanaman Hias
Tanaman Buah
Tanaman Herbal
Tanaman Peneduh
Bibit Tanaman
```

Fitur:

- Tambah kategori
- Edit kategori
- Aktif/nonaktif kategori
- Lihat jumlah tanaman per kategori

---

# 5. Lokasi Nursery

## 5.1 Tujuan

Menentukan lokasi fisik batch tanaman di area nursery.

Contoh:

```text
Nursery A
└── Area A1

Nursery A
└── Area A2

Greenhouse
└── Area G1
```

---

## 5.2 Data Lokasi

```text
Kode Lokasi
Nama Lokasi
Deskripsi
Kapasitas
Status
```

Admin dapat:

- Tambah lokasi
- Edit lokasi
- Aktif/nonaktif lokasi
- Melihat batch pada lokasi

---

# 6. Batch Tanaman

## 6.1 Konsep

Tanaman harus dikelola menggunakan **batch**, bukan hanya berdasarkan jenis tanaman.

Contoh:

```text
Tanaman:
Monstera Deliciosa

Batch:
MON-202610-001

Tanggal Masuk:
01 Oktober 2026

Jumlah:
100

Lokasi:
Greenhouse A

Status:
MONITORING
```

Batch memungkinkan pertumbuhan tanaman ditelusuri secara historis.

---

## 6.2 Data Batch

```text
Batch ID
Batch Code
Plant ID
Tanggal Masuk
Jumlah Awal
Jumlah Saat Ini
Lokasi
Petugas
Status
Catatan
Created At
Updated At
```

---

## 6.3 Status Batch

Gunakan:

```text
DRAFT
MONITORING
READY_REVIEW
READY_FOR_SALE
PARTIALLY_SOLD
SOLD_OUT
REJECTED
ARCHIVED
```

---

## 6.4 Fitur Admin

Admin dapat:

- Membuat batch
- Edit batch
- Assign petugas
- Memindahkan lokasi
- Melihat inventory batch
- Melihat histori monitoring
- Melihat histori perubahan status
- Archive batch

---

# 7. Inventory Management

## 7.1 Tujuan

Inventory mencatat kondisi stok tanaman secara akurat.

Jangan hanya menggunakan satu field:

```text
stock
```

Gunakan pemisahan stok.

---

## 7.2 Struktur Inventory

```text
Total Stock
Available Stock
Reserved Stock
Sold Stock
Damaged Stock
Dead Stock
```

Dengan aturan:

```text
Total Stock
=
Available
+ Reserved
+ Sold
+ Damaged
+ Dead
```

---

## 7.3 Stock Movement

Semua perubahan stok wajib memiliki histori.

Jenis movement:

```text
INITIAL_STOCK
STOCK_IN
RESERVATION
RESERVATION_RELEASE
SALE
ADJUSTMENT
DAMAGED
DEAD
RETURN
```

---

## 7.4 Stock Adjustment

Admin dapat melakukan koreksi stok.

Admin wajib memberikan:

```text
Jumlah Sebelum
Jumlah Sesudah
Selisih
Alasan
Catatan
```

Contoh:

```text
Batch: MON-001

Sebelum:
100

Sesudah:
98

Alasan:
2 tanaman mati

Catatan:
Ditemukan saat pemeriksaan inventory.
```

Semua adjustment masuk **Audit Log**.

---

## 7.5 Low Stock

Admin dapat menentukan:

```text
Minimum Stock
```

Apabila:

```text
Available Stock <= Minimum Stock
```

sistem memberikan peringatan.

---

# 8. Monitoring Tanaman

## 8.1 Konsep

Monitoring dilakukan oleh Petugas.

Admin berfungsi sebagai supervisor.

---

## 8.2 Data Monitoring

Monitoring dapat berisi:

```text
Monitoring ID
Batch ID
Petugas
Tanggal Monitoring
Tinggi Tanaman
Jumlah Daun
Kondisi
Status Kesehatan
Catatan
Foto
Created At
```

Parameter dapat disesuaikan berdasarkan jenis tanaman.

---

## 8.3 Kondisi Tanaman

Gunakan:

```text
HEALTHY
NEEDS_ATTENTION
CRITICAL
```

---

## 8.4 Admin Monitoring View

Admin dapat:

- Melihat seluruh monitoring
- Filter tanaman
- Filter batch
- Filter petugas
- Filter tanggal
- Filter kondisi
- Melihat detail monitoring
- Melihat foto
- Melihat histori pertumbuhan

Admin tidak mengubah data monitoring Petugas secara langsung.

Apabila terdapat kesalahan, perubahan harus melalui mekanisme koreksi agar histori tetap tercatat.

---

# 9. Timeline Pertumbuhan

Setiap batch memiliki timeline.

Contoh:

```text
Batch MON-001

01 Oktober
18 cm
8 daun
Healthy

08 Oktober
22 cm
11 daun
Healthy

15 Oktober
27 cm
14 daun
Healthy
```

Sistem dapat menampilkan grafik:

```text
Tanggal → Tinggi Tanaman
Tanggal → Jumlah Daun
```

---

# 10. Persetujuan Tanaman Siap Jual

## 10.1 Konsep

Petugas tidak dapat langsung memasukkan tanaman ke katalog.

Workflow:

```text
PETUGAS
Monitoring
    ↓
PETUGAS
Ajukan Siap Jual
    ↓
ADMIN
Review
    ↓
┌─────────────┴─────────────┐
Approve                   Reject
↓                           ↓
READY_FOR_SALE           MONITORING
```

---

## 10.2 Informasi Review

Admin melihat:

- Tanaman
- Batch
- Lokasi
- Petugas
- Jumlah tanaman
- Monitoring terakhir
- Timeline pertumbuhan
- Foto
- Kondisi
- Catatan Petugas

---

## 10.3 Approval

Admin dapat memilih:

```text
APPROVED
REJECTED
```

Jika reject:

```text
Rejection Reason
```

wajib diisi.

---

# 11. Katalog

## 11.1 Konsep

Tanaman yang berada di inventory tidak otomatis tampil kepada pelanggan.

Hanya tanaman:

```text
READY_FOR_SALE
```

yang dapat dipublikasikan.

---

## 11.2 Data Katalog

```text
Product ID
Plant ID
Batch ID
Nama Produk
Harga
Harga Diskon
Deskripsi
Foto
Published Stock
Status
Published At
```

---

## 11.3 Status

```text
DRAFT
PUBLISHED
UNPUBLISHED
SOLD_OUT
```

---

## 11.4 Fitur

Admin dapat:

- Membuat listing
- Menentukan harga
- Menentukan diskon
- Menentukan jumlah publik
- Mengubah deskripsi
- Upload foto
- Publish
- Unpublish
- Menentukan produk unggulan

Aturan:

```text
Published Stock <= Available Stock
```

---

# 12. Manajemen Pesanan

## 12.1 Order Lifecycle

Gunakan workflow:

```text
PENDING_PAYMENT
        ↓
WAITING_VERIFICATION
        ↓
PAID
        ↓
PROCESSING
        ↓
READY_TO_SHIP
        ↓
SHIPPED
        ↓
COMPLETED
```

Status alternatif:

```text
CANCELLED
PAYMENT_REJECTED
```

---

## 12.2 Data Order

```text
Order Number
Customer
Tanggal
Items
Quantity
Subtotal
Shipping Cost
Total
Payment
Shipping Address
Order Status
Created At
```

---

## 12.3 Admin Actions

Admin dapat:

- Melihat order
- Filter status
- Search nomor order
- Melihat detail pelanggan
- Verifikasi pembayaran
- Reject pembayaran
- Memproses order
- Menandai siap dikirim
- Input informasi pengiriman
- Menandai selesai
- Membatalkan order dengan alasan

---

# 13. Stock Reservation

Ketika pelanggan checkout:

```text
Available Stock
        ↓
Reserved Stock
```

Contoh:

```text
Available = 20
Customer Order = 3

Available = 17
Reserved = 3
```

Setelah pembayaran berhasil:

```text
Reserved → Sold
```

Apabila order dibatalkan:

```text
Reserved → Available
```

Mekanisme ini wajib digunakan untuk mencegah **overselling**.

---

# 14. Pembayaran

Admin memiliki halaman khusus pembayaran.

Tampilkan:

```text
Order Number
Customer
Total
Payment Method
Payment Proof
Payment Date
Status
```

Status:

```text
WAITING
VERIFIED
REJECTED
```

Admin dapat:

- Melihat bukti pembayaran
- Verifikasi
- Reject
- Memberikan alasan penolakan

Semua perubahan status pembayaran masuk Audit Log.

---

# 15. Manajemen Petugas

Admin dapat:

- Membuat akun Petugas
- Edit profil
- Aktif/nonaktif akun
- Assign batch
- Melihat batch yang ditangani
- Melihat aktivitas monitoring

Data:

```text
Nama
Email
Nomor Telepon
Status
Jumlah Batch
Last Activity
```

---

# 16. Manajemen Pelanggan

Admin dapat melihat:

```text
Nama
Email
Nomor Telepon
Alamat
Jumlah Order
Total Transaksi
Status
Tanggal Daftar
```

Admin dapat:

- Search pelanggan
- Melihat detail
- Melihat histori order
- Aktif/nonaktif akun

Admin tidak boleh melihat password pelanggan.

Password harus disimpan menggunakan hashing.

---

# 17. Laporan

Sediakan satu menu utama:

```text
Laporan
```

---

## 17.1 Laporan Inventory

Berisi:

- Stok tanaman
- Stok per batch
- Stock movement
- Stok rendah
- Tanaman rusak
- Tanaman mati
- Tanaman siap jual

---

## 17.2 Laporan Monitoring

Berisi:

- Monitoring per periode
- Monitoring per batch
- Monitoring per tanaman
- Monitoring per petugas
- Kondisi tanaman
- Kesiapan jual

---

## 17.3 Laporan Penjualan

Berisi:

- Jumlah order
- Tanaman terjual
- Pendapatan
- Produk terlaris
- Penjualan per periode

Filter:

```text
Hari Ini
7 Hari
30 Hari
Bulan
Tahun
Custom Date
```

Export:

```text
PDF
Excel
```

---

# 18. Audit Log

## 18.1 Tujuan

Mencatat aktivitas kritis sistem.

---

## 18.2 Aktivitas Yang Dicatat

Minimal:

- Login
- Membuat batch
- Perubahan inventory
- Stock adjustment
- Approval tanaman
- Reject tanaman
- Perubahan harga
- Publish katalog
- Verifikasi pembayaran
- Reject pembayaran
- Perubahan status order
- Perubahan user

---

## 18.3 Struktur

```text
Timestamp
User
Role
Action
Entity
Entity ID
Old Value
New Value
Description
```

Contoh:

```text
05/10/2026 10:32

User:
Admin

Action:
STOCK_ADJUSTMENT

Entity:
Batch MON-001

Old:
100

New:
98

Reason:
2 tanaman mati
```

Audit Log bersifat **read-only**.

Admin tidak dapat menghapus atau mengubah audit log melalui dashboard.

---

# 19. Notifikasi

Admin mendapatkan notifikasi untuk kejadian penting:

```text
READY_FOR_SALE_REQUEST
NEW_ORDER
PAYMENT_RECEIVED
LOW_STOCK
PLANT_CRITICAL
MONITORING_OVERDUE
```

Notifikasi harus dapat:

- Ditandai dibaca
- Ditandai semua dibaca
- Mengarahkan ke halaman terkait

---

# 20. Global Search

Admin dapat melakukan pencarian berdasarkan:

```text
Kode tanaman
Nama tanaman
Batch
Order Number
Nama pelanggan
Nama petugas
```

Global Search hanya berfungsi sebagai navigasi cepat.

---

# 21. Pengaturan

Pengaturan Admin meliputi:

## Profil Perusahaan

```text
Nama Perusahaan
Logo
Alamat
Nomor Telepon
Email
```

## Inventory

```text
Default Minimum Stock
```

## Order

```text
Payment Timeout
Order Cancellation Rule
```

## Monitoring

```text
Monitoring Interval
```

---

# 22. Role & Permission

Gunakan **Role-Based Access Control (RBAC)**.

Role utama:

```text
ADMIN
PETUGAS
PELANGGAN
```

---

## ADMIN

Memiliki akses terhadap:

```text
Dashboard
Tanaman
Kategori
Lokasi
Batch
Inventory
Monitoring
Approval
Katalog
Pesanan
Pembayaran
Petugas
Pelanggan
Laporan
Audit Log
Pengaturan
```

---

## PETUGAS

Fokus terhadap:

```text
Batch yang ditugaskan
Monitoring
Upload foto monitoring
Update kondisi tanaman
Pengajuan siap jual
Riwayat monitoring
```

---

## PELANGGAN

Fokus terhadap:

```text
Katalog
Keranjang
Checkout
Pembayaran
Pesanan
Profil
Alamat
```

---

# 23. Sidebar Admin Final

```text
DSU ADMIN
│
├── Dashboard
│
├── Nursery
│   ├── Tanaman
│   ├── Kategori
│   ├── Batch Tanaman
│   ├── Lokasi Nursery
│   └── Inventory
│
├── Monitoring
│   ├── Monitoring Tanaman
│   └── Persetujuan Siap Jual
│
├── Penjualan
│   ├── Katalog
│   ├── Pesanan
│   └── Pembayaran
│
├── Pengguna
│   ├── Petugas
│   └── Pelanggan
│
├── Laporan
│   ├── Inventory
│   ├── Monitoring
│   └── Penjualan
│
└── Sistem
    ├── Audit Log
    └── Pengaturan
```

---

# 24. Status Definitions

Status harus menggunakan enum/constant pada backend dan tidak menggunakan string bebas.

## Plant

```text
ACTIVE
INACTIVE
```

## Batch

```text
DRAFT
MONITORING
READY_REVIEW
READY_FOR_SALE
PARTIALLY_SOLD
SOLD_OUT
REJECTED
ARCHIVED
```

## Plant Health

```text
HEALTHY
NEEDS_ATTENTION
CRITICAL
```

## Approval

```text
PENDING
APPROVED
REJECTED
```

## Catalog

```text
DRAFT
PUBLISHED
UNPUBLISHED
SOLD_OUT
```

## Payment

```text
WAITING
VERIFIED
REJECTED
```

## Order

```text
PENDING_PAYMENT
WAITING_VERIFICATION
PAID
PROCESSING
READY_TO_SHIP
SHIPPED
COMPLETED
CANCELLED
PAYMENT_REJECTED
```

## User

```text
ACTIVE
INACTIVE
```

---

# 25. Business Rules

## BR-001 — Batch

Setiap tanaman yang masuk nursery harus terdaftar pada sebuah batch.

---

## BR-002 — Monitoring

Monitoring hanya dapat dilakukan Petugas terhadap batch yang menjadi tanggung jawabnya.

---

## BR-003 — Approval

Petugas tidak dapat memberikan status `READY_FOR_SALE` secara langsung.

Petugas hanya dapat mengajukan:

```text
READY_REVIEW
```

Admin yang menentukan:

```text
READY_FOR_SALE
```

---

## BR-004 — Catalog

Batch hanya dapat dipublikasikan apabila:

```text
Batch Status = READY_FOR_SALE
```

---

## BR-005 — Published Stock

```text
Published Stock <= Available Stock
```

---

## BR-006 — Inventory

Stock tidak boleh memiliki nilai negatif.

```text
stock >= 0
```

---

## BR-007 — Reservation

Checkout pelanggan harus membuat stock reservation.

---

## BR-008 — Payment

Order tidak dapat masuk `PROCESSING` sebelum pembayaran diverifikasi.

---

## BR-009 — Stock Adjustment

Setiap adjustment harus memiliki alasan dan tercatat dalam Audit Log.

---

## BR-010 — Historical Data

Data yang sudah memiliki histori transaksi tidak boleh di-hard-delete.

Gunakan:

```text
ACTIVE
INACTIVE
ARCHIVED
```

sesuai jenis data.

---

## BR-011 — Audit Log

Audit Log tidak dapat diedit atau dihapus melalui aplikasi Admin.

---

## BR-012 — Security

Password tidak boleh disimpan dalam bentuk plain text.

Gunakan password hashing yang aman.

---

# 26. UI/UX Requirements

Semua halaman Admin harus memiliki:

- Responsive layout
- Breadcrumb
- Page title
- Search
- Filter
- Pagination
- Empty state
- Loading state
- Error state
- Confirmation dialog
- Toast/notification
- Form validation
- Permission-aware action

---

# 27. Table Standard

Tabel Admin menggunakan struktur:

```text
Search
Filter
Sort
Pagination
```

Action menggunakan:

```text
View
Edit
Action Menu (...)
```

Hindari terlalu banyak tombol langsung di setiap row.

---

# 28. Form Standard

Form harus memiliki:

```text
Label
Required Indicator
Helper Text
Validation Message
Save Button
Cancel Button
```

Tombol destructive wajib menggunakan confirmation dialog.

Contoh:

```text
Nonaktifkan tanaman?

Tanaman tidak akan muncul pada proses pembuatan
batch baru, tetapi seluruh histori tetap tersimpan.

[ Batal ] [ Nonaktifkan ]
```

---

# 29. Empty State

Jangan hanya menampilkan:

```text
No Data
```

Gunakan pesan kontekstual.

Contoh:

```text
Belum ada batch tanaman.

Buat batch pertama untuk mulai mencatat inventory
dan monitoring tanaman.

[ + Tambah Batch ]
```

---

# 30. Error Handling

Frontend tidak boleh mengabaikan error API.

Minimal tangani:

```text
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Validation Error
500 Internal Server Error
```

Pesan kepada pengguna harus human-readable.

Contoh:

```text
Stok tidak mencukupi.

Tersedia: 5 tanaman
Diminta: 8 tanaman
```

Bukan:

```text
Error 500
```

---

# 31. Security Requirements

Admin merupakan role dengan privilege tertinggi sehingga wajib memiliki proteksi:

- Authentication
- Authorization
- RBAC
- Password hashing
- Server-side validation
- Input sanitization
- Rate limiting pada endpoint sensitif
- Secure session/token handling
- Audit logging
- Protection terhadap unauthorized API access

Frontend tidak boleh dianggap sebagai security boundary.

Semua permission harus tetap divalidasi pada backend.

---

# 32. Responsive Requirements

Admin dashboard harus dapat digunakan pada:

```text
Desktop
Tablet
Mobile
```

Prioritas utama:

```text
Desktop → Tablet → Mobile
```

Pada mobile:

- Sidebar berubah menjadi drawer
- Table dapat horizontal scroll atau berubah menjadi card
- Action tetap dapat diakses
- Form tetap usable
- Chart responsive

---

# 33. Admin Operational Flow

Flow utama sistem:

```text
ADMIN
Membuat Master Tanaman
        ↓
ADMIN
Membuat Batch
        ↓
ADMIN
Menentukan Inventory & Petugas
        ↓
PETUGAS
Melakukan Monitoring
        ↓
PETUGAS
Mengajukan Siap Jual
        ↓
ADMIN
Review Monitoring
        ↓
ADMIN
Approve
        ↓
ADMIN
Menentukan Harga
        ↓
ADMIN
Publish Katalog
        ↓
PELANGGAN
Melakukan Checkout
        ↓
SYSTEM
Reserve Stock
        ↓
PELANGGAN
Melakukan Pembayaran
        ↓
ADMIN
Verifikasi Pembayaran
        ↓
ADMIN
Memproses Pesanan
        ↓
ADMIN
Mengirim Pesanan
        ↓
SYSTEM
Update Inventory
        ↓
ORDER COMPLETED
```

---

# 34. Priority Implementation

## P0 — Core

Wajib tersedia:

```text
Authentication
Dashboard
Tanaman
Kategori
Batch
Inventory
Petugas
Monitoring
Approval Siap Jual
Katalog
Pesanan
Pembayaran
Pelanggan
```

## P1 — Important

```text
Dashboard Chart
Notification
Stock Movement
Low Stock Alert
Reports
Audit Log
Timeline Pertumbuhan
```

## P2 — Enhancement

```text
Global Search
Advanced Analytics
Advanced Export
Dashboard Customization
```

Fitur P2 tidak boleh menghambat penyelesaian fitur inti.

---

# 35. Final Admin Architecture

Modul Admin DSU secara konseptual dibagi menjadi:

```text
ADMIN
│
├── NURSERY MANAGEMENT
│   ├── Plant
│   ├── Category
│   ├── Batch
│   ├── Location
│   └── Inventory
│
├── GROWTH MANAGEMENT
│   ├── Monitoring
│   ├── Growth History
│   └── Ready-for-Sale Approval
│
├── COMMERCE MANAGEMENT
│   ├── Catalog
│   ├── Order
│   └── Payment
│
├── USER MANAGEMENT
│   ├── Staff
│   └── Customer
│
├── REPORTING
│   ├── Inventory Report
│   ├── Monitoring Report
│   └── Sales Report
│
└── SYSTEM
    ├── Notification
    ├── Audit Log
    └── Settings
```

---

# 36. Final Scope

Admin DSU harus menjadi **pusat kontrol operasional nursery**, bukan sekadar dashboard CRUD.

Hubungan utama sistem yang wajib dipertahankan adalah:

```text
TANAMAN
   ↓
BATCH
   ↓
INVENTORY
   ↓
MONITORING
   ↓
APPROVAL
   ↓
KATALOG
   ↓
ORDER
   ↓
PAYMENT
   ↓
FULFILLMENT
   ↓
INVENTORY UPDATE
```

Arsitektur fitur ini menjadi acuan final pengembangan modul Admin DSU.

Perubahan fitur setelah dokumen ini ditetapkan harus mempertimbangkan dampaknya terhadap:

1. Inventory
2. Monitoring
3. Approval
4. Catalog
5. Order
6. Payment
7. Audit Log

Tujuan akhirnya adalah menjaga seluruh proses nursery dari tanaman masuk, pertumbuhan, kesiapan jual, penjualan, hingga pembaruan inventory tetap **terintegrasi, dapat ditelusuri, dan konsisten**.