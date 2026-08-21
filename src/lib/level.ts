import type { Post } from "./types";

/** 文字だけの投稿で入る経験値 */
export const XP_TEXT_POST = 10;
/** 画像・動画つきの投稿で入る経験値 */
export const XP_MEDIA_POST = 25;

/** 各レベルに上がるのに必要な累計経験値 */
const THRESHOLDS = [0, 30, 80, 150, 250, 400, 600, 850, 1150, 1500];
/** 最大レベル以降の間隔 */
const STEP_AFTER_MAX = 400;

export interface LevelState {
  level: number;
  xp: number;
  /** 今のレベルに上がった時点の累計経験値 */
  levelStartXp: number;
  /** 次のレベルに必要な累計経験値 */
  nextLevelXp: number;
  /** 次のレベルまでの進み具合（0〜1） */
  progress: number;
  /** 次のレベルまであといくつか */
  remaining: number;
}

function thresholdFor(level: number): number {
  if (level <= THRESHOLDS.length) return THRESHOLDS[level - 1];
  return THRESHOLDS[THRESHOLDS.length - 1] + (level - THRESHOLDS.length) * STEP_AFTER_MAX;
}

/** 1投稿あたりの経験値。画像・動画つきの方が大きい */
export function xpForPost(post: Pick<Post, "media">): number {
  return post.media ? XP_MEDIA_POST : XP_TEXT_POST;
}

/** 投稿一覧から、カード番号ごとの経験値を集計する */
export function xpByAccount(posts: Post[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const post of posts) {
    if (!post.accountId) continue;
    result[post.accountId] = (result[post.accountId] ?? 0) + xpForPost(post);
  }
  return result;
}

/** 経験値からレベルと進み具合を求める */
export function levelFromXp(xp: number): LevelState {
  const safeXp = Math.max(0, Math.floor(xp));
  let level = 1;
  while (safeXp >= thresholdFor(level + 1)) level += 1;

  const levelStartXp = thresholdFor(level);
  const nextLevelXp = thresholdFor(level + 1);
  const span = nextLevelXp - levelStartXp;

  return {
    level,
    xp: safeXp,
    levelStartXp,
    nextLevelXp,
    progress: span > 0 ? Math.min(1, (safeXp - levelStartXp) / span) : 0,
    remaining: Math.max(0, nextLevelXp - safeXp),
  };
}

export interface LevelTier {
  /** 段階（1〜5）。アイコンの絵柄が変わる */
  rank: 1 | 2 | 3 | 4 | 5;
  label: string;
}

/** レベルから段階（アイコンの絵柄）を求める */
export function tierFromLevel(level: number): LevelTier {
  if (level >= 9) return { rank: 5, label: "冠" };
  if (level >= 7) return { rank: 4, label: "星" };
  if (level >= 5) return { rank: 3, label: "炎" };
  if (level >= 3) return { rank: 2, label: "若木" };
  return { rank: 1, label: "芽" };
}
