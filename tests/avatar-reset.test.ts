import test from "node:test";
import assert from "node:assert/strict";
import { buildAvatarResetUpdates, shouldClearLocalAvatar } from "../src/lib/avatarReset";
import type { Post } from "../src/lib/types";

const posts: Post[] = [
  {
    id: "p1",
    accountId: "26-012",
    name: "山田",
    avatarUrl: "https://example.com/a.jpg",
    text: "こんにちは",
    createdAt: 1,
  },
  { id: "p2", accountId: "26-030", name: "鈴木", avatarUrl: "https://example.com/b.jpg", text: "他人の投稿", createdAt: 4 },
  { id: "p3", accountId: "26-012", name: "山田", text: "アイコンなしの投稿", createdAt: 5 },
];

test("本人の投稿だけアイコンを外す", () => {
  const updates = buildAvatarResetUpdates(posts, "26-012");
  assert.deepEqual(updates, {
    "posts/p1/avatarUrl": null,
  });
});

test("該当がなければ何も変更しない", () => {
  assert.deepEqual(buildAvatarResetUpdates(posts, "26-085"), {});
});

test("初期化より前に保存された端末のアイコンは消す", () => {
  assert.equal(shouldClearLocalAvatar(1000, 2000), true);
  assert.equal(shouldClearLocalAvatar(undefined, 2000), true);
});

test("初期化のあとに本人が入れ直したアイコンは消さない", () => {
  assert.equal(shouldClearLocalAvatar(3000, 2000), false);
});

test("初期化されていなければ消さない", () => {
  assert.equal(shouldClearLocalAvatar(1000, undefined), false);
});

// --- タイムラインの絞り込み -------------------------------------------
import { filterTimelinePosts, filterProjectorPosts } from "../src/lib/moderation";
import {
  DEFAULT_TIMELINE_VISIBILITY,
  canEnableFilter,
  countAllowedAccounts,
  isTimelineAuthor,
  normalizeVisibility,
} from "../src/lib/timelineVisibility";

const timeline: Post[] = [
  { id: "a1", accountId: "26-001", name: "表示ON", text: "表示ONの投稿", createdAt: 1 },
  { id: "l1", accountId: "26-050", name: "表示OFF", text: "表示OFFの投稿", createdAt: 2 },
  { id: "l2", accountId: "26-060", name: "表示OFF2", text: "別の表示OFFの投稿", createdAt: 3 },
];

/** 運営が 26-001 だけ表示ONにして絞り込みを有効にした状態 */
const onlyFirst = normalizeVisibility(true, { "26-001": true });

test("絞り込みOFFのあいだは全員の投稿が流れる（導入前と同じ）", () => {
  assert.equal(DEFAULT_TIMELINE_VISIBILITY.enabled, false);
  assert.equal(isTimelineAuthor("26-050", DEFAULT_TIMELINE_VISIBILITY), true);
  assert.equal(filterTimelinePosts(timeline, "26-050").length, 3);
});

test("絞り込みONなら表示ONの投稿と自分の投稿だけになる", () => {
  const forHidden = filterTimelinePosts(timeline, "26-050", false, onlyFirst);
  assert.deepEqual(forHidden.map((p) => p.id), ["a1", "l1"]);

  const forShown = filterTimelinePosts(timeline, "26-001", false, onlyFirst);
  assert.deepEqual(forShown.map((p) => p.id), ["a1"]);

  // 運営は全部見える
  assert.equal(filterTimelinePosts(timeline, "26-000", true, onlyFirst).length, 3);
});

test("運営の投稿は表示ONにしていなくても流れる", () => {
  const withAdmin: Post[] = [
    ...timeline,
    { id: "adm", accountId: "26-000", name: "運営", text: "運営からの連絡", createdAt: 9 },
  ];
  assert.deepEqual(
    filterTimelinePosts(withAdmin, "26-050", false, onlyFirst).map((p) => p.id),
    ["a1", "l1", "adm"]
  );
});

test("投影画面には『自分の投稿だから見える』の逃げ道がない", () => {
  // タイムラインでは自分の l1 が見えるが、投影には出ない
  assert.deepEqual(
    filterProjectorPosts(timeline, onlyFirst).map((p) => p.id),
    ["a1"]
  );
  // 絞り込みOFFなら全部映る
  assert.equal(filterProjectorPosts(timeline).length, 3);
});

test("非表示モデレーションは絞り込みより優先される", () => {
  const withHidden: Post[] = [
    { ...timeline[0], moderation: { hidden: true } },
    timeline[1],
  ];
  assert.deepEqual(filterProjectorPosts(withHidden, onlyFirst).map((p) => p.id), []);
});

test("DBの値が壊れていても既定値に倒れる", () => {
  const v = normalizeVisibility(undefined, { "26-001": "yes", "26-002": true } as never);
  assert.equal(v.enabled, false);
  assert.deepEqual(Object.keys(v.allow), ["26-002"]);
});

test("表示ONの枚数を数える／0枚ならONにさせない", () => {
  assert.equal(countAllowedAccounts(onlyFirst), 1);
  assert.equal(canEnableFilter(onlyFirst), true);

  const empty = normalizeVisibility(true, {});
  assert.equal(countAllowedAccounts(empty), 0);
  assert.equal(canEnableFilter(empty), false);

  // 運営ぶんは枚数に数えない
  const adminOnly = normalizeVisibility(true, { "26-000": true });
  assert.equal(countAllowedAccounts(adminOnly), 0);
  assert.equal(canEnableFilter(adminOnly), false);
});
