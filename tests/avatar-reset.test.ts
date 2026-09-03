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
