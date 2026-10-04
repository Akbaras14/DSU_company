"use client";
import { ModalNotice } from "@/components/notification-provider";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, ArrowRight, ArrowLeft } from "lucide-react";
import { redirectPathForRole } from "@/lib/session";
import { useShop } from "./provider";
import "./login.css";
export function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { authenticate } = useShop();
  const [register, setRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const user = await authenticate(
        email.trim().toLowerCase(),
        password,
        register ? name.trim() : undefined,
      );
      const next = params.get("next");
      const allowedNext =
        next &&
        /^\/(katalog(?:\/[a-zA-Z0-9_-]+)?|keranjang|checkout|akun|profil)$/.test(
          next,
        )
          ? next
          : null;
      router.replace(
        user.role === "PELANGGAN" && allowedNext
          ? allowedNext
          : redirectPathForRole(user.role),
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Akun belum dapat diakses.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="shop-login">
      <div className="shop-auth-brand-row">
        <Link
          href="/"
          aria-label="Delta Sinergi Utama — beranda"
          className="shop-auth-brand"
        >
          <Image
            src="/images/logo/dsu_logo.svg"
            alt="Delta Sinergi Utama"
            width={1798}
            height={875}
            unoptimized
          />
        </Link>
        <Link href="/katalog" className="shop-auth-back">
          <ArrowLeft size={16} /> Kembali ke katalog
        </Link>
      </div>
      <div className="shop-auth-layout">
        <div className="shop-login-card">
          <div className="shop-login-header">
            <h1>{register ? "Buat akun Anda" : "Selamat datang kembali."}</h1>
            <p>Simpan pilihan tanaman dan ikuti perkembangan pesanan Anda.</p>
          </div>
          <form className="shop-login-form" onSubmit={submit}>
            {register && (
              <label className="shop-field">
                Nama lengkap
                <input
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={pending}
                />
              </label>
            )}
            <label className="shop-field">
              Alamat email
              <input
                type="email"
                autoComplete="email"
                required
                maxLength={191}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={pending}
              />
            </label>
            <label className="shop-field">
              Kata sandi
              <div className="shop-login-input-wrapper">
                <input
                  aria-label="Kata sandi"
                  type={showPassword ? "text" : "password"}
                  autoComplete={register ? "new-password" : "current-password"}
                  required
                  minLength={10}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={pending}
                  aria-describedby="password-help"
                />
                <button
                  type="button"
                  className="shop-login-toggle-password"
                  aria-label={
                    showPassword
                      ? "Sembunyikan kata sandi"
                      : "Tampilkan kata sandi"
                  }
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              <small id="password-help">Minimal 10 karakter.</small>
            </label>
            {error && <ModalNotice message={error} />}
            <button className="shop-button" disabled={pending}>
              {pending
                ? "Memproses..."
                : register
                  ? "Daftar & lanjutkan"
                  : "Masuk"}
              <ArrowRight size={18} />
            </button>
          </form>
          <div className="shop-login-footer">
            <button
              className="shop-text-link"
              onClick={() => {
                setRegister((v) => !v);
                setError("");
              }}
            >
              {register
                ? "Sudah punya akun? Masuk"
                : "Belum punya akun? Daftar"}
            </button>
          </div>
        </div>
        <aside
          className="shop-auth-aside"
          aria-label="Selamat datang di Delta Sinergi Utama"
        >
          <div className="shop-auth-mascot">
            <Image
              src="/images/maskot/maskot_two.webp"
              alt="Maskot Delta Sinergi Utama menyambut Anda"
              fill
              unoptimized
              sizes="(max-width: 767px) 160px, 320px"
            />
          </div>
          <h2>
            Awal kecil untuk
            <br />
            ruang yang lebih asri.
          </h2>
          <p>
            Temukan tanaman pilihan Anda.
            <br />
            Kami siap membantu merawatnya.
          </p>
        </aside>
      </div>
    </section>
  );
}
