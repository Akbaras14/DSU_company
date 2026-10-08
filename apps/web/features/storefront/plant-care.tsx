"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Droplets, Leaf, MessageCircle, Sun } from "lucide-react";
import { useShop } from "./provider";
import "./plant-care.css";

const topics = [
  ["adaptasi", "Tanaman baru"],
  ["dasar", "Dasar perawatan"],
  ["cahaya", "Cahaya & lokasi"],
  ["repotting", "Ganti pot"],
  ["rutinitas", "Checklist"],
  ["masalah", "Masalah umum"],
  ["faq", "Tanya jawab"],
] as const;

const basics = [
  [
    "01",
    "Penyiraman",
    "Periksa media, baru ambil penyiram.",
    [
      "Untuk banyak tanaman daun, periksa lapisan atas media dan berat pot sebelum menyiram. Media yang masih lembap belum tentu membutuhkan air tambahan.",
      "Siram perlahan sampai air mengalir dari lubang pot. Biarkan tiris dan buang air yang tertampung di tatakan atau pot dekoratif.",
      "Kaktus dan sukulen membutuhkan periode kering lebih panjang. Tanaman yang menyukai kelembapan memerlukan pendekatan berbeda; kenali jenisnya terlebih dahulu.",
    ],
  ],
  [
    "02",
    "Media & drainase",
    "Akar juga membutuhkan udara.",
    [
      "Gunakan media pot yang sesuai jenis tanaman dan cukup berpori. Tanah taman yang padat dapat menahan terlalu banyak air ketika dipakai di dalam pot.",
      "Pastikan lubang drainase terbuka. Pot dekoratif tanpa lubang digunakan sebagai pot luar; keluarkan pot dalam ketika menyiram.",
      "Media untuk tanaman daun dan sukulen tidak harus sama. Pilih campuran siap pakai yang sesuai, lalu amati kecepatan keringnya di lokasi Anda.",
    ],
  ],
  [
    "03",
    "Pemupukan",
    "Beri nutrisi sesuai pertumbuhan.",
    [
      "Gunakan pupuk untuk tanaman pot sesuai dosis dan frekuensi pada label. Catat tanggal pemberian agar tidak menumpuk aplikasi.",
      "Pupuk bukan solusi pertama untuk tanaman layu. Periksa cahaya, air, dan akar sebelum menambah nutrisi.",
      "Sesuaikan pemberian ketika pertumbuhan melambat. Hindari menggabungkan beberapa pupuk tanpa memperhitungkan total dosisnya.",
    ],
  ],
  [
    "04",
    "Daun & pemangkasan",
    "Bersih, rapi, dan mudah diamati.",
    [
      "Bersihkan daun halus dengan kain lembut yang lembap. Tangani daun berbulu atau rapuh dengan hati-hati, tanpa menggosok permukaannya.",
      "Buang daun mati dan bagian rusak dengan alat yang bersih. Bersihkan alat ketika berpindah tanaman, terutama jika ada dugaan penyakit.",
      "Periksa pangkal daun dan bagian bawahnya saat membersihkan. Catat perubahan, bukan langsung menyimpulkan bahwa setiap daun kuning berarti kurang pupuk.",
    ],
  ],
  [
    "05",
    "Sirkulasi & kelembapan",
    "Pilih lokasi yang nyaman untuk tanaman.",
    [
      "Hindari hembusan AC langsung dan perubahan lokasi yang mendadak. Sediakan sirkulasi udara tanpa membiarkan tanaman terus diterpa angin kuat.",
      "Kebutuhan kelembapan berbeda menurut jenis tanaman. Perhatikan kondisi ruangan dan jangan menjadikan penyemprotan daun pengganti penyiraman akar.",
      "Di teras yang terkena hujan, cek pot setelah hujan panjang. Pastikan air dapat keluar dan media tidak terus tergenang.",
    ],
  ],
  [
    "06",
    "Pencegahan hama",
    "Temukan lebih awal, tangani lebih terarah.",
    [
      "Periksa tanaman baru dan pisahkan tanaman yang menunjukkan hama dari koleksi lain. Amati daun, batang, dan media secara berkala.",
      "Jika terlihat serangga, bersihkan bagian yang memungkinkan dan identifikasi hamanya sebelum memilih penanganan.",
      "Bila memakai produk pengendali hama, ikuti label untuk tanaman dan hama yang dituju. Hindari mencampur bahan atau meningkatkan dosis sendiri.",
    ],
  ],
] as const;

