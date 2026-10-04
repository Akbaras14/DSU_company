"use client";
import { ModalNotice } from "@/components/notification-provider";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  ClipboardCheck,
  ImageOff,
  Leaf,
  MapPin,
  MessageCircle,
  Search,
  ShoppingBag,
  Sprout,
} from "lucide-react";
import { useNotification } from "@/components/notification-provider";
import { rupiah } from "@/lib/format";
import {
  COMPANY_ADDRESS,
  COMPANY_MAP_URL,
  COMPANY_MAP_EMBED_URL,
} from "@/lib/company";
import { useShop } from "./provider";
import type { ShopProduct } from "./service";
import Carousel from "@/components/react-bits/Carousel";
import ScrollVelocity from "@/components/react-bits/ScrollVelocity";
import { DSUMascot, MascotHeading } from "@/components/dsu-mascot";
const heroImages = [
  {
    src: "/images/maskot/hero/hero_one.webp",
    alt: "Maskot DSU membawa tanaman di tempat pembibitan yang hijau",
    name: "Delta Sinergi Utama",
  },
  {
    src: "/images/maskot/hero/hero_two.webp",
    alt: "Daun Monstera di tempat pembibitan",
    name: "Monstera",
  },
  {
    src: "/images/maskot/hero/hero_tree.webp",
    alt: "Philodendron di tempat pembibitan",
    name: "Philodendron",
  },
] as const;
export function ProductPhoto({
  name,
  src,
  large = false,
}: {
  name: string;
  src?: string | null;
  large?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`shop-photo ${large ? "large" : ""}`}>
      {src && !failed ? (
        <Image
          src={src}
          alt={name}
          fill
          sizes={
            large
              ? "(max-width: 700px) 100vw, 50vw"
              : "(max-width: 700px) 50vw, 25vw"
          }
          onError={() => setFailed(true)}
        />
      ) : (
        <>
          <ImageOff size={large ? 42 : 30} strokeWidth={1} />
          <span>Foto belum tersedia</span>
        </>
      )}
    </div>
  );
}
export function ProductCard({ product }: { product: ShopProduct }) {
  const { notify } = useNotification();
  const { add, user } = useShop();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function addItem() {
    if (!user) {
      router.push(`/login?next=/katalog/${encodeURIComponent(product.id)}`);
      return;
    }
    if (pending) return;
    setPending(true);
    try {
      await add(product.id, 1);
      notify({
        kind: "success",
        title: "Tanaman ditambahkan",
        message: `${product.name} ditambahkan ke keranjang.`,
      });
    } catch (e) {
      notify({
        kind: "error",
        message: e instanceof Error ? e.message : "Gagal menambah tanaman.",
      });
    } finally {
      setPending(false);
    }
  }
  return (
    <motion.article className="shop-product">
      <Link href={`/katalog/${product.id}`} className="shop-product-image">
        <ProductPhoto name={product.name} src={product.imageUrl} />
        <span className="shop-stock">
          {product.available ? "Siap jual" : "Stok habis"}
        </span>
      </Link>
      <div className="shop-product-info">
        <p className="shop-category">{product.category}</p>
        <Link href={`/katalog/${product.id}`}>
          <h3>{product.name}</h3>
        </Link>
        <p className="shop-availability">
          {product.available} tanaman tersedia
        </p>
        <div className="shop-product-bottom">
          <strong>{rupiah(product.price)}</strong>
          <button
            onClick={addItem}
            className="shop-add"
            disabled={pending || !product.available}
            aria-label={`Tambah ${product.name} ke keranjang`}
          >
            <ArrowUpRight size={21} />
          </button>
        </div>
      </div>
    </motion.article>
  );
}
function StorefrontHero({ catalog = false }: { catalog?: boolean }) {
  return (
    <section
      className="shop-hero shop-hero-reference"
      aria-labelledby="hero-title"
    >
      <div className="shop-hero-content">
        <Image
          className="shop-hero-logo"
          src="/images/logo/dsu_logo.svg"
          alt="CV. Delta Sinergi Utama"
          width={1798}
          height={875}
          unoptimized
        />
        <span className="shop-eyebrow">TUMBUH · LESTARI · BERSAMA</span>
        <h1 id="hero-title">
          {catalog ? "Pilihan Tanaman" : "Solusi Tanaman"}
          <br />
          <span>{catalog ? "untuk Ruang Anda" : "untuk Masa Depan"}</span>
        </h1>
        <p>
          {catalog
            ? "Temukan tanaman yang cocok untuk rumah, taman, atau ruang kerja Anda. Pilih dari katalog di bawah, lihat harga dan stoknya, lalu tambahkan tanaman pilihan Anda ke keranjang untuk mulai memesan."
            : "CV. Delta Sinergi Utama menyediakan berbagai tanaman untuk memperindah lingkungan dan mendukung gaya hidup yang lebih hijau."}
        </p>
        {!catalog && (
          <div className="shop-hero-actions">
            <Link className="shop-button" href="/katalog">
              <Sprout size={20} aria-hidden="true" />
              Lihat koleksi tanaman
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link className="shop-button secondary" href="#tentang">
              <Leaf size={20} aria-hidden="true" /> Tentang kami
            </Link>
          </div>
        )}
        <div className="shop-hero-assurance">
          <div>
            <Sprout size={22} aria-hidden="true" />
            <span>
              Pilihan
              <br />
              tanaman beragam
            </span>
          </div>
          <div>
            <ClipboardCheck size={22} aria-hidden="true" />
            <span>
              Pemesanan
              <br />
              terkoordinasi
            </span>
          </div>
          <div>
            <Leaf size={22} aria-hidden="true" />
            <span>
              Panduan
              <br />
              perawatan tanaman
            </span>
          </div>
        </div>
      </div>
      <Carousel
        className="shop-hero-visual"
        slideClassName="shop-hero-bg"
        items={heroImages}
        autoplay
        autoplayDelay={3000}
        loop
        duration={1.2}
        renderItem={(image, index) => (
          <Image
            src={image.src}
            alt={image.alt}
            fill
            loading="eager"
            fetchPriority={index === 0 ? "high" : "auto"}
            sizes="100vw"
          />
        )}
      />
    </section>
  );
}
export function HomeContent() {
  const { state, settings } = useShop();
  const whatsapp = `https://wa.me/${settings?.whatsappNumber || "6285893802972"}`;
  const products = state.products;
  return (
    <>
      <StorefrontHero />
      <section className="shop-company-about" aria-labelledby="about-title">
        <motion.div
          className="shop-company-intro"
          id="tentang"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.4 }}
        >
          <div>
            <span className="shop-eyebrow">TENTANG KAMI</span>
            <h2 id="about-title">
              Tanaman yang tepat, mulai dari tempat pembibitan.
            </h2>
          </div>
          <Image
            className="shop-company-mascot"
            src="/images/maskot/maskot_two.webp"
            alt="Maskot DSU tersenyum"
            width={1024}
            height={1536}
            unoptimized
          />
          <div>
            <p>
              CV. Delta Sinergi Utama menyediakan pilihan tanaman untuk rumah,
              taman, dan ruang kerja. Kami membantu pelanggan menemukan tanaman
              yang selaras dengan kondisi ruang dan rutinitas perawatannya.
            </p>
            <p>
              Dari memilih tanaman hingga mengatur pengambilan, setiap pesanan
              didampingi melalui komunikasi yang jelas dan mudah diikuti.
            </p>
          </div>
        </motion.div>
        <div
          className="shop-company-services"
          id="layanan"
          aria-labelledby="nilai-kami"
        >
          <span className="shop-eyebrow">CARA KAMI MELAYANI</span>
          <h2 id="nilai-kami">
            Pilihan yang lebih mudah, perawatan yang lebih yakin.
          </h2>
          <div className="shop-service-layout">
            <div className="shop-service-mascot">
              <Image
                src="/images/maskot/maskot_one.webp"
                alt="Maskot Delta Sinergi Utama"
                fill
                sizes="(max-width: 767px) 200px, 260px"
              />
            </div>
            <div className="shop-service-grid">
              {[
                [
                  Sprout,
                  "Tanaman sesuai kebutuhan",
                  "Kami membantu Anda mempertimbangkan cahaya, ruang, dan waktu perawatan sebelum menentukan pilihan.",
                ],
                [
                  ClipboardCheck,
                  "Informasi yang jelas",
                  "Ketersediaan tanaman, proses pemesanan, dan pengambilan disampaikan secara transparan melalui akun dan WhatsApp.",
                ],
                [
                  MessageCircle,
                  "Dukungan setelah memilih",
                  "Butuh arahan awal merawat tanaman? Tim kami siap membantu Anda memulai dengan langkah yang sederhana.",
                ],
              ].map(([Icon, title, text], index) => {
                const ServiceIcon = Icon as typeof Sprout;
                return (
                  <motion.article
                    key={title as string}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.25 }}
                    transition={{ duration: 0.35, delay: index * 0.08 }}
                  >
                    <ServiceIcon size={27} />
                    <h3>{title as string}</h3>
                    <p>{text as string}</p>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </div>
        <section className="shop-benefits" aria-labelledby="benefits-title">
          <h2 id="benefits-title">Mengapa memilih Delta Sinergi Utama?</h2>
          <div className="shop-benefits-layout">
            <figure className="shop-benefits-plant">
              <Image
                src="/images/maskot/maskot_tree.webp"
                alt="Tanaman Monstera dalam pot"
                width={1024}
                height={1536}
                sizes="(max-width: 767px) 180px, 230px"
              />
            </figure>
            <div className="shop-benefits-grid">
              {[
                [
                  "Katalog terkurasi",
                  "Pilihan tanaman dari tempat pembibitan.",
                ],
                ["Pemesanan mudah", "Koordinasi langsung melalui WhatsApp."],
                [
                  "Pengambilan terjadwal",
                  "Jadwal pengambilan disepakati bersama admin.",
                ],
                [
                  "Status pesanan jelas",
                  "Pantau proses pesanan melalui akun Anda.",
                ],
              ].map(([title, text]) => (
                <article key={title}>
                  <ClipboardCheck size={25} aria-hidden="true" />
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
          <Link className="shop-text-link" href="/plant-care">
            Pelajari perawatan tanaman{" "}
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </section>
        <section
          className="shop-company-location"
          aria-labelledby="company-location-title"
        >
          <div>
            <span className="shop-eyebrow">TEMUI KAMI</span>
            <h2 id="company-location-title">Alamat perusahaan</h2>
            <address>{COMPANY_ADDRESS}</address>
            <p>Hubungi kami melalui WhatsApp sebelum berkunjung.</p>
            <a
              className="shop-text-link"
              href={COMPANY_MAP_URL}
              target="_blank"
              rel="noreferrer"
            >
              Buka Google Maps <ArrowUpRight size={18} aria-hidden="true" />
            </a>
            <a
              className="shop-location-contact"
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={18} aria-hidden="true" /> Hubungi via
              WhatsApp
            </a>
          </div>
          <iframe
            title="Peta pencarian alamat CV. Delta Sinergi Utama di Griya Pamulang 2"
            src={COMPANY_MAP_EMBED_URL}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </section>
      </section>
      <section className="shop-banner shop-banner-wide">
        <div className="shop-banner-photo">
          <Image
            src="/images/maskot/panduan/panduan_one.webp"
            alt="Kebun hijau dengan beragam tanaman"
            fill
            sizes="(max-width: 1172px) 100vw, 1160px"
          />
        </div>
        <div className="shop-banner-overlay" />
        <div className="shop-banner-content">
          <h2>Panduan merawat tanaman untuk ruang yang lebih asri.</h2>
          <p>
            Mulai dari kebutuhan cahaya sampai kebiasaan menyiram yang tepat.
          </p>
          <Link className="shop-button" href="/plant-care">
            Baca panduan perawatan <ArrowRight size={18} />
          </Link>
        </div>
      </section>
      <section className="shop-featured">
        <h2>Tanaman pilihan</h2>
        <p>Beberapa tanaman yang tersedia di katalog kami.</p>
        <div className="shop-featured-layout">
          <div className="shop-featured-mascot">
            <Image
              src="/images/maskot/maskot_four.webp"
              alt="Maskot Delta Sinergi Utama dengan tanaman pilihan"
              fill
              sizes="(max-width: 767px) 200px, 260px"
            />
          </div>
          <div className="shop-featured-catalog">
            {products.length ? (
              <ScrollVelocity
                items={products}
                renderItem={(product) => <ProductCard product={product} />}
              />
            ) : (
              <div className="shop-empty">Koleksi sedang disiapkan.</div>
            )}
          </div>
        </div>
      </section>
      <section className="shop-ordering" aria-labelledby="ordering-title">
        <div>
          <span className="shop-eyebrow">CARA PEMESANAN</span>
          <h2 id="ordering-title">Dari pilihan Anda ke tempat yang baru.</h2>
          <p>
            Pilih tanaman, buat pesanan, lalu konfirmasikan detailnya bersama
            kami.
          </p>
        </div>
        <ol>
          {[
            [
              "Pilih tanaman",
              "Lihat harga dan stok di katalog. Masuk ke akun untuk menyimpan tanaman ke keranjang.",
            ],
            [
              "Buat pesanan",
              "Lengkapi data kontak dan pilih pengambilan atau pengiriman pada checkout.",
            ],
            [
              "Konfirmasi melalui WhatsApp",
              "Sepakati pembayaran, jadwal, dan detail pengambilan atau pengiriman bersama admin.",
            ],
          ].map(([title, text], index) => (
            <li key={title}>
              <span aria-hidden="true">{index + 1}</span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="shop-ordering-mascot">
          <Image
            src="/images/maskot/maskot_five.webp"
            alt="Maskot Delta Sinergi Utama untuk panduan pemesanan"
            fill
            unoptimized
            sizes="(max-width: 1050px) 200px, 260px"
          />
        </div>
      </section>
      <p className="shop-photo-credit">
        Foto: Raul654 (Monstera) &amp; Haneesh K M (Tabebuya) / Wikimedia
        Commons,{" "}
        <a
          href="https://creativecommons.org/licenses/by-sa/4.0/"
          target="_blank"
          rel="noreferrer"
        >
          CC BY-SA
        </a>
        . Ilustrasi, bukan foto stok aktual.
      </p>
    </>
  );
}
export { PlantCareContent } from "./plant-care";
export function CatalogContent() {
  const { state } = useShop();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const products = state.products
    .filter(
      (p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) &&
        (!category || p.category === category),
    )
    .sort((a, b) =>
      sort === "low"
        ? a.price - b.price
        : sort === "high"
          ? b.price - a.price
          : a.name.localeCompare(b.name),
    );
  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(products.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const pageProducts = products.slice(start, start + pageSize);
  function changePage(next: number) {
    setPage(next);
    document
      .getElementById("koleksi")
      ?.scrollIntoView({ behavior: "instant", block: "start" });
  }
  return (
    <>
      <StorefrontHero catalog />
      <section className="shop-section shop-catalog-section" id="koleksi">
        <div className="shop-section-heading shop-catalog-heading">
          <div className="shop-catalog-mascot">
            <Image
              src="/images/maskot/maskot_four.webp"
              alt="Maskot Delta Sinergi Utama"
              fill
              unoptimized
              sizes="(max-width: 767px) 96px, 140px"
            />
          </div>
          <div>
            <h2>Katalog tanaman</h2>
            <p>Setiap ruang punya tanaman yang tepat.</p>
          </div>
        </div>
        <div className="shop-catalog-tools">
          <label className="shop-search">
            <Search size={18} />
            <span className="sr-only">Cari tanaman</span>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Cari nama tanaman..."
            />
          </label>
          <label>
            <span className="sr-only">Urutkan tanaman</span>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
            >
              <option value="name">Nama A-Z</option>
              <option value="low">Harga terendah</option>
              <option value="high">Harga tertinggi</option>
            </select>
          </label>
        </div>
        <div className="shop-categories">
          <button
            aria-pressed={!category}
            onClick={() => {
              setCategory("");
              setPage(1);
            }}
          >
            Semua tanaman
          </button>
          {[...new Set(state.products.map((p) => p.category))].map((item) => (
            <button
              key={item}
              aria-pressed={category === item}
              onClick={() => {
                setCategory(item);
                setPage(1);
              }}
            >
              {item}
            </button>
          ))}
        </div>
        <p className="shop-results" aria-live="polite">
          {products.length
            ? `${start + 1}–${Math.min(start + pageSize, products.length)} dari ${products.length} tanaman`
            : "0 tanaman ditemukan"}
        </p>
        {products.length ? (
          <div className="shop-products">
            {pageProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="shop-empty">
            <Search size={32} />
            <h2>Belum ada tanaman ditemukan</h2>
            <p>
              {state.products.length
                ? "Coba nama atau kategori lain."
                : "Koleksi sedang disiapkan. Hubungi tempat pembibitan untuk informasi ketersediaan."}
            </p>
          </div>
        )}
        {pageCount > 1 && (
          <nav className="shop-pagination" aria-label="Halaman katalog tanaman">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => changePage(currentPage - 1)}
            >
              Sebelumnya
            </button>
            {Array.from({ length: pageCount }, (_, index) => index + 1)
              .filter(
                (number) =>
                  number === 1 ||
                  number === pageCount ||
                  Math.abs(number - currentPage) <= 1,
              )
              .map((number, index, numbers) => (
                <span className="shop-pagination-item" key={number}>
                  {index > 0 && number - numbers[index - 1] > 1 && (
                    <span aria-hidden="true">…</span>
                  )}
                  <button
                    type="button"
                    aria-label={`Halaman ${number}`}
                    aria-current={currentPage === number ? "page" : undefined}
                    onClick={() => changePage(number)}
                  >
                    {number}
                  </button>
                </span>
              ))}
            <button
              type="button"
              disabled={currentPage === pageCount}
              onClick={() => changePage(currentPage + 1)}
            >
              Berikutnya
            </button>
          </nav>
        )}
      </section>
    </>
  );
}
export function DetailContent({ id }: { id: string }) {
  const { state, add, user } = useShop();
  const router = useRouter();
  const product = state.products.find((p) => p.id === id);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [added, setAdded] = useState(false);
  if (!product)
    return (
      <section className="shop-empty">
        <DSUMascot file="maskot_tree.webp" />
        <h1>Tanaman tidak ditemukan</h1>
        <p>Produk mungkin belum dipublikasikan.</p>
        <Link className="shop-button" href="/katalog">
          Kembali ke katalog
        </Link>
      </section>
    );
  async function submit() {
    if (!product || pending) return;
    if (!user) {
      router.push(`/login?next=/katalog/${id}`);
      return;
    }
    setPending(true);
    setError("");
    setAdded(false);
    try {
      await add(product.id, quantity);
      setAdded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menambah tanaman.");
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="shop-section">
      <div className="shop-breadcrumb">
        <Link href="/katalog">Tanaman</Link>
        <span>/</span>
        {product.name}
      </div>
      <div className="shop-detail">
        <ProductPhoto name={product.name} src={product.imageUrl} large />
        <div className="shop-detail-info">
          <MascotHeading file="maskot_tree.webp" compact>
            <span className="shop-eyebrow">{product.category}</span>
            <h1>{product.name}</h1>
          </MascotHeading>
          <p className="shop-detail-price">
            {rupiah(product.price)} <small>/ tanaman</small>
          </p>
          <span className="shop-available">
            {product.available} tanaman tersedia
          </span>
          <p className="shop-description">{product.description}</p>
          <label className="shop-field">
            Jumlah tanaman
            <input
              type="number"
              min={1}
              max={Math.max(1, product.available)}
              step={1}
              value={quantity}
              onChange={(e) => {
                setQuantity(Number(e.target.value));
                setAdded(false);
              }}
            />
          </label>
          <button
            className="shop-button"
            disabled={pending || !product.available}
            onClick={submit}
          >
            <ShoppingBag size={18} />
            {pending ? "Menyimpan..." : "Tambah ke keranjang"}
          </button>
          {error && <ModalNotice message={error} />}
          {added && (
            <ModalNotice
              kind="success"
              title="Tanaman ditambahkan"
              message="Tanaman ditambahkan ke keranjang. Anda dapat melanjutkan belanja atau melihat keranjang."
            />
          )}
          <div className="shop-pickup-note">
            <MapPin size={21} />
            <div>
              <strong>Pengambilan di tempat pembibitan</strong>
              <p>
                Konfirmasikan pesanan dan jadwal bersama admin melalui WhatsApp.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
