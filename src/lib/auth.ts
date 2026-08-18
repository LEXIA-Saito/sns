"use client";

import {
  browserLocalPersistence,
  setPersistence,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  type User,
} from "firebase/auth";
import { getAuthOrNull } from "./firebase";
import { normalizeAccountId, normalizePassword } from "./accounts";

/**
 * カードのログインIDを Firebase Auth のメールアドレスに変換する。
 * 参加者はメールアドレスを持たない運用なので、ID から機械的に作る。
 * （このドメインにメールは届かない。認証の識別子としてだけ使う）
 */
export const CARD_EMAIL_DOMAIN = "sns26.local";

export function cardEmail(accountId: string): string {
  return `${accountId}@${CARD_EMAIL_DOMAIN}`;
}

/** 運営用アカウント。全投稿の編集・削除ができる（DBのルール側でも同じIDを許可している） */
export const ADMIN_ACCOUNT_ID = "26-000";

export function isAdminUser(user: User | null): boolean {
  return user?.uid === ADMIN_ACCOUNT_ID;
}

export class CardSignInError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CardSignInError";
  }
}

/**
 * カード記載のID・パスワードでサインインする。
 * uid はカード番号そのもの（例: 26-001）。投稿の所有者判定に使う。
 */
export async function signInWithCard(
  rawId: string,
  rawPassword: string
): Promise<User> {
  const accountId = normalizeAccountId(rawId);
  const password = normalizePassword(rawPassword);

  if (!accountId || !password) {
    throw new CardSignInError("IDとパスワードを入力してください。");
  }

  const auth = getAuthOrNull();
  if (!auth) {
    throw new CardSignInError(
      "接続設定が未完了のためログインできません（運営向け: Firebaseの環境変数を確認してください）。"
    );
  }

  try {
    // 6週間カードを持ち歩く運用なので、端末にログイン状態を残す
    await setPersistence(auth, browserLocalPersistence);
    const credential = await signInWithEmailAndPassword(
      auth,
      cardEmail(accountId),
      password
    );
    return credential.user;
  } catch (error) {
    throw new CardSignInError(messageFor(error));
  }
}

export function signOutCard(): Promise<void> {
  const auth = getAuthOrNull();
  return auth ? fbSignOut(auth) : Promise.resolve();
}

export function onAuthStateChanged(callback: (user: User | null) => void) {
  const auth = getAuthOrNull();
  if (!auth) {
    // 設定が無い環境では未ログイン扱いにする
    callback(null);
    return () => {};
  }
  return fbOnAuthStateChanged(auth, callback);
}

function messageFor(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  switch (code) {
    case "auth/invalid-credential":
    case "auth/invalid-email":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "IDまたはパスワードが違います。カードの記載をご確認ください。";
    case "auth/user-disabled":
      return "このカードは無効になっています。運営（アカデミー統括）までご連絡ください。";
    case "auth/too-many-requests":
      return "入力の失敗が続いたため、一時的にロックされています。少し時間をおいてからお試しください。";
    case "auth/network-request-failed":
      return "通信に失敗しました。電波状況をご確認ください。";
    case "auth/operation-not-allowed":
      return "ログイン方式が有効になっていません（運営向け: Firebaseでメール/パスワードを有効化してください）。";
    default:
      console.error("sign-in error:", error);
      return "ログインに失敗しました。時間をおいてお試しください。";
  }
}
