import type { Post } from "./types";
import { isAcademyMember } from "./roster";

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

/**
 * タイムラインに流す投稿を絞り込む。
 *
 * 流れるのはアカデミーメンバーの投稿だけ。
 * ＬＯＭメンバーは自分の投稿だけ見え、運営は全員ぶんを見る。
 */
export function filterTimelinePosts(
  posts: Post[],
  accountId: string,
  admin = false
): Post[] {
  if (admin) return posts;
  return posts.filter(
    (post) => isAcademyMember(post.accountId) || post.accountId === accountId
  );
}
