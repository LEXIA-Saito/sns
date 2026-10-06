import type { Post } from "./types";

/** 氏名の最大文字数（投稿の name と同じ上限。DBルールとそろえる） */
export const ACCOUNT_NAME_MAX = 40;

/** 運営（26-000）の名前は変えられない */
const FIXED_ACCOUNT_ID = "26-000";

/** カード番号 → 運営が変更した氏名 */
export type AccountNames = Record<string, string>;

/** 前後の空白（全角含む）を取り除く */
export function normalizeAccountName(raw: string): string {
  return (raw ?? "").trim();
}

/** 入力値の検証。問題なければ null、あればエラー文を返す */
export function validateAccountName(name: string): string | null {
  if (!name) return "名前を入力してください";
  if (name.length > ACCOUNT_NAME_MAX) {
    return `名前は${ACCOUNT_NAME_MAX}文字以内にしてください`;
  }
  return null;
}

/** DBから読んだ値を、使える形だけに絞る（壊れた値・運営の行は捨てる） */
export function cleanAccountNames(value: unknown): AccountNames {
  const cleaned: AccountNames = {};
  if (!value || typeof value !== "object") return cleaned;
  for (const [accountId, name] of Object.entries(value as Record<string, unknown>)) {
    if (accountId === FIXED_ACCOUNT_ID) continue;
    if (typeof name !== "string") continue;
    const trimmed = normalizeAccountName(name);
    if (validateAccountName(trimmed) !== null) continue;
    cleaned[accountId] = trimmed;
  }
  return cleaned;
}

/**
 * 投稿の氏名を、変更後の氏名に差し替える。
 * 投稿には作成時の氏名が入っているので、表示するときに上書きする。
 * 変更がなければ元の配列をそのまま返す。
 */
export function applyAccountNames(posts: Post[], names: AccountNames): Post[] {
  if (Object.keys(names).length === 0) return posts;
  return posts.map((post) => {
    const renamed = post.accountId ? names[post.accountId] : undefined;
    return renamed && renamed !== post.name ? { ...post, name: renamed } : post;
  });
}
