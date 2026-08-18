"use client";

import type { AuthorRole } from "./types";
import { ADMIN_ACCOUNT_ID } from "./auth";

/**
 * ログイン状態そのものは Firebase Auth が持つ。
 * ここで扱うのは「表示名・立場・アイコン」だけで、カード番号ごとに端末に保存する。
 */
const PROFILE_KEY_PREFIX = "academy26_profile_";
// 旧バージョン（認証なし運用）のキー。初回ログイン時の初期値として拾う
const LEGACY_NAME_KEY = "academy26_name";
const LEGACY_ROLE_KEY = "academy26_role";
const LEGACY_AVATAR_KEY = "academy26_avatar";

export interface Profile {
  name: string;
  role: AuthorRole;
  avatarUrl?: string;
}

export interface Session extends Profile {
  /** カードのログインID。Firebase Auth の uid と同じ */
  accountId: string;
  /** 運営用アカウントか */
  admin?: boolean;
}

function keyFor(accountId: string) {
  return `${PROFILE_KEY_PREFIX}${accountId}`;
}

export function loadProfile(accountId: string): Profile {
  if (typeof window === "undefined") return { name: "", role: "lom" };
  try {
    const raw = localStorage.getItem(keyFor(accountId));
    if (raw) {
      const parsed = JSON.parse(raw) as Profile;
      return {
        name: parsed.name ?? "",
        role: parsed.role === "academy" ? "academy" : "lom",
        avatarUrl: parsed.avatarUrl,
      };
    }
  } catch {
    // 壊れていたら初期値に戻す
  }
  return readLegacyProfile();
}

export function saveProfile(accountId: string, profile: Profile): void {
  localStorage.setItem(keyFor(accountId), JSON.stringify(profile));
}

export function buildSession(accountId: string, profile: Profile): Session {
  return {
    accountId,
    ...(accountId === ADMIN_ACCOUNT_ID ? { admin: true } : {}),
    ...profile,
  };
}

/** 旧運用で入力済みの名前・立場・アバターがあれば初期値として使う */
export function readLegacyProfile(): Profile {
  if (typeof window === "undefined") return { name: "", role: "lom" };
  const role = localStorage.getItem(LEGACY_ROLE_KEY);
  return {
    name: localStorage.getItem(LEGACY_NAME_KEY) ?? "",
    role: role === "academy" ? "academy" : "lom",
    avatarUrl: localStorage.getItem(LEGACY_AVATAR_KEY) ?? undefined,
  };
}
