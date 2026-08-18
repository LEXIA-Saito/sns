"use client";

import type { AuthorRole } from "./types";

const SESSION_KEY = "academy26_session";
// 旧バージョン（認証なし運用）のキー。初回ログイン時の初期値として拾う
const LEGACY_NAME_KEY = "academy26_name";
const LEGACY_ROLE_KEY = "academy26_role";
const LEGACY_AVATAR_KEY = "academy26_avatar";

export interface Session {
  /** カードのログインID */
  accountId: string;
  /** 運営用アカウントか */
  admin?: boolean;
  /** 表示名（プロフィール設定で入力） */
  name: string;
  role: AuthorRole;
  avatarUrl?: string;
  loginAt: number;
}

export function loadSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (!parsed?.accountId) return null;
    return {
      ...parsed,
      role: parsed.role === "academy" || parsed.role === "lom" ? parsed.role : "lom",
      name: parsed.name ?? "",
    };
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

/** 旧運用で入力済みの名前・立場・アバターがあれば初期値として使う */
export function readLegacyProfile(): Pick<Session, "name" | "role" | "avatarUrl"> {
  if (typeof window === "undefined") return { name: "", role: "lom" };
  const role = localStorage.getItem(LEGACY_ROLE_KEY);
  return {
    name: localStorage.getItem(LEGACY_NAME_KEY) ?? "",
    role: role === "academy" ? "academy" : "lom",
    avatarUrl: localStorage.getItem(LEGACY_AVATAR_KEY) ?? undefined,
  };
}
