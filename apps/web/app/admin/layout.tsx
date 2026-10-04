import type { ReactNode } from "react";
import { AdminShell } from "@/features/admin/admin";
export default function Layout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
