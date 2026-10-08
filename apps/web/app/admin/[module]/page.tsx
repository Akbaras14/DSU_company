import { notFound, redirect } from "next/navigation";
import {
  AdminMaster,
  AdminBatches,
  AdminInventory,
  AdminMonitoring,
  AdminCatalogEditor,
} from "@/features/admin/resources";
import { AdminReviews, AdminCustomers } from "@/features/admin/operations";
import {
  AdminAudit,
  AdminSettings,
  AdminReports,
} from "@/features/admin/system";

export default async function Page({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  switch (module) {
    case "kategori":
      return <AdminMaster kind="categories" />;
    case "lokasi":
      return <AdminMaster kind="nursery-locations" />;
    case "batch":
      return <AdminBatches />;
    case "inventory":
      return <AdminInventory />;
    case "monitoring":
      return <AdminMonitoring />;
    case "approval":
      return <AdminReviews kind="approvals" />;
    case "katalog":
      return <AdminCatalogEditor />;
    case "pembayaran":
      return <AdminReviews kind="payments" />;
    case "pelanggan":
      return <AdminCustomers />;
    case "laporan":
      return <AdminReports />;
    case "audit":
      return <AdminAudit />;
    case "pengaturan":
      return <AdminSettings />;
    case "notifikasi":
      redirect("/admin");
    default:
      notFound();
  }
}
