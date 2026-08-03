import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import NotificationProvider from "@/components/notifications/NotificationProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SIMASMUH - Sistem Informasi Management",
  description: "Administrasi Mengajar Guru dan Manajemen Sekolah",
  icons: {
    icon: "/pic_logo.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </Providers>
      </body>
    </html>
  );
}
