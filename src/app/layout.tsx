import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "26アカデミー | 例会SNS",
  description:
    "26アカデミー例会専用SNS。PR動画・画像・意気込み・激励コメントをリアルタイムで共有。",
  icons: {
    icon: "/logo_26.png",
    shortcut: "/logo_26.png",
    apple: "/logo_26.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#18181b",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
