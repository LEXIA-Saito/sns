import type { Post } from "./types";
import {
  DEFAULT_TIMELINE_VISIBILITY,
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
 * タイムラインに流す投稿を絞り込む。
 *
 * 流れるのは運営画面で表示ONにしたカードと運営（26-000）の投稿だけ。
 * 表示OFFのメンバーは自分の投稿だけ見え、運営は全員ぶんを見る。
 * 絞り込みがOFFのあいだは全員ぶんが流れる。
 */
export function filterTimelinePosts(
  posts: Post[],
  accountId: string,
  admin = false,
  visibility: TimelineVisibility = DEFAULT_TIMELINE_VISIBILITY
): Post[] {
  if (admin) return posts;
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
