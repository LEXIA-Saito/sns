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
import { filterTimelinePosts } from "../src/lib/moderation";
import { ACADEMY_ACCOUNT_IDS, isAcademyMember } from "../src/lib/roster";

const timeline: Post[] = [
  { id: "a1", accountId: "26-001", name: "アカデミー", text: "アカデミーの投稿", createdAt: 1 },
  { id: "l1", accountId: "26-050", name: "ＬＯＭ", text: "ＬＯＭの投稿", createdAt: 2 },
  { id: "l2", accountId: "26-060", name: "ＬＯＭ2", text: "別のＬＯＭの投稿", createdAt: 3 },
];

test("名簿が未設定のうちは全員の投稿が流れる（従来どおり）", () => {
  assert.equal(ACADEMY_ACCOUNT_IDS.length, 0);
  assert.equal(isAcademyMember("26-050"), true);
  assert.equal(filterTimelinePosts(timeline, "26-050").length, 3);
});

test("名簿があるとアカデミーの投稿と自分の投稿だけになる", () => {
  ACADEMY_ACCOUNT_IDS.push("26-001");
  try {
    const forLom = filterTimelinePosts(timeline, "26-050");
    assert.deepEqual(forLom.map((p) => p.id), ["a1", "l1"]);

    const forAcademy = filterTimelinePosts(timeline, "26-001");
    assert.deepEqual(forAcademy.map((p) => p.id), ["a1"]);

    // 運営は全部見える
    assert.equal(filterTimelinePosts(timeline, "26-000", true).length, 3);
  } finally {
    ACADEMY_ACCOUNT_IDS.length = 0;
  }
});

test("運営の投稿は名簿になくてもタイムラインに流れる", () => {
  ACADEMY_ACCOUNT_IDS.push("26-001");
  try {
    const withAdmin: Post[] = [
      ...timeline,
      { id: "adm", accountId: "26-000", name: "運営", text: "運営からの連絡", createdAt: 9 },
    ];
    // ＬＯＭメンバーから見て、アカデミー・運営・自分の投稿が見える
    assert.deepEqual(
      filterTimelinePosts(withAdmin, "26-050").map((p) => p.id),
      ["a1", "l1", "adm"]
    );
  } finally {
    ACADEMY_ACCOUNT_IDS.length = 0;
  }
});
