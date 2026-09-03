import type { Post } from "./types";

/**
 * 運営がアイコンをデフォルトへ戻すときの処理。
 *
 * 投稿には投稿時点のアイコンが焼き付いているので、
 * 過去ぶんもまとめて外さないと会場のスクリーンに残ってしまう。
 */

/** 過去の投稿からアイコンを外すための更新パスを組み立てる */
export function buildAvatarResetUpdates(
  posts: Post[],
  accountId: string
): Record<string, null> {
  const updates: Record<string, null> = {};
  for (const post of posts) {
    if (post.accountId === accountId && post.avatarUrl) {
      updates[`posts/${post.id}/avatarUrl`] = null;
    }
  }
  return updates;
}

/**
 * 本人の端末に残っているアイコンを消すべきか。
 * 運営が初期化した時刻より前に保存されたものなら消す
 * （消さないと、次の投稿でまた同じアイコンが付いてしまう）。
 */
export function shouldClearLocalAvatar(
  profileUpdatedAt: number | undefined,
  resetAt: number | undefined
): boolean {
  if (!resetAt) return false;
  return !profileUpdatedAt || profileUpdatedAt < resetAt;
}
