import accountData from "./account-hashes.json";

export interface AccountRecord {
  /** ログインID（例: 26-001） */
  id: string;
  /** sha256(`${id}:${password}`) の16進 */
  hash: string;
  /** 運営用アカウント。すべての投稿を編集・削除できる */
  admin?: boolean;
}

const ACCOUNTS: AccountRecord[] = accountData.accounts as AccountRecord[];

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

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * カードのID・パスワードを照合する。一致すればアカウント、しなければ null。
 * 照合はハッシュ同士の比較なので、平文パスワードはアプリ側に持たない。
 */
export async function verifyCredentials(
  rawId: string,
  rawPassword: string
): Promise<AccountRecord | null> {
  const id = normalizeAccountId(rawId);
  const password = normalizePassword(rawPassword);
  if (!id || !password) return null;

  const account = ACCOUNTS.find((a) => a.id === id);
  if (!account) return null;

  const hash = await sha256Hex(`${id}:${password}`);
  return hash === account.hash ? account : null;
}

/** 発行済みアカウント数（運営用を含む） */
export const ACCOUNT_COUNT = ACCOUNTS.length;
