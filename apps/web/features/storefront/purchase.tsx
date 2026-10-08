"use client";
import {
  ModalNotice,
  useNotification,
} from "@/components/notification-provider";
import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { DSUMascot, MascotHeading } from "@/components/dsu-mascot";
import { DSUModal } from "@/components/dsu-modal";
import {
  ArrowRight,
  Clock3,
  MapPin,
  MessageCircle,
  Trash2,
  Truck,
  Search,
  RefreshCw,
  Store,
  ClipboardList,
  WalletCards,
  Package,
  PackageCheck,
  CircleCheck,
  CircleX,
  FileText,
  UserRound,
  ChevronUp,
  type LucideIcon,
} from "lucide-react";
import {
  orderLabels,
  type CheckoutContact,
  type CustomerContact,
  type FulfillmentMethod,
  type OrderStatus,
} from "@dsu/contracts";
import { rupiah, localDateTime } from "@/lib/format";
import { useShop } from "./provider";
import { ApiError, contactErrors, type ShopOrder } from "./service";
import { ProductPhoto } from "./catalog";
import {
  DeliveryAddressFields,
  useAddressLocations,
  type LocationOption,
} from "./delivery-address";
import "./orders.css";
import "./checkout.css";
import { CustomerPayment } from "./payment";
const orderTabIcons: Record<string, LucideIcon> = {
  all: ClipboardList,
  confirmation: Clock3,
  payment: WalletCards,
  processing: Package,
  ready: PackageCheck,
  completed: CircleCheck,
  cancelled: CircleX,
};
const orderStatusIcons: Record<OrderStatus, LucideIcon> = {
  WAITING_VERIFICATION: Clock3,
  READY_TO_SHIP: Truck,
  PENDING_CONFIRMATION: Clock3,
  CONFIRMED: CircleCheck,
  PENDING_PAYMENT: WalletCards,
  PAYMENT_REVIEW: Clock3,
  PAYMENT_REJECTED: CircleX,
  PAID: CircleCheck,
  PROCESSING: Package,
  READY_FOR_PICKUP: PackageCheck,
  SHIPPED: Truck,
  COMPLETED: CircleCheck,
  EXPIRED: Clock3,
  CANCELLED: CircleX,
};
function OrderStatusIcon({ status }: { status: OrderStatus }) {
  const Icon = orderStatusIcons[status];
  return <Icon size={16} aria-hidden="true" />;
}
export function EmptyCart() {
  return (
    <section className="shop-empty">
      <DSUMascot file="maskot_four.webp" />
      <h1>Keranjang masih kosong</h1>
      <p>Mulai dengan menemukan tanaman untuk ruang Anda.</p>
      <Link href="/katalog" className="shop-button">
        Jelajahi tanaman <ArrowRight size={18} />
      </Link>
    </section>
  );
}
function OrderSummary({
  checkout = false,
  pending = false,
  fulfillmentMethod,
}: {
  checkout?: boolean;
  pending?: boolean;
  fulfillmentMethod?: FulfillmentMethod;
}) {
  const { state } = useShop();
  const total = state.cart.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  if (checkout)
    return (
      <aside
        className="dsu-checkout-summary"
        aria-labelledby="checkout-summary-title"
      >
        <h2 id="checkout-summary-title">
          <WalletCards size={21} aria-hidden="true" /> Ringkasan pembayaran
        </h2>
        <div className="dsu-checkout-costs">
          <div>
            <span>Subtotal produk</span>
            <strong>{rupiah(total)}</strong>
          </div>
          <div>
            <span>Biaya pengiriman</span>
            <span>
              {fulfillmentMethod === "DELIVERY"
                ? "Dikonfirmasi admin"
                : "Tanpa ongkir"}
            </span>
          </div>
          <div className="dsu-checkout-grand-total">
            <span>Total pesanan</span>
            <strong>{rupiah(total)}</strong>
          </div>
        </div>
        {fulfillmentMethod === "DELIVERY" && (
          <p className="dsu-checkout-shipping-note">
            <Truck size={16} aria-hidden="true" />
            Harga Total belum termasuk ongkir
          </p>
        )}
        <div className="dsu-checkout-place-order">
          <p>
            Pesanan akan direservasi. Lanjutkan konfirmasi dan pembayaran
            melalui WhatsApp bersama admin.
          </p>
          <button
            type="submit"
            form="checkout-form"
            className="shop-button"
            disabled={pending}
          >
            {pending ? "Menyimpan pesanan..." : "Buat pesanan"}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      </aside>
    );
  return (
    <aside className="shop-summary">
      <h2>Ringkasan pesanan</h2>
      {state.cart.map((item) => (
        <div className="shop-summary-line" key={item.productId}>
          <span>
            {item.name}
            <small>
              {item.quantity} × {rupiah(item.unitPrice)}
            </small>
          </span>
          <strong>{rupiah(item.quantity * item.unitPrice)}</strong>
        </div>
      ))}
      <div className="shop-summary-row">
        <span>
          {fulfillmentMethod === "DELIVERY"
            ? "Kirim ke lokasi Anda"
            : fulfillmentMethod === "PICKUP"
              ? "Ambil di tempat pembibitan"
              : "Metode dipilih saat checkout"}
        </span>
        <span>
          {fulfillmentMethod === "DELIVERY"
            ? "Ongkir dikonfirmasi"
            : fulfillmentMethod === "PICKUP"
              ? "Tanpa ongkir"
              : ""}
        </span>
      </div>
      {fulfillmentMethod === "DELIVERY" && (
        <p className="shop-shipping-note">Harga Total belum termasuk ongkir</p>
      )}
      <div className="shop-total">
        <span>Total</span>
        <strong>{rupiah(total)}</strong>
      </div>
      <Link href="/checkout" className="shop-button">
        Lanjutkan pemesanan <ArrowRight size={18} />
      </Link>
      <p className="shop-caption">
        Stok direservasi setelah pemesanan berhasil.
      </p>
    </aside>
  );
}
export function CartContent() {
  const { state, update, remove } = useShop();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  if (!state.cart.length) return <EmptyCart />;
  async function action(id: string, count?: number) {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      if (count === undefined) await remove(id);
      else await update(id, count);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Keranjang belum dapat diperbarui.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="shop-section">
      <div className="shop-breadcrumb">
        <Link href="/katalog">Tanaman</Link>
        <span>/</span>Keranjang
      </div>
      <div className="shop-section-heading">
        <MascotHeading file="maskot_four.webp">
          <span className="shop-eyebrow">PILIHAN ANDA</span>
          <h1>Keranjang tanaman</h1>
          <p>{state.cart.length} jenis tanaman untuk ruang Anda.</p>
        </MascotHeading>
        <Link href="/katalog" className="shop-text-link">
          Lanjut berbelanja <ArrowRight size={17} />
        </Link>
      </div>
      {error && <ModalNotice message={error} />}
      <div className="shop-checkout-grid">
        <div className="shop-cart-list">
          {state.cart.map((item) => (
            <article className="shop-cart-line" key={item.productId}>
              <div className="shop-cart-photo">
                <ProductPhoto name={item.name} src={item.imageUrl} />
              </div>
              <div className="shop-cart-item">
                <Link href={`/katalog/${item.productId}`}>
                  <h2>{item.name}</h2>
                </Link>
                <p>{rupiah(item.unitPrice)} / tanaman</p>
                {item.available !== undefined &&
                  item.quantity > item.available && (
                    <p className="shop-error">
                      Tersedia {item.available} tanaman. Sesuaikan jumlah
                      sebelum pemesanan.
                    </p>
                  )}
                <div className="shop-quantity">
                  <button
                    aria-label={`Kurangi ${item.name}`}
                    disabled={pending || item.quantity <= 1}
                    onClick={() =>
                      void action(item.productId, item.quantity - 1)
                    }
                  >
                    −
                  </button>
                  <span aria-live="polite">{item.quantity}</span>
                  <button
                    aria-label={`Tambah ${item.name}`}
                    disabled={
                      pending ||
                      (item.available !== undefined &&
                        item.quantity >= item.available)
                    }
                    onClick={() =>
                      void action(item.productId, item.quantity + 1)
                    }
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="shop-cart-end">
                <strong>{rupiah(item.unitPrice * item.quantity)}</strong>
                <button
                  disabled={pending}
                  aria-label={`Hapus ${item.name}`}
                  data-destructive="true"
                  onClick={() => void action(item.productId)}
                >
                  <Trash2 size={16} /> Hapus
                </button>
              </div>
            </article>
          ))}
        </div>
        <OrderSummary />
      </div>
    </section>
  );
}
const contactFields = [
  { key: "name", label: "Nama penerima", autoComplete: "name", type: "text" },
  {
    key: "phone",
    label: "Nomor WhatsApp / telepon",
    autoComplete: "tel",
    type: "tel",
  },
  {
    key: "address",
    label: "Alamat kontak",
    autoComplete: "street-address",
    type: "text",
  },
] as const;
export function CheckoutContent() {
  const { state, user, settings, checkout } = useShop();
  const [whatsappOpened, setWhatsappOpened] = useState(false);
  const [contact, setContact] = useState<CustomerContact>({
    name: user?.name || "",
    phone: user?.phone || "",
    address: user?.address || "",
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof CustomerContact, string>>
  >({});
  const [error, setError] = useState("");
  const [validationAttempt, setValidationAttempt] = useState(0);
  const [pending, setPending] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [fulfillmentMethod, setFulfillmentMethod] =
    useState<FulfillmentMethod>("PICKUP");
  const [provinceId, setProvinceId] = useState(user?.provinceId || "");
  const [regencyId, setRegencyId] = useState(user?.regencyId || "");
  const [districtId, setDistrictId] = useState(user?.districtId || "");
  const [villageId, setVillageId] = useState(user?.villageId || "");
  const [locationError, setLocationError] = useState("");
  const [postalCode, setPostalCode] = useState(user?.postalCode || "");
  const [postalCodeError, setPostalCodeError] = useState("");
  const [createdOrder, setCreatedOrder] = useState<ShopOrder | null>(null);
  const deliveryAddress = {
    provinceId,
    regencyId,
    districtId,
    villageId,
    postalCode,
  };
  const locations = useAddressLocations(deliveryAddress);
  const { provinces, regencies, districts, villages } = locations;
  const key = useRef("");
  if (createdOrder)
    return (
      <section className="shop-empty">
        <DSUMascot file="maskot_five.webp" />
        <DSUModal
          open={!whatsappOpened}
          onOpenChange={() => {}}
          dismissible={false}
          confirmHref={createdOrder.whatsappUrl}
          confirmLabel="Konfirmasi pesanan ke WhatsApp"
          onConfirm={() => setWhatsappOpened(true)}
          kind="success"
          title="Pesanan berhasil dibuat"
          description="Pesanan Anda sudah tersimpan. Klik tombol di bawah, lalu kirim pesan di WhatsApp agar admin dapat memprosesnya."
        />
        <h1>Pesanan berhasil dibuat</h1>
        <p>Konfirmasikan pesanan agar admin dapat memprosesnya.</p>
        <div className="shop-hero-actions">
          <a
            className="shop-button"
            href={createdOrder.whatsappUrl}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={18} /> Konfirmasi via WhatsApp
          </a>
          <Link className="shop-button secondary" href="/akun">
            Lihat pesanan saya
          </Link>
        </div>
      </section>
    );
  if (!state.cart.length) return <EmptyCart />;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setValidationAttempt((attempt) => attempt + 1);
    setErrors({});
    setError("");
    setLocationError("");
    setPostalCodeError("");
    const locationComplete = provinceId && regencyId && districtId && villageId;
    if (fulfillmentMethod === "DELIVERY" && !locationComplete) {
      setLocationError(
        "Lengkapi provinsi, kabupaten/kota, kecamatan, dan desa/kelurahan untuk pengiriman.",
      );
      document.getElementById("customer-province")?.focus();
      return;
    }
    setLocationError("");
    if (
      fulfillmentMethod === "DELIVERY" &&
      Object.values(locations).some(
        (location) => location.loading || location.error,
      )
    ) {
      setLocationError(
        "Tunggu data wilayah selesai dimuat. Jika gagal, muat ulang halaman sebelum melanjutkan.",
      );
      return;
    }
    const findName = (options: LocationOption[], id: string) =>
      options.find((option) => option.id === id)?.name;
    if (fulfillmentMethod === "DELIVERY" && !/^\d{5}$/.test(postalCode)) {
      setPostalCodeError("Kode pos harus terdiri dari 5 angka.");
      document.getElementById("customer-postal-code")?.focus();
      return;
    }
    setPostalCodeError("");
    const submittedContact: CheckoutContact = {
      ...contact,
      postalCode: fulfillmentMethod === "DELIVERY" ? postalCode : "",
      address:
        fulfillmentMethod === "PICKUP"
          ? "Ambil di tempat pembibitan"
          : locationComplete
            ? [
                contact.address.trim(),
                findName(villages.options, villageId),
                findName(districts.options, districtId),
                findName(regencies.options, regencyId),
                findName(provinces.options, provinceId),
                "INDONESIA",
              ]
                .filter(Boolean)
                .join(", ")
            : contact.address,
    };
    const validation = contactErrors({
      ...submittedContact,
      address:
        fulfillmentMethod === "DELIVERY"
          ? contact.address
          : submittedContact.address,
    });
    if (
      fulfillmentMethod === "DELIVERY" &&
      `${submittedContact.address}, Kode Pos ${submittedContact.postalCode}`
        .length > 500
    )
      validation.address = "Alamat lengkap dan kode pos maksimal 500 karakter.";
    setErrors(validation);
    if (Object.keys(validation).length) {
      document
        .getElementById(`customer-${Object.keys(validation)[0]}`)
        ?.focus();
      return;
    }
    if (!confirmed) {
      setError(
        "Setujui metode pemenuhan dan konfirmasi WhatsApp sebelum melanjutkan.",
      );
      return;
    }
    if (pending) return;
    setPending(true);
    setError("");
    if (!key.current) key.current = crypto.randomUUID();
    try {
      setCreatedOrder(
        await checkout(submittedContact, fulfillmentMethod, key.current),
      );
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) key.current = "";
      setError(
        e instanceof Error ? e.message : "Pesanan belum berhasil disimpan.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="shop-section dsu-checkout">
      <Link href="/keranjang" className="dsu-checkout-back">
        ← Kembali ke keranjang
      </Link>
      <div className="shop-section-heading">
        <MascotHeading file="maskot_five.webp" compact>
          <span className="shop-eyebrow">CHECKOUT</span>
          <h1>Lengkapi pesanan Anda.</h1>
          <p>
            Periksa alamat, produk, dan metode pemenuhan sebelum membuat
            pesanan.
          </p>
        </MascotHeading>
      </div>
      <div className="shop-checkout-grid">
        <form
          id="checkout-form"
          className="shop-checkout-form"
          onSubmit={submit}
          noValidate
        >
          <section className="shop-form-section dsu-checkout-address">
            <h2>
              <MapPin size={21} aria-hidden="true" />{" "}
              {fulfillmentMethod === "DELIVERY"
                ? "Alamat pengiriman"
                : "Data penerima"}
            </h2>
            <p className="dsu-checkout-section-note">
              Data dari profil Anda terisi otomatis. Anda dapat menyesuaikannya
              untuk pesanan ini.
            </p>
            <div className="dsu-checkout-contact-fields">
              {contactFields
                .filter(
                  (field) =>
                    field.key !== "address" || fulfillmentMethod === "DELIVERY",
                )
                .map((field) => (
                  <label className="shop-field" key={field.key}>
                    {field.label}
                    <input
                      id={`customer-${field.key}`}
                      type={field.type}
                      autoComplete={field.autoComplete}
                      required
                      disabled={pending}
                      value={contact[field.key]}
                      aria-invalid={!!errors[field.key]}
                      aria-describedby={
                        errors[field.key] ? `error-${field.key}` : undefined
                      }
                      onChange={(e) =>
                        setContact({ ...contact, [field.key]: e.target.value })
                      }
                    />
                    {errors[field.key] && (
                      <small className="shop-error" id={`error-${field.key}`}>
                        {errors[field.key]}
                      </small>
                    )}
                  </label>
                ))}
            </div>
            {fulfillmentMethod === "DELIVERY" && (
              <DeliveryAddressFields
                noticeKey={validationAttempt}
                value={deliveryAddress}
                locations={locations}
                disabled={pending}
                error={locationError}
                postalCodeError={postalCodeError}
                onChange={(next) => {
                  setProvinceId(next.provinceId);
                  setRegencyId(next.regencyId);
                  setDistrictId(next.districtId);
                  setVillageId(next.villageId);
                  setPostalCode(next.postalCode);
                  setLocationError("");
                  setPostalCodeError("");
                }}
              />
            )}
          </section>
          <section
            className="shop-form-section dsu-checkout-products"
            aria-labelledby="checkout-products-title"
          >
            <div className="dsu-checkout-product-heading">
              <h2 id="checkout-products-title">
                <Package size={21} aria-hidden="true" /> Produk dipesan
              </h2>
              <span>
                {state.cart.reduce((sum, item) => sum + item.quantity, 0)}{" "}
                tanaman
              </span>
            </div>
            <div className="dsu-checkout-store">
              <Store size={17} aria-hidden="true" />
              <strong>Delta Sinergi Utama</strong>
              <span>Pembibitan tanaman</span>
            </div>
            <div className="dsu-checkout-product-labels" aria-hidden="true">
              <span>Produk</span>
              <span>Harga satuan</span>
              <span>Jumlah</span>
              <span>Subtotal</span>
            </div>
            {state.cart.map((item) => (
              <div className="dsu-checkout-product" key={item.productId}>
                <div className="dsu-checkout-product-name">
                  <ProductPhoto name={item.name} src={item.imageUrl} />
                  <div>
                    <Link href={`/katalog/${item.productId}`}>{item.name}</Link>
                    <small>Tanaman pilihan DSU</small>
                  </div>
                </div>
                <span className="dsu-checkout-unit-price">
                  {rupiah(item.unitPrice)}
                  <small> / tanaman</small>
                </span>
                <span className="dsu-checkout-quantity">
                  <small>Jumlah: </small>
                  {item.quantity}
                </span>
                <strong className="dsu-checkout-product-total">
                  {rupiah(item.quantity * item.unitPrice)}
                </strong>
              </div>
            ))}
          </section>
          <section className="shop-form-section">
            <h2>
              <Truck size={21} aria-hidden="true" /> Pengiriman / pengambilan
            </h2>
            <div className="shop-fulfillment-options">
              <label className="shop-fulfillment-option">
                <input
                  type="radio"
                  name="fulfillmentMethod"
                  value="DELIVERY"
                  checked={fulfillmentMethod === "DELIVERY"}
                  disabled={pending}
                  onChange={() => setFulfillmentMethod("DELIVERY")}
                />
                <Truck size={24} />
                <span>
                  <strong>Kirim ke lokasi Anda</strong>
                  <small>
                    Dikirim ke alamat penerima. Ongkir dan jadwal dikonfirmasi
                    melalui WhatsApp.
                  </small>
                </span>
              </label>
              <label className="shop-fulfillment-option">
                <input
                  type="radio"
                  name="fulfillmentMethod"
                  value="PICKUP"
                  checked={fulfillmentMethod === "PICKUP"}
                  disabled={pending}
                  onChange={() => setFulfillmentMethod("PICKUP")}
                />
                <MapPin size={24} />
                <span>
                  <strong>Ambil di tempat pembibitan</strong>
                  <small>
                    {settings?.pickupAddress ||
                      "Alamat dan jadwal pengambilan dikonfirmasi bersama admin melalui WhatsApp."}
                  </small>
                </span>
              </label>
            </div>
          </section>
          <section className="shop-form-section">
            <h2>
              <MessageCircle size={21} aria-hidden="true" /> Konfirmasi &
              pembayaran
            </h2>
            <div className="shop-option">
              <MessageCircle size={24} />
              <div>
                <strong>0858 9380 2972</strong>
                <p>
                  Pesanan disimpan terlebih dahulu. Kirim detail melalui
                  WhatsApp untuk validasi, instruksi pembayaran, dan jadwal
                  pengiriman atau pengambilan.
                </p>
                <p>
                  Konfirmasikan dalam {settings?.reservationHours ?? 24} jam
                  sebelum reservasi stok berakhir.
                </p>
              </div>
            </div>
          </section>
          <label className="shop-check">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={pending}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            <span>
              Saya menyetujui metode{" "}
              {fulfillmentMethod === "DELIVERY" ? "pengiriman" : "pengambilan"}{" "}
              dan akan mengonfirmasi pesanan melalui WhatsApp.
            </span>
          </label>
          {error && <ModalNotice message={error} />}
          {Object.values(errors).some(Boolean) && (
            <ModalNotice
              key={validationAttempt}
              title="Periksa data penerima"
              message={Object.values(errors).filter(Boolean).join(" ")}
            />
          )}
        </form>
        <OrderSummary
          checkout
          pending={pending}
          fulfillmentMethod={fulfillmentMethod}
        />
      </div>
    </section>
  );
}
export function OrdersContent() {
  const { confirm, notify } = useNotification();
  const { state, user, cancel, refresh } = useShop();
  const [error, setError] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const tabs: { id: string; label: string; statuses: OrderStatus[] }[] = [
    { id: "all", label: "Semua", statuses: [] },
    {
      id: "confirmation",
      label: "Konfirmasi",
      statuses: ["PENDING_CONFIRMATION"],
    },
    {
      id: "payment",
      label: "Pembayaran",
      statuses: [
        "CONFIRMED",
        "PENDING_PAYMENT",
        "PAYMENT_REVIEW",
        "WAITING_VERIFICATION",
        "PAYMENT_REJECTED",
      ],
    },
    { id: "processing", label: "Diproses", statuses: ["PAID", "PROCESSING"] },
    {
      id: "ready",
      label: "Dikirim / siap diambil",
      statuses: ["READY_FOR_PICKUP", "READY_TO_SHIP", "SHIPPED"],
    },
    { id: "completed", label: "Selesai", statuses: ["COMPLETED"] },
    {
      id: "cancelled",
      label: "Dibatalkan",
      statuses: ["CANCELLED", "EXPIRED"],
    },
  ];
  const selected = tabs.find((tab) => tab.id === filter)!;
  const query = search.trim().toLocaleLowerCase("id");
  const orders = state.orders.filter(
    (order) =>
      (filter === "all" || selected.statuses.includes(order.status)) &&
      (!query ||
        order.id.toLowerCase().includes(query) ||
        order.items.some((item) =>
          item.name.toLocaleLowerCase("id").includes(query),
        )),
  );
  async function updateStatus() {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }
  async function cancelOrder(id: string) {
    if (reason.trim().length < 5) {
      setError("Alasan pembatalan minimal 5 karakter.");
      return;
    }
    if (
      !(await confirm({
        title: "Batalkan pesanan?",
        message: "Pesanan akan dibatalkan dan reservasi tanaman dilepaskan.",
        confirmLabel: "Ya, batalkan",
      }))
    )
      return;
    setPending(true);
    setError("");
    try {
      await cancel(id, reason);
      setReason("");
      setActive(null);
      notify({
        kind: "success",
        title: "Pesanan dibatalkan",
        message: "Pesanan Anda berhasil dibatalkan.",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pembatalan gagal.");
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="shop-section dsu-orders">
      <div className="shop-section-heading">
        <MascotHeading file="maskot_five.webp">
          <span className="shop-eyebrow">AKUN ANDA</span>
          <h1>Pesanan saya</h1>
          <p>Halo, {user?.name}. Pantau setiap langkah pesanan Anda.</p>
        </MascotHeading>
        <button
          className="shop-button secondary"
          disabled={refreshing}
          onClick={() => void updateStatus()}
        >
          <RefreshCw size={16} />{" "}
          {refreshing ? "Memperbarui..." : "Perbarui status"}
        </button>
      </div>
      <div className="dsu-orders-account">
        <span>Riwayat pembelian Anda di Delta Sinergi Utama</span>
        <Link href="/profil" className="shop-text-link">
          <UserRound size={16} aria-hidden="true" />
          Ubah profil akun
        </Link>
      </div>
      <nav className="dsu-order-tabs" aria-label="Penyaring status pesanan">
        {tabs.map((tab) => {
          const Icon = orderTabIcons[tab.id];
          const count = state.orders.filter(
            (order) => tab.id === "all" || tab.statuses.includes(order.status),
          ).length;
          return (
            <button
              type="button"
              key={tab.id}
              aria-pressed={filter === tab.id}
              onClick={() => {
                setFilter(tab.id);
                setActive(null);
                setError("");
              }}
            >
              <Icon size={18} aria-hidden="true" />
              {tab.label}
              <span>{count}</span>
            </button>
          );
        })}
      </nav>
      <label className="dsu-order-search">
        <Search size={19} aria-hidden="true" />
        <input
          type="search"
          aria-label="Cari pesanan"
          placeholder="Cari nama tanaman atau nomor pesanan"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      {error && <ModalNotice message={error} />}
      {!orders.length ? (
        <div className="shop-empty">
          <DSUMascot file="maskot_five.webp" />
          <h2>
            {!state.orders.length
              ? "Belum ada pesanan"
              : "Tidak ada pesanan yang sesuai"}
          </h2>
          <p>
            {!state.orders.length
              ? "Tanaman pilihan Anda menunggu di katalog."
              : "Coba status lain atau ubah kata pencarian Anda."}
          </p>
          {!state.orders.length ? (
            <Link href="/katalog" className="shop-button">
              Temukan tanaman
            </Link>
          ) : (
            <button
              className="shop-button secondary"
              onClick={() => {
                setFilter("all");
                setSearch("");
              }}
            >
              Lihat semua pesanan
            </button>
          )}
        </div>
      ) : (
        orders.map((order) => (
          <article className="shop-order" key={order.id}>
            <header>
              <div>
                <strong className="dsu-order-store">
                  <Store size={17} /> Delta Sinergi Utama
                </strong>
                <p>
                  #{order.id.slice(0, 8).toUpperCase()} ·{" "}
                  {localDateTime(order.createdAt)}
                </p>
              </div>
              <span className="shop-order-status" data-status={order.status}>
                <OrderStatusIcon status={order.status} />
                {orderLabels[order.status]}
              </span>
            </header>
            <div className="shop-order-items">
              {order.items.map((item) => (
                <div className="dsu-order-product" key={item.productId}>
                  <ProductPhoto
                    name={item.name}
                    src={
                      item.imageUrl ||
                      state.products.find(
                        (product) => product.id === item.productId,
                      )?.imageUrl
                    }
                  />
                  <div className="dsu-order-product-copy">
                    <strong>{item.name}</strong>
                    <span>Jumlah: {item.quantity}</span>
                  </div>
                  <div className="dsu-order-product-price">
                    <strong>{rupiah(item.unitPrice * item.quantity)}</strong>
                    <span>{rupiah(item.unitPrice)} / tanaman</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="shop-order-footer">
              <div className="dsu-order-summary">
                <span className="dsu-order-method">
                  {order.fulfillmentMethod === "DELIVERY" ? (
                    <Truck size={16} />
                  ) : (
                    <MapPin size={16} />
                  )}
                  {order.fulfillmentMethod === "DELIVERY"
                    ? "Pengiriman ke alamat Anda"
                    : "Ambil di pembibitan"}
                </span>
                <span>
                  Total pesanan{" "}
                  <strong>
                    {rupiah(order.total + (order.shippingCost ?? 0))}
                  </strong>
                </span>
              </div>
              <div className="dsu-order-actions">
                {!["CANCELLED", "EXPIRED", "COMPLETED"].includes(
                  order.status,
                ) && (
                  <a
                    className="shop-button"
                    href={order.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle size={18} />
                    {[
                      "PENDING_CONFIRMATION",
                      "PENDING_PAYMENT",
                      "PAYMENT_REJECTED",
                    ].includes(order.status)
                      ? "Konfirmasi via WhatsApp"
                      : "Hubungi admin"}
                  </a>
                )}
                <button
                  className="shop-text-link"
                  onClick={() => {
                    setActive(active === order.id ? null : order.id);
                    setReason("");
                    setError("");
                  }}
                >
                  {active === order.id ? (
                    <ChevronUp size={16} aria-hidden="true" />
                  ) : (
                    <FileText size={16} aria-hidden="true" />
                  )}
                  {active === order.id ? "Tutup detail" : "Detail pesanan"}
                </button>
              </div>
            </div>
            {[
              "PENDING_CONFIRMATION",
              "PENDING_PAYMENT",
              "PAYMENT_REJECTED",
            ].includes(order.status) && (
              <p className="shop-order-deadline">
                Konfirmasi sebelum {localDateTime(order.expiresAt)}. Membuka
                WhatsApp tidak mengubah status otomatis.
              </p>
            )}
            {active === order.id && (
              <section className="shop-order-detail">
                <CustomerPayment order={order} />
                <p>
                  <strong>Nomor lengkap:</strong> {order.id}
                </p>
                <p>
                  <strong>Penerima:</strong> {order.contact.name} ·{" "}
                  {order.contact.phone}
                </p>
                <p>{order.contact.address}</p>
                <p>
                  <strong>Metode:</strong>{" "}
                  {order.fulfillmentMethod === "DELIVERY"
                    ? "Kirim ke lokasi Anda"
                    : "Ambil di tempat pembibitan"}
                </p>
                <p>
                  <strong>
                    {order.fulfillmentMethod === "DELIVERY"
                      ? "Alamat pengiriman:"
                      : "Lokasi pengambilan:"}
                  </strong>{" "}
                  {order.fulfillmentMethod === "DELIVERY"
                    ? order.contact.address
                    : order.pickupAddress ||
                      "Koordinasikan alamat dan jadwal dengan admin."}
                </p>
                {order.fulfillmentMethod === "DELIVERY" && (
                  <p>
                    <strong>Nomor resi:</strong>{" "}
                    {order.trackingNumber ||
                      "Belum tersedia — pesanan belum dikirim."}
                  </p>
                )}
                <ol className="shop-timeline">
                  {order.events.map((event, index) => (
                    <li key={index}>
                      <strong>{orderLabels[event.status]}</strong>
                      <span>{localDateTime(event.createdAt)}</span>
                      <p>{event.reason}</p>
                    </li>
                  ))}
                </ol>
                {[
                  "PENDING_CONFIRMATION",
                  "PENDING_PAYMENT",
                  "PAYMENT_REJECTED",
                ].includes(order.status) && (
                  <div className="shop-cancel">
                    <label className="shop-field">
                      Alasan pembatalan
                      <input
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        minLength={5}
                        maxLength={500}
                        disabled={pending}
                      />
                    </label>
                    <button
                      className="shop-button secondary"
                      disabled={pending}
                      onClick={() => void cancelOrder(order.id)}
                    >
                      <CircleX size={16} aria-hidden="true" />
                      Batalkan pesanan
                    </button>
                  </div>
                )}
              </section>
            )}
          </article>
        ))
      )}
    </section>
  );
}