const problems = [
  [
    "Daun menguning",
    "Penuaan daun, air berlebih, atau kondisi cahaya kurang sesuai.",
    "Cek media dan drainase; amati apakah hanya daun lama atau banyak daun sekaligus.",
  ],
  [
    "Layu, media basah",
    "Akar bermasalah atau media terlalu lama basah.",
    "Jangan langsung menambah air. Cek genangan, drainase, dan kondisi akar bila perlu.",
  ],
  [
    "Layu, media kering",
    "Kekurangan air atau media sulit menyerap air.",
    "Siram bertahap sampai media terbasahi, lalu biarkan tiris.",
  ],
  [
    "Ujung daun cokelat",
    "Kekeringan, garam pupuk, atau kelembapan kurang sesuai.",
    "Tinjau riwayat siram dan pupuk, serta lokasi tanaman. Jangan menaikkan dosis pupuk.",
  ],
  [
    "Batang memanjang, daun kecil",
    "Cahaya mungkin tidak mencukupi.",
    "Pindahkan bertahap ke lokasi lebih terang sesuai kebutuhan jenisnya.",
  ],
  [
    "Bercak, jaring halus, atau kutu",
    "Kemungkinan hama; bercak juga bisa berasal dari kondisi lingkungan.",
    "Pisahkan tanaman, periksa bawah daun, dan dokumentasikan sebelum menentukan penanganan.",
  ],
] as const;

const checklist = [
  "Periksa kelembapan media dan berat pot sebelum memutuskan menyiram.",
  "Pastikan tatakan pot tidak menyimpan genangan.",
  "Periksa bagian bawah daun, pangkal batang, dan tanda hama.",
  "Bersihkan debu dan singkirkan daun yang sudah mati.",
  "Catat perubahan daun, tunas baru, dan tanggal pemberian pupuk.",
] as const;

const questions = [
  [
    "Apakah semua tanaman harus disiram setiap hari?",
    "Tidak. Ukuran pot, jenis media, cahaya, cuaca, dan jenis tanaman menentukan cepat lambatnya media kering. Gunakan kondisi media sebagai acuan; periksa lebih sering saat cuaca panas tanpa otomatis menambah air.",
  ],
  [
    "Apakah tanaman indoor bisa hidup di ruangan tanpa cahaya?",
    "Tanaman tetap membutuhkan cahaya. Istilah indoor tidak berarti dapat tumbuh di ruangan gelap. Pilih lokasi dengan cahaya yang sesuai atau gunakan lampu tumbuh yang cocok untuk tanaman.",
  ],
  [
    "Mengapa daun menguning setelah tanaman dipindahkan?",
    "Perubahan cahaya dan lingkungan dapat memicu penyesuaian, tetapi air berlebih dan masalah akar juga mungkin terjadi. Periksa kondisi media dan lokasi; hindari memindahkan tanaman berulang kali tanpa alasan yang jelas.",
  ],
  [
    "Kapan perlu mengganti pot?",
    "Pertimbangkan saat akar memenuhi pot, pertumbuhan terganggu, atau media sudah padat dan tidak berfungsi baik. Akar keluar dari lubang pot adalah petunjuk untuk memeriksa, bukan satu-satunya alasan mengganti pot.",
  ],
  [
    "Bolehkah langsung memupuk tanaman yang baru datang?",
    "Periksa kondisi tanaman dan tanyakan kapan terakhir diberi pupuk. Utamakan penempatan dan penyiraman yang tepat, lalu ikuti kebutuhan tanaman serta petunjuk produk pupuk.",
  ],
  [
    "Bagaimana merawat tanaman saat beberapa hari tidak di rumah?",
    "Periksa kebutuhan masing-masing tanaman sebelum pergi. Minta bantuan orang lain dengan instruksi tertulis bila perlu. Jangan meninggalkan pot tergenang sebagai cadangan air; uji sistem penyiraman terlebih dahulu jika digunakan.",
  ],
  [
    "Apakah satu campuran media cocok untuk semua tanaman?",
    "Tidak selalu. Tanaman yang menyukai media lembap, tanaman daun, dan sukulen memiliki kebutuhan berbeda. Pilih media sesuai jenis tanaman dan kondisi tempat tumbuhnya.",
  ],
  [
    "Apa yang perlu dikirim saat konsultasi?",
    "Sertakan foto seluruh tanaman, bagian yang bermasalah, pot dan media, serta informasi lokasi, pola penyiraman, pupuk terakhir, dan sejak kapan gejala muncul. Foto yang jelas membantu tim memberi arahan awal.",
  ],
] as const;

