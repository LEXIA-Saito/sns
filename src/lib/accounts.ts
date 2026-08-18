/**
 * アカウントカードの記載内容（ログインID・パスワード）の整形。
 * 認証そのものは Firebase Auth が行う（src/lib/auth.ts）。
 */

/** 全角英数字・記号を半角に寄せる */
function toHalfWidth(value: string): string {
  return value
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0xfee0)
    )
    .replace(/[ー－―‐]/g, "-")
    .replace(/\s|　/g, "");
}

/**
 * 入力されたIDを 26-001 形式に整える。
 * 「1」「001」「26001」「26-1」などカード記載の読み違えを吸収する。
 */
export function normalizeAccountId(raw: string): string {
  const cleaned = toHalfWidth(raw).toUpperCase();
  const digits = cleaned.replace(/[^0-9]/g, "");
  if (!digits) return cleaned;
  // 先頭の期別プレフィックス(26)が付いている場合は落として通し番号だけにする
  const serial = digits.length > 3 && digits.startsWith("26") ? digits.slice(2) : digits;
  return `26-${serial.padStart(3, "0").slice(-3)}`;
}

/** 入力されたパスワードを整える（大文字・記号除去） */
export function normalizePassword(raw: string): string {
  return toHalfWidth(raw).toUpperCase();
}
