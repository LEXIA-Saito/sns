"use client";

import { ADMIN_ACCOUNT_ID } from "./auth";
import { getRosterName } from "./roster";

/**
 * ログイン状態そのものは Firebase Auth が持つ。
 * ここで扱うのは「表示名・立場・アイコン」だけで、カード番号ごとに端末に保存する。
 */
const PROFILE_KEY_PREFIX = "academy26_profile_";
// 旧バージョン（認証なし運用）のキー。初回ログイン時の初期値として拾う
const LEGACY_NAME_KEY = "academy26_name";
const LEGACY_AVATAR_KEY = "academy26_avatar";

export interface Profile {
  name: string;
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
  const fixedName = getRosterName(accountId);
  if (typeof window === "undefined") return { name: fixedName };
  let avatarUrl: string | undefined;
  try {
    const raw = localStorage.getItem(keyFor(accountId));
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Profile>;
      avatarUrl = parsed.avatarUrl;
    }
  } catch {
    // 壊れていたら初期値に戻す
  }
  if (!avatarUrl) {
    const legacy = readLegacyProfile();
    avatarUrl = legacy.avatarUrl;
  }
  return {
    name: fixedName,
    avatarUrl,
  };
}

export function saveProfile(accountId: string, profile: Partial<Profile>): void {
  if (typeof window === "undefined") return;
  const fixedName = getRosterName(accountId);
  try {
    localStorage.setItem(
      keyFor(accountId),
      JSON.stringify({
        name: fixedName,
        avatarUrl: profile.avatarUrl,
      })
    );
  } catch {
    // ignore
  }
}

export function buildSession(accountId: string, profile: Profile): Session {
  const fixedName = getRosterName(accountId);
  return {
    accountId,
    name: fixedName,
    avatarUrl: profile.avatarUrl,
    ...(accountId === ADMIN_ACCOUNT_ID ? { admin: true } : {}),
  };
}

/** 旧運用で入力済みの名前・アバターがあれば初期値として使う */
export function readLegacyProfile(): Profile {
  if (typeof window === "undefined") return { name: "" };
  return {
    name: localStorage.getItem(LEGACY_NAME_KEY) ?? "",
    avatarUrl: localStorage.getItem(LEGACY_AVATAR_KEY) ?? undefined,
  };
}
