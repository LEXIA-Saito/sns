import type { Post } from "./types";
import {
  DEFAULT_TIMELINE_VISIBILITY,
  canSeeAllPosts,
  isTimelineAuthor,
  type TimelineVisibility,
} from "./timelineVisibility";

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
 * タイムラインに流す投稿を、**見ている人に合わせて**絞り込む。
 *
 * - 運営（26-000）… 全員ぶん
 * - アカデミーメンバー（表示ONの人）… **全員ぶん。ＬＯＭメンバーの投稿も見える**
 * - ＬＯＭメンバー（表示OFFの人）… アカデミーの投稿と、自分の投稿だけ
 *
 * 絞り込みがOFFのあいだは、誰から見ても全員ぶんが流れる。
 */
export function filterTimelinePosts(
  posts: Post[],
  accountId: string,
  admin = false,
  visibility: TimelineVisibility = DEFAULT_TIMELINE_VISIBILITY
): Post[] {
  if (admin) return posts;
  // アカデミーメンバーはＬＯＭの投稿も含めて全部見える
  if (canSeeAllPosts(accountId, visibility)) return posts;
  return posts.filter(
    (post) =>
      isTimelineAuthor(post.accountId, visibility) ||
      post.accountId === accountId
  );
}

/**
 * 会場の投影画面に映す投稿。
 * 「自分の投稿だから見える」の逃げ道が無いぶん、タイムラインより厳しい。
 */
export function filterProjectorPosts(
  posts: Post[],
  visibility: TimelineVisibility = DEFAULT_TIMELINE_VISIBILITY
): Post[] {
  return filterVisiblePosts(posts).filter((post) =>
    isTimelineAuthor(post.accountId, visibility)
  );
}
