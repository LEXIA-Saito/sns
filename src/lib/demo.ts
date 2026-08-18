import type { Post } from "./types";
import type { Session } from "./session";

/**
 * デザイン確認用のダミーデータ。`?demo=1` を付けて開いたときだけ使う。
 * Firebase未設定の端末でも配色・レイアウトを確認できるようにするためのもの。
 */
export const DEMO_SESSION: Session = {
  accountId: "26-000",
  name: "齋藤 雅人",
  role: "academy",
};

const MINUTE = 60_000;

export function buildDemoPosts(now: number): Post[] {
  return [
    {
      id: "demo-1",
      accountId: "26-014",
      name: "米津 拓真",
      role: "academy",
      text: "10月例会の練習、今日で3回目。当日は全員でやりきります！\n当日はぜひ会場で見てください。",
      createdAt: now - 4 * MINUTE,
      comments: {
        c1: {
          id: "c1",
          accountId: "26-031",
          name: "坂 直樹",
          text: "楽しみにしてます！",
          createdAt: now - 2 * MINUTE,
        },
      },
    },
    {
      id: "demo-2",
      accountId: "26-047",
      name: "佐藤 健一",
      role: "lom",
      text: "アカウントカード届きました。QR読むだけで入れるの助かる。",
      createdAt: now - 38 * MINUTE,
    },
    {
      id: "demo-3",
      accountId: "26-022",
      name: "岩瀬 亮輝",
      role: "academy",
      text: "PR動画の撮影、東幡豆の海岸で撮ってきました。夕方の光がいい感じ。",
      createdAt: now - 3 * 60 * MINUTE,
      comments: {
        c2: {
          id: "c2",
          accountId: "26-009",
          name: "杉浦 誠",
          text: "これはいい絵が撮れそう",
          createdAt: now - 2 * 60 * MINUTE,
        },
        c3: {
          id: "c3",
          accountId: "26-055",
          name: "名古屋 学",
          text: "当日のスクリーンが楽しみ",
          createdAt: now - 90 * MINUTE,
        },
      },
    },
  ];
}
