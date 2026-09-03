/**
 * いいね機能の純粋ロジック
 */

/**
 * 投稿のいいね総数をカウント
 */
export function countLikes(likesNode?: Record<string, boolean> | null): number {
  if (!likesNode || typeof likesNode !== "object") return 0;
  return Object.values(likesNode).filter(Boolean).length;
}

/**
 * 指定アカウントがいいねしているか判定
 */
export function hasUserLiked(
  likesNode?: Record<string, boolean> | null,
  accountId?: string | null
): boolean {
  if (!likesNode || !accountId) return false;
  return Boolean(likesNode[accountId]);
}
