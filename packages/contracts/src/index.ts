export type Role = "ADMIN" | "PETUGAS" | "PELANGGAN";
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
}
export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";
export type PaymentStatus =
  "UNPAID" | "PENDING_REVIEW" | "VERIFIED" | "REJECTED";
export interface Finding {
  id: string;
  batchId: string;
  reportedBy: string;
  quantity: number;
  description: string;
  status: ReviewStatus;
  inventoryReference?: string;
}
export interface ReadinessRequest {
  id: string;
  batchId: string;
  locationId: string;
  observationId: string;
  proposedQuantity: number;
  approvedQuantity: number;
  status: ReviewStatus;
  reviewedBy?: string;
  reason?: string;
}
export interface CartItem {
  productId: string;
  quantity: number;
}
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
export interface OrderItemSnapshot {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}
export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  status: PaymentStatus;
  proofKey?: string;
  verifiedBy?: string;
  reason?: string;
}
export interface Reservation {
  id: string;
  orderId: string;
  batchId: string;
  locationId: string;
  quantity: number;
  status: "ACTIVE" | "RELEASED" | "FULFILLED";
}
export type OrderStatus =
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
  species: string;
  category: string;
  location: string;
  plantedAt: string;
  assignedTo: string;
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
}
export interface NurseryReadService {
  read(): Promise<NurserySnapshot>;
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