function Mascot({
  file,
  className = "",
}: {
  file: string;
  className?: string;
}) {
  return (
    <div className={`care-mascot ${className}`}>
      <Image
        src={`/images/maskot/${file}`}
        alt="Maskot Delta Sinergi Utama"
        fill
        unoptimized
        sizes="(max-width: 767px) 200px, 320px"
      />
    </div>
  );
}

export function PlantCareContent() {
  const { settings } = useShop();
  const [checked, setChecked] = useState<number[]>([]);
  const whatsapp = `https://wa.me/${settings?.whatsappNumber || "6285893802972"}?text=${encodeURIComponent("Halo, saya ingin konsultasi perawatan tanaman. Jenis tanaman: ...; lokasi: ...; pola siram: ...; keluhan: ...")}`;
  return (
    <div className="care-page">
      <section className="care-hero">
        <div>
          <span className="shop-eyebrow">PANDUAN PERAWATAN TANAMAN</span>
          <h1>
            Ruang lebih asri.
            <br />
            <span>Tanaman lebih terawat.</span>
          </h1>
          <p>
            Kenali kebutuhan tanaman Anda, mulai dari cahaya dan air sampai cara
            membaca perubahan pada daun. Panduan praktis untuk merawat tanaman
            di rumah, teras, dan ruang kerja.
          </p>
          <div className="shop-hero-actions">
            <a className="shop-button" href="#dasar">
              Mulai merawat <ArrowRight size={18} />
            </a>
            <Link className="shop-text-link" href="/katalog">
              Pilih tanaman Anda
            </Link>
          </div>
        </div>
        <Mascot file="maskot_two.webp" />
      </section>
      <nav className="care-nav" aria-label="Topik perawatan tanaman">
        {topics.map(([id, title]) => (
          <a key={id} href={`#${id}`}>
            {title}
          </a>
        ))}
      </nav>

      <section
        className="care-section care-arrival"
        id="adaptasi"
        aria-labelledby="arrival-title"
      >
        <div>
          <span className="shop-eyebrow">SAAT TANAMAN BARU DATANG</span>
          <h2 id="arrival-title">Beri waktu untuk beradaptasi.</h2>
          <p>
            Mulai dengan mengamati kondisinya. Sesuaikan perawatan dengan jenis
            tanaman dan lingkungan barunya.
          </p>
          <Mascot file="maskot_tree.webp" />
        </div>
        <ol className="care-numbered">
          {[
            [
              "Kenali tanaman",
              "Catat nama atau jenisnya, kebutuhan cahaya, serta instruksi dari penjual. Jangan menyamakan perawatan semua tanaman.",
            ],
            [
              "Periksa kondisi awal",
              "Lihat daun, batang, media, dan lubang pot. Dokumentasikan kondisi saat datang dan cek tanda hama sebelum digabungkan dengan koleksi lain.",
            ],
            [
              "Pilih tempat yang sesuai",
              "Tempatkan di lokasi dengan cahaya yang tepat. Bila akan dipindah ke tempat lebih terik, lakukan bertahap.",
            ],
            [
              "Amati sebelum bertindak",
              "Cek media sebelum menyiram. Tanaman yang sehat tidak harus langsung diganti pot, dipangkas, atau diberi pupuk saat tiba.",
            ],
          ].map(([title, text], index) => (
            <li key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section
        className="care-section"
        id="dasar"
        aria-labelledby="basics-title"
      >
        <span className="shop-eyebrow">DASAR PERAWATAN</span>
        <h2 id="basics-title">Enam hal yang membuat perbedaan.</h2>
        <p className="care-intro">
          Mulai dari kebutuhan tanaman, lalu sesuaikan dengan cahaya, cuaca,
          pot, dan media yang Anda gunakan.
        </p>
        <div className="care-basics">
          {basics.map(([number, title, subtitle, paragraphs]) => (
            <article key={number}>
              <span className="care-index">
                {number} / {title}
              </span>
              <h3>{subtitle}</h3>
              {paragraphs.map((text) => (
                <p key={text}>{text}</p>
              ))}
            </article>
          ))}
        </div>
      </section>

      <section
        className="care-section"
        id="cahaya"
        aria-labelledby="light-title"
      >
        <span className="shop-eyebrow">CAHAYA & PENEMPATAN</span>
        <h2 id="light-title">
          Pilih tempat tumbuh, bukan hanya tempat pajang.
        </h2>
        <div className="care-light-grid">
          {[
            [
              Sun,
              "Sinar langsung",
              "Sinar mengenai daun secara langsung dan menghasilkan bayangan tegas. Cocok untuk tanaman penyuka matahari; sesuaikan intensitas dan lakukan adaptasi bertahap.",
            ],
            [
              Leaf,
              "Terang tidak langsung",
              "Tempat terang dengan sinar yang tersaring atau tidak langsung mengenai daun. Banyak tanaman hias daun tumbuh baik di kondisi ini.",
            ],
            [
              Droplets,
              "Cahaya terbatas",
              "Area jauh dari jendela atau terhalang bangunan. Periksa kecocokan jenis tanaman; toleran teduh tetap membutuhkan cahaya untuk tumbuh.",
            ],
          ].map(([Icon, title, text]) => {
            const Symbol = Icon as typeof Sun;
            return (
              <article key={title as string}>
                <Symbol size={25} />
                <h3>{title as string}</h3>
                <p>{text as string}</p>
              </article>
            );
          })}
        </div>
        <p className="care-note">
          Amati cahaya pada pagi, siang, dan sore. Di rumah Indonesia, hujan,
          naungan, dan arah bangunan dapat mengubah kondisi; jangan menyalin
          jadwal musiman dari iklim lain secara langsung.
        </p>
      </section>

      <section
        className="care-section care-split"
        id="repotting"
        aria-labelledby="repot-title"
      >
        <div>
          <span className="shop-eyebrow">MEDIA & GANTI POT</span>
          <h2 id="repot-title">Ruang baru saat akar membutuhkannya.</h2>
          <p>
            Periksa bila akar memenuhi pot, air sulit meresap, atau media
            menjadi padat. Pilih pot sedikit lebih besar dengan lubang drainase;
            pot terlalu besar dapat membuat media lama basah.
          </p>
          <p>
            Sesudah repotting, pantau tanaman dan penyiramannya. Jangan langsung
            menggabungkan ganti pot dengan pemangkasan besar dan perubahan
            lokasi drastis.
          </p>
        </div>
        <ol className="care-numbered">
          {[
            [
              "Siapkan pot dan media",
              "Gunakan pot bersih serta media yang sesuai jenis tanaman.",
            ],
            [
              "Keluarkan tanaman perlahan",
              "Sangga pangkal tanaman dan akar. Hindari menariknya dari daun atau batang yang rapuh.",
            ],
            [
              "Periksa akar",
              "Akar yang rusak, lunak, atau berbau perlu diperiksa lebih lanjut. Gunakan alat bersih jika bagian mati perlu dipotong.",
            ],
            [
              "Tanam pada kedalaman semula",
              "Isi celah dengan media tanpa memadatkannya berlebihan atau menimbun pangkal batang.",
            ],
            [
              "Sesuaikan penyiraman",
              "Untuk banyak tanaman daun, basahi media lalu tiriskan. Sukulen dan tanaman khusus dapat memerlukan penanganan berbeda.",
            ],
          ].map(([title, text], index) => (
            <li key={title}>
              <span>{index + 1}</span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section
        className="care-section care-routine"
        id="rutinitas"
        aria-labelledby="routine-title"
      >
        <div>
          <span className="shop-eyebrow">RUTINITAS MINGGUAN</span>
          <h2 id="routine-title">
            Lima menit untuk memeriksa, bukan selalu menyiram.
          </h2>
          <p>
            Tandai pemeriksaan yang sudah Anda lakukan. Checklist ini membantu
            mengingat rutinitas dan akan kembali kosong saat halaman dimuat
            ulang.
          </p>
          <p className="care-progress" aria-live="polite">
            {checked.length} dari {checklist.length} pemeriksaan selesai
          </p>
          <button
            type="button"
            className="care-reset"
            onClick={() => setChecked([])}
          >
            Bersihkan checklist
          </button>
        </div>
        <div className="care-checklist">
          {checklist.map((text, index) => (
            <label key={text}>
              <input
                type="checkbox"
                checked={checked.includes(index)}
                onChange={(event) =>
                  setChecked((previous) =>
                    event.target.checked
                      ? [...previous, index]
                      : previous.filter((item) => item !== index),
                  )
                }
              />
              <span>{text}</span>
            </label>
          ))}
        </div>
      </section>

      <section
        className="care-section"
        id="masalah"
        aria-labelledby="problems-title"
      >
        <div className="care-problems-heading">
          <div>
            <span className="shop-eyebrow">BACA TANDA-TANDANYA</span>
            <h2 id="problems-title">
              Satu gejala bisa punya beberapa penyebab.
            </h2>
            <p>
              Mulai dari pemeriksaan sederhana. Tabel ini memberi arah
              pemeriksaan awal, bukan diagnosis pasti.
            </p>
          </div>
          <Mascot file="maskot_one.webp" />
        </div>
        <div
          className="care-table-wrap"
          tabIndex={0}
          role="region"
          aria-label="Tabel gejala dan pemeriksaan tanaman"
        >
          <table>
            <thead>
              <tr>
                <th scope="col">Gejala</th>
                <th scope="col">Kemungkinan penyebab</th>
                <th scope="col">Langkah pertama</th>
              </tr>
            </thead>
            <tbody>
              {problems.map(([symptom, cause, action]) => (
                <tr key={symptom}>
                  <th scope="row">{symptom}</th>
                  <td>{cause}</td>
                  <td>{action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="care-note">
          Jika kerusakan cepat meluas atau kondisi terus menurun, dokumentasikan
          gejalanya dan konsultasikan sebelum mencoba beberapa penanganan
          sekaligus.
        </p>
      </section>

      <section
        className="care-section care-faq"
        id="faq"
        aria-labelledby="faq-title"
      >
        <div>
          <span className="shop-eyebrow">PERTANYAAN UMUM</span>
          <h2 id="faq-title">Jawaban untuk kebiasaan sehari-hari.</h2>
        </div>
        <div>
          {questions.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="care-consult" aria-labelledby="consult-title">
        <Mascot file="maskot_five.webp" />
        <div>
          <span className="shop-eyebrow">KAMI SIAP MEMBANTU</span>
          <h2 id="consult-title">Ceritakan tanaman dan kondisi ruang Anda.</h2>
          <p>
            Kirim foto tanaman, lokasi penempatan, kondisi media, dan kebiasaan
            menyiram. Informasi ini membantu tim memberi arahan awal yang lebih
            sesuai.
          </p>
          <a
            className="shop-button"
            href={whatsapp}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={18} /> Konsultasi via WhatsApp
          </a>
        </div>
      </section>
      <footer className="care-sources">
        <p>
          Panduan umum; kebutuhan spesifik mengikuti jenis tanaman dan kondisi
          tempat tumbuhnya. Rujukan bacaan:
        </p>
        <a
          href="https://www.rhs.org.uk/plants/types/houseplants/growing-guide"
          target="_blank"
          rel="noreferrer"
        >
          RHS · Perawatan tanaman indoor
        </a>
        <a
          href="https://www.rhs.org.uk/plants/types/houseplants/how-to-help-a-poorly-houseplant"
          target="_blank"
          rel="noreferrer"
        >
          RHS · Menelusuri masalah tanaman
        </a>
        <a
          href="https://extension.umd.edu/resource/watering-indoor-plants"
          target="_blank"
          rel="noreferrer"
        >
          UMD Extension · Penyiraman
        </a>
        <a
          href="https://extension.umd.edu/resource/potting-and-repotting-indoor-plants"
          target="_blank"
          rel="noreferrer"
        >
          UMD Extension · Media & repotting
        </a>
      </footer>
    </div>
  );
}
