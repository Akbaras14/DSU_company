export type Role = "ADMIN" | "PETUGAS" | "PELANGGAN";
export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";
export interface CustomerContact {
  name: string;
  phone: string;
  address: string;
}
export interface DeliveryAddress {
  provinceId: string;
  regencyId: string;
  districtId: string;
  villageId: string;
  postalCode: string;
}
export type CustomerProfileContact = CustomerContact & DeliveryAddress;
export interface CheckoutContact extends CustomerContact {
  postalCode: string;
}
export type FulfillmentMethod = "DELIVERY" | "PICKUP";
export type OrderStatus =
  | "WAITING_VERIFICATION"
  | "READY_TO_SHIP"
  | "PENDING_CONFIRMATION"
  | "CONFIRMED"
  | "PENDING_PAYMENT"
  | "PAYMENT_REVIEW"
  | "PAYMENT_REJECTED"
  | "PAID"
  | "PROCESSING"
  | "READY_FOR_PICKUP"
  | "SHIPPED"
  | "COMPLETED"
  | "EXPIRED"
  | "CANCELLED";
export interface Stock {
  physical: number;
  approved: number;
  reserved: number;
}
export interface Batch extends Stock {
  id: string;
  status: string;
  species: string;
  category: string;
  location: string;
  plantedAt: string | null;
  assignedTo: string | null;
}

/** Calendar days since planting, using the nursery's Asia/Jakarta date. */
export function plantAgeDays(
  plantedAt: string | null,
  asOf = new Date(),
): number | null {
  if (!plantedAt) return null;
  const planted = new Date(plantedAt);
  if (!Number.isFinite(planted.getTime()) || !Number.isFinite(asOf.getTime()))
    return null;
  const day = (date: Date) =>
    Date.parse(
      new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 10),
    );
  const days = Math.round((day(asOf) - day(planted)) / 86400000);
  return days < 0 ? null : days;
}
export interface Observation {
  id: string;
  batchId: string;
  observedBy: string;
  observedAt: string;
  method: string;
  sampleCount: number;
  measurements: {
    sampleNumber: number;
    parameter: string;
    unit: string;
    value: number;
  }[];
  condition: string;
  notes: string;
  health?: "HEALTHY" | "NEEDS_ATTENTION" | "CRITICAL";
  photoUrl?: string | null;
  correctionOf?: string | null;
}
export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  batchIds: string[];
  published: boolean;
}
export interface NurserySnapshot {
  batches: Batch[];
  observations: Observation[];
  monitoringIntervalDays: number;
}
/** Returns orderable stock; throws when a stock invariant is broken. No mutations. */
export function availableStock(stock: Stock): number {
  if (
    ![stock.physical, stock.approved, stock.reserved].every(
      (value) => Number.isSafeInteger(value) && value >= 0,
    ) ||
    stock.approved > stock.physical ||
    stock.reserved > stock.approved
  )
    throw new Error("Saldo stok tidak valid; diperlukan rekonsiliasi.");
  return Math.max(0, stock.approved - stock.reserved);
}
export const orderLabels: Record<OrderStatus, string> = {
  WAITING_VERIFICATION: "Menunggu verifikasi pembayaran",
  READY_TO_SHIP: "Siap dikirim",
  PENDING_CONFIRMATION: "Menunggu konfirmasi",
  CONFIRMED: "Dikonfirmasi",
  PENDING_PAYMENT: "Menunggu pembayaran",
  PAYMENT_REVIEW: "Menunggu verifikasi",
  PAYMENT_REJECTED: "Pembayaran ditolak",
  PAID: "Lunas",
  PROCESSING: "Diproses",
  READY_FOR_PICKUP: "Siap diambil",
  SHIPPED: "Dikirim",
  COMPLETED: "Selesai",
  EXPIRED: "Kedaluwarsa",
  CANCELLED: "Dibatalkan",
};
