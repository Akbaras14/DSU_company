"use client";
import { useState } from "react";
import { useShop } from "./provider";
import type { ShopOrder } from "./service";
import { PhotoUpload } from "@/features/admin/shared";
import { rupiah } from "@/lib/format";

export function CustomerPayment({ order }: { order: ShopOrder }) {
  const { adminRequest, refresh } = useShop();
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  return (
    <section className="shop-cancel">
      <h3>Pembayaran</h3>
      {order.payment && (
        <p>
          Status: {order.payment.status} · {order.payment.reason}
        </p>
      )}
      {[
        "PENDING_PAYMENT",
        "PAYMENT_REJECTED",
        "PENDING_CONFIRMATION",
        "CONFIRMED",
      ].includes(order.status) && (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setPending(true);
            setError("");
            try {
              await adminRequest(
                `/customer/orders/${order.id}/payment`,
                {
                  amount: order.total + (order.shippingCost ?? 0),
                  method: form.get("method"),
                  proofUrl: form.get("photoUrl"),
                },
                "POST",
              );
              await refresh();
            } catch (cause) {
              setError(
                cause instanceof Error
                  ? cause.message
                  : "Pembayaran gagal dikirim.",
              );
            } finally {
              setPending(false);
            }
          }}
        >
          <fieldset disabled={pending}>
            <p>
              Tagihan: {rupiah(order.total + (order.shippingCost ?? 0))}.
              Konfirmasikan instruksi transfer dan ongkir melalui WhatsApp admin
              sebelum membayar.
            </p>
            <label className="shop-field">
              Metode pembayaran
              <input
                name="method"
                required
                minLength={2}
                maxLength={100}
                placeholder="Contoh: transfer bank"
              />
            </label>
            <PhotoUpload purpose="payment" />
            <button className="shop-button" type="submit">
              {pending ? "Mengirim…" : "Kirim bukti pembayaran"}
            </button>
          </fieldset>
          {error && <p role="alert">{error}</p>}
        </form>
      )}
    </section>
  );
}
