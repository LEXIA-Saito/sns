import type { Post } from "./types";
import type { Session } from "./session";

/**
 * デザイン確認用のダミーデータ。`?demo=1` を付けて開いたときだけ使う。
 * Firebase未設定の端末でも配色・レイアウト・レベルの見え方を確認できるようにするためのもの。
 */
export const DEMO_SESSION: Session = {
  accountId: "26-000",
  name: "齋藤 雅人",
};

const MINUTE = 60_000;

/**
 * デモ画面でレベルの段階が一通り見えるように、過去の活動ぶんの経験値を足しておく。
 * 実際の運用では投稿の実績だけから計算する。
 */
export const DEMO_BASE_XP: Record<string, number> = {
  "26-014": 340,
  "26-031": 1200,
  "26-022": 120,
  "26-000": 250,
};

/** 画像つき投稿の見え方を確認するための、軽い置き換え画像 */
const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">
      <rect width="640" height="360" fill="#1f2937"/>
      <text x="320" y="188" font-family="sans-serif" font-size="26" fill="#9ca3af" text-anchor="middle">写真・動画</text>
    </svg>`
  );

const image = () => ({ type: "image" as const, url: PLACEHOLDER_IMAGE });

export function buildDemoPosts(now: number): Post[] {
  return [
    {
      id: "demo-1",
      accountId: "26-014",
      name: "米津 拓真",
      text: "10月例会の練習、今日で3回目。当日は全員でやりきります！",
      media: image(),
      createdAt: now - 4 * MINUTE,
    },
    {
      id: "demo-2",
      accountId: "26-047",
      name: "佐藤 健一",
      text: "アカウントカード届きました。QR読むだけで入れるの助かる。",
      createdAt: now - 38 * MINUTE,
    },
    {
      id: "demo-3",
      accountId: "26-022",
      name: "岩瀬 亮輝",
      text: "PR動画の撮影、東幡豆の海岸で撮ってきました。夕方の光がいい感じ。",
      media: image(),
      createdAt: now - 3 * 60 * MINUTE,
    },
    {
      id: "demo-4",
      accountId: "26-014",
      name: "米津 拓真",
      text: "台本、だいぶ形になってきました。",
      createdAt: now - 5 * 60 * MINUTE,
    },
    {
      id: "demo-5",
      accountId: "26-014",
      name: "米津 拓真",
      text: "衣装合わせの様子です",
      media: image(),
      createdAt: now - 26 * 60 * MINUTE,
    },
    {
      id: "demo-6",
      accountId: "26-000",
      name: "齋藤 雅人",
      text: "みなさん、投稿ありがとうございます。当日まで走り切りましょう。",
      media: image(),
      createdAt: now - 30 * 60 * MINUTE,
    },
    {
      id: "demo-7",
      accountId: "26-000",
      name: "齋藤 雅人",
      text: "アカウントカードのデザイン、今週中に決めます。",
      createdAt: now - 50 * 60 * MINUTE,
    },
    {
      id: "demo-8",
      accountId: "26-022",
      name: "岩瀬 亮輝",
      text: "撮影の帰りに西尾のいい場所を見つけました",
      createdAt: now - 70 * 60 * MINUTE,
    },
    {
      id: "demo-9",
      accountId: "26-031",
      name: "坂 直樹",
      text: "毎日投稿を見てます。当日が待ち遠しい。",
      createdAt: now - 90 * 60 * MINUTE,
    },
  ];
}
