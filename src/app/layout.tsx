import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "26アカデミー | 例会SNS",
  description:
    "26アカデミー例会専用SNS。PR動画・画像・意気込み・激励コメントをリアルタイムで共有。",
  icons: {
    icon: "/The_Year_of_the_fire_academy%20(1).png",
    shortcut: "/The_Year_of_the_fire_academy%20(1).png",
    apple: "/The_Year_of_the_fire_academy%20(1).png",
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
      <body>{children}</body>
    </html>
  );
}
