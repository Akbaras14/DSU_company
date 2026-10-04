import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { NotificationProvider } from "@/components/notification-provider";
import { CustomerProvider } from "@/features/storefront/provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pembibitan Tanaman | CV. Delta Sinergi Utama",
  description: "Persediaan, pemantauan manual, dan pemesanan tanaman DSU.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <a className="skip-link" href="#main">
          Lewati ke konten
        </a>
        <NotificationProvider>
          <CustomerProvider>{children}</CustomerProvider>
        </NotificationProvider>
      </body>
    </html>
  );
}
