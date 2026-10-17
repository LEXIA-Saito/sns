import type { Metadata } from "next";

// 公開ページだが、検索に出さない
export const metadata: Metadata = {
  title: "26アカデミー 例会SNS ダイジェスト",
  robots: { index: false, follow: false },
};

export default function DigestLayout({ children }: { children: React.ReactNode }) {
  return children;
}
