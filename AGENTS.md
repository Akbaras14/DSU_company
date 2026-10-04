<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Efek visual dan motion: React Bits

- Semua efek visual dan motion pada antarmuka proyek ini wajib menggunakan komponen atau implementasi dari React Bits (https://reactbits.dev/).
- Aturan ini mencakup animasi teks, background, carousel, pergantian gambar, reveal saat scroll, hover, transisi, dan interaksi beranimasi di seluruh halaman customer maupun admin.
- Sebelum implementasi, periksa dokumentasi dan sumber resmi React Bits untuk memilih komponen yang sesuai. Gunakan varian TypeScript dan sesuaikan dengan sistem styling proyek.
- Simpan komponen React Bits yang diadopsi di `apps/web/components/react-bits/`. Pertahankan atribusi sumber dan ketentuan lisensinya; jangan mengubahnya menjadi implementasi kustom tanpa jejak sumber.
- Gunakan dependency animasi hanya jika diperlukan oleh komponen React Bits yang dipilih. Jangan menambahkan efek langsung dengan Framer Motion, Motion, GSAP, CSS keyframes, atau library lain sebagai implementasi terpisah dari React Bits.
- Saat menambah atau mengubah efek yang sudah ada, gunakan React Bits untuk efek tersebut. Migrasi seluruh animasi lama dilakukan saat diminta, bukan sebagai perubahan tambahan pada tugas yang tidak terkait.
- Jika React Bits tidak menyediakan efek yang diperlukan, jelaskan keterbatasannya dan minta arahan pengguna sebelum memakai implementasi alternatif.
- Tetap hormati `prefers-reduced-motion`, fokus keyboard, keterbacaan, area sentuh, dan responsivitas. Kurangi atau nonaktifkan efek jika diperlukan untuk aksesibilitas dan performa.
- Efek harus memiliki tujuan yang jelas, seperti feedback interaksi atau memperjelas perubahan keadaan. Jangan menambahkan animasi dekoratif hanya karena komponennya tersedia.
- Instruksi eksplisit terbaru dari pengguna dapat memberikan pengecualian terhadap aturan ini.
