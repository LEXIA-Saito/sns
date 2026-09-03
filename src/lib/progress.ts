import { ACCOUNT_ROSTER } from "./roster";
import { formatJstDateTime } from "./settings";
import type { Post, AccountActivity } from "./types";

export interface AccountProgressItem {
  serial: string; // "001"
  accountId: string; // "26-001"
  name: string; // "青木　涼"
  isAdmin: boolean;
  lastLoginAt: number | null;
  isLoggedIn: boolean;
  postCount: number; // 非表示含む投稿総数
  imagePostCount: number; // 写真付き投稿数
  videoPostCount: number; // 動画付き投稿数
  hiddenPostCount: number; // 非表示にされた投稿数
  hasPosted: boolean;
  hasImagePosted: boolean;
}

/**
 * 全投稿・全アクティビティからアカウントごとの進捗を固定一覧として構築
 */
export function buildAccountProgressList(
  allPosts: Post[],
  allActivities: Record<string, AccountActivity> = {},
  includeAdmin: boolean = true
): AccountProgressItem[] {
  // アカウントごとの投稿集計
  const postCounts: Record<string, number> = {};
  const imageCounts: Record<string, number> = {};
  const videoCounts: Record<string, number> = {};
  const hiddenCounts: Record<string, number> = {};

  for (const post of allPosts) {
    const aid = post.accountId;
    if (aid) {
      postCounts[aid] = (postCounts[aid] ?? 0) + 1;
      if (post.media?.type === "image") {
        imageCounts[aid] = (imageCounts[aid] ?? 0) + 1;
      } else if (post.media?.type === "video") {
        videoCounts[aid] = (videoCounts[aid] ?? 0) + 1;
      }
      if (post.moderation?.hidden) {
        hiddenCounts[aid] = (hiddenCounts[aid] ?? 0) + 1;
      }
    }
  }

  const items: AccountProgressItem[] = [];

  // 26-000 から 26-085 までのID一覧を生成
  const ids: string[] = [];
  if (includeAdmin) ids.push("26-000");
  for (let i = 1; i <= 85; i++) {
    ids.push(`26-${String(i).padStart(3, "0")}`);
  }

  for (const accountId of ids) {
    const serial = accountId.split("-")[1] ?? accountId;
    const name = ACCOUNT_ROSTER[accountId] || `アカウント ${accountId}`;
    const activity = allActivities[accountId];
    const lastLoginAt = activity?.lastLoginAt ?? null;
    const pCount = postCounts[accountId] ?? 0;
    const imgCount = imageCounts[accountId] ?? 0;
    const vCount = videoCounts[accountId] ?? 0;
    const hCount = hiddenCounts[accountId] ?? 0;

    items.push({
      serial,
      accountId,
      name,
      isAdmin: accountId === "26-000",
      lastLoginAt,
      isLoggedIn: lastLoginAt !== null,
      postCount: pCount,
      imagePostCount: imgCount,
      videoPostCount: vCount,
      hiddenPostCount: hCount,
      hasPosted: pCount > 0,
      hasImagePosted: imgCount > 0,
    });
  }

  return items;
}

/**
 * CSVエスケープ
 */
function escapeCsv(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * アカウント進捗のUTF-8 BOM付きCSVテキストを生成
 */
export function generateProgressCsv(items: AccountProgressItem[]): string {
  const headers = [
    "通し番号",
    "アカウントID",
    "氏名",
    "最終ログイン",
    "ログイン状況",
    "投稿数",
    "写真投稿数",
    "動画投稿数",
    "非表示投稿数",
  ];

  const rows = items.map((item) => [
    escapeCsv(item.serial),
    escapeCsv(item.accountId),
    escapeCsv(item.name),
    escapeCsv(item.lastLoginAt ? formatJstDateTime(item.lastLoginAt) : "未記録"),
    escapeCsv(item.isLoggedIn ? "ログイン済" : "未ログイン"),
    escapeCsv(item.postCount),
    escapeCsv(item.imagePostCount),
    escapeCsv(item.videoPostCount),
    escapeCsv(item.hiddenPostCount),
  ]);

  const csvBody = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  // UTF-8 BOM (\uFEFF) を先頭に付与してExcel文字化けを防ぐ
  return `\uFEFF${csvBody}`;
}
