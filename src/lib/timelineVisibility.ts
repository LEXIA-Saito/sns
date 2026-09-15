/**
 * タイムラインに流す投稿の絞り込み。
 *
 * 誰の投稿を流すかは、ソースに名簿を焼き込まず **運営がDBで切り替える**。
 * 26期アカデミー生とＬＯＭメンバーの区別はコード側では判断できないため、
 * 運営画面（/admin のタイムライン表示タブ）でカードごとにON/OFFする。
 *
 * - `enabled` が false のあいだは **全員の投稿が流れる**（導入前と同じ挙動）
 * - `enabled` が true なら、`allow` に true で入っているカードだけが流れる
 * - 運営（26-000）の投稿は連絡用なので常に流す
 * - 自分の投稿は、絞り込みで外れていても自分の画面には出る（投稿できたのに消える事故を防ぐ）
 */

/** 運営アカウント。投稿は常にタイムラインへ流す */
export const TIMELINE_ADMIN_ID = "26-000";

export interface TimelineVisibility {
  /** 絞り込みを使うか。false のあいだは全員ぶんを表示する */
  enabled: boolean;
  /** 表示するカード番号。例: { "26-001": true } */
  allow: Record<string, boolean>;
}

export const DEFAULT_TIMELINE_VISIBILITY: TimelineVisibility = {
  enabled: false,
  allow: {},
};

/** DBから読んだ値を安全な形に整える（欠損・型違いは既定値へ倒す） */
export function normalizeVisibility(
  enabled: boolean | undefined | null,
  allow: Record<string, unknown> | null | undefined
): TimelineVisibility {
  const cleaned: Record<string, boolean> = {};
  if (allow && typeof allow === "object") {
    for (const [accountId, value] of Object.entries(allow)) {
      if (value === true) cleaned[accountId] = true;
    }
  }
  return { enabled: enabled === true, allow: cleaned };
}

/** この書き手の投稿をタイムラインに流すか */
export function isTimelineAuthor(
  accountId: string | undefined,
  visibility: TimelineVisibility = DEFAULT_TIMELINE_VISIBILITY
): boolean {
  const id = (accountId ?? "").trim();
  // 運営の連絡は絞り込みに関係なく流す
  if (id === TIMELINE_ADMIN_ID) return true;
  // 絞り込みを使っていないあいだは全員ぶんを流す
  if (!visibility.enabled) return true;
  if (!id) return false;
  return visibility.allow[id] === true;
}

/** 表示ONになっているカードの枚数（運営は数えない） */
export function countAllowedAccounts(
  visibility: TimelineVisibility = DEFAULT_TIMELINE_VISIBILITY
): number {
  return Object.keys(visibility.allow).filter(
    (id) => id !== TIMELINE_ADMIN_ID && visibility.allow[id] === true
  ).length;
}

/**
 * 絞り込みをONにして良い状態か。
 * 1枚もONになっていないままONにすると、会場のスクリーンに運営の投稿しか出なくなる。
 */
export function canEnableFilter(
  visibility: TimelineVisibility = DEFAULT_TIMELINE_VISIBILITY
): boolean {
  return countAllowedAccounts(visibility) > 0;
}
