"use client";
import { ModalNotice } from "@/components/notification-provider";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { DSUMascot } from "@/components/dsu-mascot";
import type { CustomerProfileContact } from "@dsu/contracts";
import { useShop } from "./provider";
import { contactErrors } from "./service";
import { DeliveryAddressFields, useAddressLocations } from "./delivery-address";

export function ProfileContent() {
  const { user, saveProfile } = useShop();
  const [contact, setContact] = useState<CustomerProfileContact>({
    name: user?.name || "",
    phone: user?.phone || "",
    address: user?.address || "",
    provinceId: user?.provinceId || "",
    regencyId: user?.regencyId || "",
    districtId: user?.districtId || "",
    villageId: user?.villageId || "",
    postalCode: user?.postalCode || "",
  });
  const locations = useAddressLocations(contact);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [validationAttempt, setValidationAttempt] = useState(0);
  function change(key: keyof CustomerProfileContact, value: string) {
    setContact((previous) => ({ ...previous, [key]: value }));
    setMessage("");
    setError("");
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setValidationAttempt((attempt) => attempt + 1);
    const input = {
      ...contact,
      name: contact.name.trim(),
      phone: contact.phone.trim(),
      address: contact.address.trim(),
    };
    const validation = contactErrors(input);
    if (Object.keys(validation).length) {
      setError(Object.values(validation)[0] || "Periksa data Anda.");
      return;
    }
    if (
      !input.provinceId ||
      !input.regencyId ||
      !input.districtId ||
      !input.villageId ||
      !/^\d{5}$/.test(input.postalCode)
    ) {
      setError(
        "Lengkapi provinsi, kabupaten/kota, kecamatan, desa/kelurahan, dan kode pos 5 angka.",
      );
      return;
    }
    setPending(true);
    setError("");
    setMessage("");
    try {
      await saveProfile(input);
      setContact(input);
      setMessage("Profil berhasil diperbarui.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Profil belum dapat disimpan.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section
      className="shop-section shop-profile-page"
      aria-labelledby="profile-title"
    >
      <span className="shop-eyebrow">AKUN PELANGGAN</span>
      <h1 id="profile-title">Ubah profil</h1>
      <p className="shop-profile-intro">
        Lengkapi data diri dan kontak Anda agar koordinasi pesanan lebih mudah.
      </p>
      <div className="shop-profile-layout">
        <form className="shop-profile-form" onSubmit={submit}>
          <label className="shop-field">
            Nama lengkap
            <input
              autoComplete="name"
              required
              minLength={2}
              maxLength={100}
              value={contact.name}
              disabled={pending}
              onChange={(event) => change("name", event.target.value)}
            />
          </label>
          <label className="shop-field">
            Alamat surel
            <input
              type="email"
              autoComplete="email"
              value={user?.email || ""}
              readOnly
              aria-describedby="profile-email-help"
            />
            <small id="profile-email-help">
              Surel digunakan untuk masuk dan tidak dapat diubah di halaman ini.
            </small>
          </label>
          <label className="shop-field">
            Nomor WhatsApp
            <input
              type="tel"
              autoComplete="tel"
              required
              maxLength={20}
              value={contact.phone}
              disabled={pending}
              placeholder="Contoh: 081234567890"
              onChange={(event) => change("phone", event.target.value)}
            />
          </label>
          <label className="shop-field">
            Alamat kontak
            <textarea
              aria-label="Alamat kontak"
              aria-describedby="profile-address-help"
              autoComplete="street-address"
              required
              maxLength={500}
              rows={4}
              value={contact.address}
              disabled={pending}
              onChange={(event) => change("address", event.target.value)}
            />
            <small id="profile-address-help">
              Isi nama jalan, nomor rumah, RT/RW, atau patokan. Pilih wilayah di
              bawah.
            </small>
          </label>
          <DeliveryAddressFields
            value={contact}
            locations={locations}
            prefix="profile"
            disabled={pending}
            onChange={(next) => {
              setContact((previous) => ({ ...previous, ...next }));
              setError("");
              setMessage("");
            }}
          />
          {error && <ModalNotice key={validationAttempt} message={error} />}
          {message && <ModalNotice message={message} kind="success" />}
          <div className="shop-profile-actions">
            <button type="submit" className="shop-button" disabled={pending}>
              {pending ? "Menyimpan..." : "Simpan perubahan"}
            </button>
            <Link href="/akun" className="shop-text-link">
              Cek pesanan
            </Link>
          </div>
        </form>
        <aside className="shop-profile-info">
          <DSUMascot file="maskot_two.webp" large />
          <h2>Data akun Anda</h2>
          <p>
            Nomor WhatsApp yang aktif membantu tim menghubungi Anda untuk
            konfirmasi pesanan.
          </p>
          <p>
            Alamat dan wilayah yang disimpan akan terisi otomatis saat checkout.
            Anda tetap dapat menyesuaikannya untuk setiap pesanan.
          </p>
        </aside>
      </div>
    </section>
  );
}
