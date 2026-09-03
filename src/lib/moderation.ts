import type { Post } from "./types";

/**
 * 投稿が一般タイムラインおよび投影画面で表示可能か判定。
 * moderation が存在しない旧データや hidden が true でない場合は「公開」。
 */
export function isPostVisible(post: Post): boolean {
  return !post.moderation?.hidden;
}


/**
 * 表示可能な投稿のみを抽出（新しい順は維持）。
 */
export function filterVisiblePosts(posts: Post[]): Post[] {
  return posts.filter(isPostVisible);
}
