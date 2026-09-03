import type { AppSettings } from "./types";

export const DEFAULT_POST_GUIDE_LINES = [
  "本気でやってみようと思えたきっかけ",
  "今も続けられている理由",
  "当時の写真",
];

export const DEFAULT_POST_GUIDE_NOTICE = "写真付き投稿は10月12日まで";

// 2026-10-12 23:59:00 JST -> Unixミリ秒
export const DEFAULT_POST_DEADLINE_MS = new Date("2026-10-12T23:59:00+09:00").getTime();
// 2026-10-19 19:00:00 JST -> Unixミリ秒
export const DEFAULT_COMMENT_DEADLINE_MS = new Date("2026-10-19T19:00:00+09:00").getTime();

export const DEFAULT_POST_DEADLINE_ISO = "2026-10-12T23:59";
export const DEFAULT_COMMENT_DEADLINE_ISO = "2026-10-19T19:00";

export interface CheckActionStatusResult {
  allowed: boolean;
  reason?: string;
  isDeadlinePassed?: boolean;
}

/**
 * 日本時間のフォーマット（YYYY/MM/DD HH:mm）
 */
export function formatJstDateTime(ms?: number | null): string {
  if (!ms || typeof ms !== "number") return "";
  const d = new Date(ms);
  if (isNaN(d.getTime())) return "";

  // JSTでフォーマット (UTC+9)
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(jst.getUTCDate()).padStart(2, "0");
  const h = String(jst.getUTCHours()).padStart(2, "0");
  const min = String(jst.getUTCMinutes()).padStart(2, "0");

  return `${y}/${m}/${day} ${h}:${min}`;
}

/**
 * HTMLのdatetime-local用文字列（YYYY-MM-DDTHH:mm）に変換
 */
export function toJstDateTimeLocal(ms?: number | null): string {
  if (!ms || typeof ms !== "number") return "";
  const d = new Date(ms);
  if (isNaN(d.getTime())) return "";

  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(jst.getUTCDate()).padStart(2, "0");
  const h = String(jst.getUTCHours()).padStart(2, "0");
  const min = String(jst.getUTCMinutes()).padStart(2, "0");

  return `${y}-${m}-${day}T${h}:${min}`;
}

/**
 * datetime-localの文字列（YYYY-MM-DDTHH:mm）をJSTとして解釈しUnixミリ秒に変換
 */
export function parseJstDateTimeLocal(localStr: string): number | null {
  if (!localStr || !localStr.trim()) return null;
  // +09:00 を付与してパース
  const clean = localStr.trim();
  const iso = clean.length === 16 ? `${clean}:00+09:00` : clean.endsWith("+09:00") ? clean : `${clean}+09:00`;
  const time = Date.parse(iso);
  return isNaN(time) ? null : time;
}

/**
 * 新規投稿が可能か判定。
 * - 運営（isAdmin === true）は常に投稿可能（バイパス）
 * - settings が未作成または未設定なら「受付中」
 * - postAccepting === false なら受付停止
 * - postDeadline が設定されており now >= postDeadline なら締切超過
 */
export function canCreatePost(
  settings: AppSettings | null | undefined,
  now: number,
  isAdmin: boolean = false
): CheckActionStatusResult {
  if (isAdmin) {
    return { allowed: true };
  }

  // 1. スイッチ判定（未設定時はデフォルト true）
  if (settings && settings.postAccepting === false) {
    return {
      allowed: false,
      reason: "現在、投稿の受付を一時停止しています。",
    };
  }

  // 2. 締切判定
  if (settings?.postDeadline && now >= settings.postDeadline) {
    return {
      allowed: false,
      isDeadlinePassed: true,
      reason: `投稿受付は終了しました（締切: ${formatJstDateTime(settings.postDeadline)}）。`,
    };
  }

  return { allowed: true };
}

/**
 * 新規コメントが可能か判定。
 */
export function canCreateComment(
  settings: AppSettings | null | undefined,
  now: number,
  isAdmin: boolean = false
): CheckActionStatusResult {
  if (isAdmin) {
    return { allowed: true };
  }

  // 1. スイッチ判定（未設定時はデフォルト true）
  if (settings && settings.commentAccepting === false) {
    return {
      allowed: false,
      reason: "現在、コメントの受付を一時停止しています。",
    };
  }

  // 2. 締切判定
  if (settings?.commentDeadline && now >= settings.commentDeadline) {
    return {
      allowed: false,
      isDeadlinePassed: true,
      reason: `コメント受付は終了しました（締切: ${formatJstDateTime(settings.commentDeadline)}）。`,
    };
  }

  return { allowed: true };
}
