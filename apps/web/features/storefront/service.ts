import type {
  Product,
  CustomerContact,
  DeliveryAddress,
  FulfillmentMethod,
  OrderStatus,
  Role,
} from "@dsu/contracts";
export interface CustomerUser
  extends CustomerContact, Partial<DeliveryAddress> {
  id: string;
  email: string;
  role: Role;
}
export interface ShopProduct extends Product {
  available: number;
  imageUrl?: string | null;
}
export interface BasketLine {
  productId: string;
  quantity: number;
  unitPrice: number;
  name: string;
  imageUrl?: string | null;
  available?: number;
}
export interface ShopOrder {
  id: string;
  createdAt: string;
  expiresAt: string;
  status: OrderStatus;
  items: BasketLine[];
  total: number;
  contact: CustomerContact;
  pickupAddress: string;
  whatsappUrl: string;
  fulfillmentMethod: FulfillmentMethod;
  trackingNumber?: string | null;
  events: { status: OrderStatus; reason: string; createdAt: string }[];
}
export interface StoreSettings {
  whatsappNumber: string;
  pickupAddress: string;
  reservationHours: number;
}
export interface ShopState {
  products: ShopProduct[];
  cart: BasketLine[];
  orders: ShopOrder[];
}
export interface AuthResult {
  user: CustomerUser | null;
  csrfToken: string | null;
}
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
/** All customer mutations go through the authenticated same-origin API. */
export async function request<T>(
  path: string,
  body?: unknown,
  method = "GET",
  csrfToken?: string | null,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "X-DSU-Client": "web",
        ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
      },
      ...(method === "GET" ? {} : { body: JSON.stringify(body ?? {}) }),
    });
  } catch {
    throw new ApiError(
      503,
      "Koneksi ke layanan terputus. Periksa koneksi Anda dan coba lagi.",
    );
  }
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new ApiError(
      response.status,
      "Layanan belum tersedia. Coba lagi beberapa saat lagi.",
    );
  let data;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      response.ok ? 502 : response.status,
      "Respons layanan belum dapat dibaca. Silakan coba lagi.",
    );
  }
  if (!response.ok)
    throw new ApiError(
      response.status,
      typeof data?.error === "string"
        ? data.error
        : "Permintaan gagal diproses.",
    );
  return data as T;
}
export function contactErrors(
  contact: CustomerContact,
): Partial<Record<keyof CustomerContact, string>> {
  const errors: Partial<Record<keyof CustomerContact, string>> = {};
  if (contact.name.trim().length < 2 || contact.name.trim().length > 100)
    errors.name = "Isi nama penerima, 2-100 karakter.";
  if (!/^(?:\+62|62|0)[0-9]{8,13}$/.test(contact.phone.replace(/[\s-]/g, "")))
    errors.phone = "Nomor telepon tidak valid.";
  if (contact.address.trim().length < 8 || contact.address.trim().length > 500)
    errors.address = "Isi alamat kontak, 8-500 karakter.";
  return errors;
}
