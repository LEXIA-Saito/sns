import test from "node:test";
import assert from "node:assert/strict";
import {
  xpForPost,
  xpByAccount,
  levelFromXp,
  tierFromLevel,
  XP_TEXT_POST,
  XP_MEDIA_POST,
} from "../src/lib/level";
import type { Post } from "../src/lib/types";

test("XP計算の検証", async (t) => {
  await t.test("テキストのみの投稿は XP_TEXT_POST (10 XP)", () => {
    const post: Pick<Post, "media"> = { media: null };
    assert.equal(xpForPost(post), XP_TEXT_POST);
    assert.equal(xpForPost({ media: undefined }), XP_TEXT_POST);
  });

  await t.test("画像・動画つき投稿は XP_MEDIA_POST (25 XP)", () => {
    const imagePost: Pick<Post, "media"> = {
      media: { type: "image", url: "https://example.com/a.jpg", path: "posts/a.jpg" },
    };
    assert.equal(xpForPost(imagePost), XP_MEDIA_POST);

    const videoPost: Pick<Post, "media"> = {
      media: { type: "video", url: "https://example.com/b.mp4", path: "posts/b.mp4" },
    };
    assert.equal(xpForPost(videoPost), XP_MEDIA_POST);
  });

  await t.test("xpByAccount でアカウントごとの累計XPが集計できる", () => {
    const posts: Post[] = [
      { id: "1", accountId: "26-001", name: "A", text: "t1", media: null, createdAt: 100 },
      {
        id: "2",
        accountId: "26-001",
        name: "A",
        text: "t2",
        media: { type: "image", url: "", path: "" },
        createdAt: 200,
      },
      { id: "3", accountId: "26-002", name: "B", text: "t3", media: null, createdAt: 300 },
    ];
    const map = xpByAccount(posts);
    assert.equal(map["26-001"], 10 + 25);
    assert.equal(map["26-002"], 10);
  });
});

test("レベル進捗・レベルアップ境界の検証", async (t) => {
  await t.test("XP=0 の初期状態は レベル1 (進捗 0%, 次まで 30)", () => {
    const state = levelFromXp(0);
    assert.equal(state.level, 1);
    assert.equal(state.xp, 0);
    assert.equal(state.levelStartXp, 0);
    assert.equal(state.nextLevelXp, 30);
    assert.equal(state.progress, 0);
    assert.equal(state.remaining, 30);
  });

  await t.test("XP=15 は レベル1 (進捗 50%, 次まで 15)", () => {
    const state = levelFromXp(15);
    assert.equal(state.level, 1);
    assert.equal(state.xp, 15);
    assert.equal(state.progress, 0.5);
    assert.equal(state.remaining, 15);
  });

  await t.test("XP=29 は レベル1 (次まで 1)", () => {
    const state = levelFromXp(29);
    assert.equal(state.level, 1);
    assert.equal(state.remaining, 1);
  });

  await t.test("XP=30 で レベル2 にレベルアップ (進捗 0%, 次まで 50)", () => {
    const state = levelFromXp(30);
    assert.equal(state.level, 2);
    assert.equal(state.levelStartXp, 30);
    assert.equal(state.nextLevelXp, 80);
    assert.equal(state.progress, 0);
    assert.equal(state.remaining, 50);
  });

  await t.test("負の値や小数点が安全に処理される", () => {
    const negative = levelFromXp(-10);
    assert.equal(negative.level, 1);
    assert.equal(negative.xp, 0);

    const float = levelFromXp(15.8);
    assert.equal(float.xp, 15);
  });
});

test("レベルごとの段階（Tier）判定の検証", async (t) => {
  await t.test("レベル1〜2 はランク1「芽」", () => {
    assert.deepEqual(tierFromLevel(1), { rank: 1, label: "芽" });
    assert.deepEqual(tierFromLevel(2), { rank: 1, label: "芽" });
  });

  await t.test("レベル3〜4 はランク2「若木」", () => {
    assert.deepEqual(tierFromLevel(3), { rank: 2, label: "若木" });
    assert.deepEqual(tierFromLevel(4), { rank: 2, label: "若木" });
  });

  await t.test("レベル5〜6 はランク3「炎」", () => {
    assert.deepEqual(tierFromLevel(5), { rank: 3, label: "炎" });
    assert.deepEqual(tierFromLevel(6), { rank: 3, label: "炎" });
  });

  await t.test("レベル7〜8 はランク4「星」", () => {
    assert.deepEqual(tierFromLevel(7), { rank: 4, label: "星" });
    assert.deepEqual(tierFromLevel(8), { rank: 4, label: "星" });
  });

  await t.test("レベル9以上 はランク5「冠」", () => {
    assert.deepEqual(tierFromLevel(9), { rank: 5, label: "冠" });
    assert.deepEqual(tierFromLevel(10), { rank: 5, label: "冠" });
    assert.deepEqual(tierFromLevel(20), { rank: 5, label: "冠" });
  });
});
