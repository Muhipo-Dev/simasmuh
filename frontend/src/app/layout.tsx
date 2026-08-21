import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import NotificationProvider from "@/components/notifications/NotificationProvider";
import WaitingRoomProvider from "@/components/waiting-room/WaitingRoomProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "System by. Muhipo Dev",
    template: "%s | System by. Muhipo Dev",
  },
  description: "Sistem Informasi Manajemen SMA Muhammadiyah 1 Ponorogo",
  icons: {
    icon: [
      { url: "/pic_logo.png", type: "image/png" },
      { url: "/favicon.ico" }
    ],
    shortcut: "/pic_logo.png",
    apple: "/pic_logo.png",
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
        <WaitingRoomProvider>
          <Providers>
            <NotificationProvider>
              {children}
            </NotificationProvider>
          </Providers>
        </WaitingRoomProvider>
      </body>
    </html>
  );
}
