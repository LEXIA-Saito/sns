import type { Post, Comment } from "./types";

/**
 * 投稿が一般タイムラインおよび投影画面で表示可能か判定。
 * moderation が存在しない旧データや hidden が true でない場合は「公開」。
 */
export function isPostVisible(post: Post): boolean {
  return !post.moderation?.hidden;
}

/**
 * コメントが表示可能か判定。
 * moderation が存在しない旧データや hidden が true でない場合は「公開」。
 */
export function isCommentVisible(comment: Comment): boolean {
  return !comment.moderation?.hidden;
}

/**
 * 表示可能な投稿のみを抽出（新しい順は維持）。
 */
export function filterVisiblePosts(posts: Post[]): Post[] {
  return posts.filter(isPostVisible);
}

/**
 * 表示可能なコメントのみを抽出。
 */
export function filterVisibleComments(comments: Comment[]): Comment[] {
  return comments.filter(isCommentVisible);
}

/**
 * コメントを削除できるか。
 * 自分のコメントのみ。運営用アカウントは全コメントを操作できる。
 */
export function canDeleteComment(
  comment: Comment,
  accountId: string,
  admin = false
): boolean {
  if (admin) return true;
  return !!comment.accountId && comment.accountId === accountId;
}
