import { notFound } from "next/navigation";
import { NurseryPortal } from "@/components/nursery-portal";
export default async function Page({
  params,
}: {
  params: Promise<{ portal: string }>;
}) {
  const { portal } = await params;
  if (portal !== "petugas") notFound();
  return <NurseryPortal />;
}
