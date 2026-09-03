import test from "node:test";
import assert from "node:assert/strict";
import {
  canCreatePost,
  canCreateComment,
  formatJstDateTime,
  toJstDateTimeLocal,
  parseJstDateTimeLocal,
} from "../src/lib/settings";
import {
  isPostVisible,
  isCommentVisible,
  filterVisiblePosts,
  filterVisibleComments,
} from "../src/lib/moderation";
import {
  buildAccountProgressList,
  generateProgressCsv,
} from "../src/lib/progress";
import { formatPhotoFileName, createZipArchive } from "../src/lib/zip";
import { countLikes, hasUserLiked } from "../src/lib/likes";
import type { Post, Comment, AppSettings, AccountActivity } from "../src/lib/types";

test("受付状態・締切判定の検証 (canCreatePost / canCreateComment)", async (t) => {
  const baseTime = 1000000;
  const deadline = 1000000;

  await t.test("settingsが未設定(null/undefined)の旧環境では受付中", () => {
    assert.equal(canCreatePost(null, baseTime, false).allowed, true);
    assert.equal(canCreatePost(undefined, baseTime, false).allowed, true);
    assert.equal(canCreateComment(null, baseTime, false).allowed, true);
  });

  await t.test("スイッチOFF時は一般メンバーは投稿・コメント不可", () => {
    const postOff: AppSettings = { postAccepting: false };
    const commentOff: AppSettings = { commentAccepting: false };

    assert.equal(canCreatePost(postOff, baseTime, false).allowed, false);
    assert.match(canCreatePost(postOff, baseTime, false).reason || "", /一時停止/);

    assert.equal(canCreateComment(commentOff, baseTime, false).allowed, false);
    assert.match(canCreateComment(commentOff, baseTime, false).reason || "", /一時停止/);
  });

  await t.test("締切日時前の境界値では受付中", () => {
    const st: AppSettings = { postDeadline: deadline, commentDeadline: deadline };
    assert.equal(canCreatePost(st, deadline - 1, false).allowed, true);
    assert.equal(canCreateComment(st, deadline - 1, false).allowed, true);
  });

  await t.test("締切日時ちょうど、および締切超過後は一般メンバー不可", () => {
    const st: AppSettings = { postDeadline: deadline, commentDeadline: deadline };
    assert.equal(canCreatePost(st, deadline, false).allowed, false);
    assert.equal(canCreatePost(st, deadline + 1, false).allowed, false);
    assert.equal(canCreatePost(st, deadline, false).isDeadlinePassed, true);

    assert.equal(canCreateComment(st, deadline, false).allowed, false);
    assert.equal(canCreateComment(st, deadline + 1, false).allowed, false);
  });

  await t.test("管理者 (isAdmin=true) はスイッチOFFや締切超過でも常に許可（バイパス）", () => {
    const bothBlocked: AppSettings = {
      postAccepting: false,
      commentAccepting: false,
      postDeadline: deadline - 1000,
      commentDeadline: deadline - 1000,
    };
    assert.equal(canCreatePost(bothBlocked, deadline, true).allowed, true);
    assert.equal(canCreateComment(bothBlocked, deadline, true).allowed, true);
  });
});

test("日時フォーマットおよびJST変換の検証", async (t) => {
  await t.test("JSTの日時が正しく文字列フォーマットされる", () => {
    // 2026-10-12 23:59:00 JST -> UTC 14:59:00
    const time = new Date("2026-10-12T23:59:00+09:00").getTime();
    assert.equal(formatJstDateTime(time), "2026/10/12 23:59");
    assert.equal(toJstDateTimeLocal(time), "2026-10-12T23:59");
  });

  await t.test("datetime-localのJST入力文字列を正しくUnixミリ秒に復元できる", () => {
    const iso = "2026-10-12T23:59";
    const parsed = parseJstDateTimeLocal(iso);
    assert.ok(parsed !== null);
    assert.equal(formatJstDateTime(parsed), "2026/10/12 23:59");
  });
});

test("モデレーションと表示判定の検証 (isPostVisible / isCommentVisible)", async (t) => {
  const normalPost: Post = { id: "p1", name: "User", text: "hello", createdAt: 100 };
  const hiddenPost: Post = {
    id: "p2",
    name: "User2",
    text: "bad",
    createdAt: 200,
    moderation: { hidden: true, reason: "テスト" },
  };
  const restoredPost: Post = {
    id: "p3",
    name: "User3",
    text: "ok",
    createdAt: 300,
    moderation: { hidden: false },
  };

  await t.test("moderationが無い旧データやhidden=falseは公開判定", () => {
    assert.equal(isPostVisible(normalPost), true);
    assert.equal(isPostVisible(restoredPost), true);
    assert.equal(isPostVisible(hiddenPost), false);
  });

  await t.test("filterVisiblePostsで非表示投稿のみが除外される", () => {
    const list = [normalPost, hiddenPost, restoredPost];
    const filtered = filterVisiblePosts(list);
    assert.equal(filtered.length, 2);
    assert.deepEqual(filtered.map((p) => p.id), ["p1", "p3"]);
  });

  await t.test("コメントの非表示フィルタリングも同様に動作する", () => {
    const comments: Comment[] = [
      { id: "c1", name: "A", text: "t1", createdAt: 10 },
      { id: "c2", name: "B", text: "t2", createdAt: 20, moderation: { hidden: true } },
    ];
    assert.equal(isCommentVisible(comments[0]), true);
    assert.equal(isCommentVisible(comments[1]), false);
    assert.equal(filterVisibleComments(comments).length, 1);
  });
});

test("アカウント進捗集計とCSV出力の検証", async (t) => {
  const posts: Post[] = [
    {
      id: "p1",
      accountId: "26-001",
      name: "青木　涼",
      text: "初投稿",
      media: { type: "image", url: "https://example.com/1.jpg" },
      createdAt: 100,
      comments: {
        c1: { id: "c1", accountId: "26-002", name: "赤松", text: "いいね", createdAt: 110 },
      },
    },
    {
      id: "p2",
      accountId: "26-001",
      name: "青木　涼",
      text: "2回目（非表示）",
      createdAt: 200,
      moderation: { hidden: true },
    },
  ];

  const activities: Record<string, AccountActivity> = {
    "26-001": { lastLoginAt: 1790000000000 },
  };

  const progress = buildAccountProgressList(posts, activities, false);

  await t.test("26-001〜26-085の固定85件が生成される", () => {
    assert.equal(progress.length, 85);
    assert.equal(progress[0].accountId, "26-001");
    assert.equal(progress[84].accountId, "26-085");
  });

  await t.test("実績（非表示含む投稿数、写真投稿数、コメント数）が集計される", () => {
    const user1 = progress.find((p) => p.accountId === "26-001");
    assert.ok(user1);
    assert.equal(user1.isLoggedIn, true);
    assert.equal(user1.postCount, 2); // 非表示含む
    assert.equal(user1.imagePostCount, 1);
    assert.equal(user1.hiddenPostCount, 1);
    assert.equal(user1.hasPosted, true);
    assert.equal(user1.hasImagePosted, true);

    const user2 = progress.find((p) => p.accountId === "26-002");
    assert.ok(user2);
    assert.equal(user2.isLoggedIn, false);
    assert.equal(user2.commentCount, 1);
    assert.equal(user2.hasCommented, true);
  });

  await t.test("CSV出力がBOM付きUTF-8かつ正しいヘッダーを持つ", () => {
    const csv = generateProgressCsv(progress.slice(0, 2));
    assert.ok(csv.startsWith("\uFEFF")); // UTF-8 BOM
    assert.ok(csv.includes("アカウントID,氏名"));
    assert.ok(csv.includes("26-001,青木　涼"));
  });
});

test("写真ダウンロード用ファイル名整形とZIPアーカイブの検証", async (t) => {
  await t.test("ファイル名が accountId_氏名_YYYYMMDD-HHmm_連番.拡張子 にフォーマットされる", () => {
    const time = new Date("2026-10-10T14:30:00+09:00").getTime();
    const name = formatPhotoFileName("26-036", "齋藤　雅人", time, 1, "https://example.com/photo.jpeg?alt=media");
    assert.equal(name, "26-036_齋藤雅人_20261010-1430_01.jpg");
  });

  await t.test("外部npmなしでStore形式のZIPバイナリが生成できる", () => {
    const encoder = new TextEncoder();
    const zipBytes = createZipArchive([
      { name: "test1.txt", data: encoder.encode("Hello World") },
      { name: "test2.txt", data: encoder.encode("Second File") },
    ]);
    assert.ok(zipBytes.length > 50);
    // ZIPマジックヘッダー PK\x03\x04 (0x50, 0x4b, 0x03, 0x04)
    assert.equal(zipBytes[0], 0x50);
    assert.equal(zipBytes[1], 0x4b);
    assert.equal(zipBytes[2], 0x03);
    assert.equal(zipBytes[3], 0x04);
  });
});

test("いいね機能の純粋判定 (countLikes / hasUserLiked)", async (t) => {
  const likesNode = {
    "26-001": true,
    "26-002": true,
    "26-003": false,
  };

  await t.test("countLikes でtrueの個数のみ集計される", () => {
    assert.equal(countLikes(likesNode), 2);
    assert.equal(countLikes(null), 0);
    assert.equal(countLikes(undefined), 0);
  });

  await t.test("hasUserLiked で指定アカウントのいいね状態が正しく判定される", () => {
    assert.equal(hasUserLiked(likesNode, "26-001"), true);
    assert.equal(hasUserLiked(likesNode, "26-003"), false);
    assert.equal(hasUserLiked(likesNode, "26-999"), false);
    assert.equal(hasUserLiked(likesNode, null), false);
  });
});

test("投稿ガイドラインの厳格検証 (DEFAULT_POST_GUIDE_LINES)", async (t) => {
  const { DEFAULT_POST_GUIDE_LINES, DEFAULT_POST_GUIDE_NOTICE } = await import("../src/lib/settings");

  await t.test("ガイドラインが指定の3項目と完全に一致する", () => {
    assert.equal(DEFAULT_POST_GUIDE_LINES.length, 3);
    assert.equal(DEFAULT_POST_GUIDE_LINES[0], "本気でやってみようと思えたきっかけ");
    assert.equal(DEFAULT_POST_GUIDE_LINES[1], "今も続けられている理由");
    assert.equal(DEFAULT_POST_GUIDE_LINES[2], "当時の写真");
  });

  await t.test("締切案内文の規定値が一致する", () => {
    assert.equal(DEFAULT_POST_GUIDE_NOTICE, "写真付き投稿は10月12日まで");
  });
});

test("database.rules.json のセキュリティ静的リグレッションテスト", async (t) => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const rulesPath = path.resolve(process.cwd(), "database.rules.json");
  const rulesJson = JSON.parse(fs.readFileSync(rulesPath, "utf-8"));
  const postsRule = rulesJson.rules.posts["$postId"];
  const commentsRule = postsRule.comments["$commentId"];

  await t.test("posts/$postId の親.write が create または whole-post delete のみに制限されている", () => {
    const writeRule = postsRule[".write"];
    assert.ok(typeof writeRule === "string");
    // 更新時のカスケードを防ぐため、!newData.exists() が含まれていること
    assert.ok(writeRule.includes("!data.exists()"), "createの条件が含まれている");
    assert.ok(writeRule.includes("!newData.exists()"), "deleteの条件が含まれている");
    assert.ok(!writeRule.includes(": (data.child('accountId').val() === auth.uid || auth.uid === '26-000'))"), "更新時の無条件許可が存在しない");
  });

  await t.test("posts/$postId/text および updatedAt に個別の.write ルールが分離配置されている", () => {
    assert.ok(postsRule.text[".write"], "textに.writeが定義されている");
    assert.ok(postsRule.text[".write"].includes("data.parent().child('accountId').val() === auth.uid"));
    assert.ok(postsRule.text[".write"].includes("auth.uid === '26-000'"));

    assert.ok(postsRule.updatedAt[".write"], "updatedAtに.writeが定義されている");
    assert.ok(postsRule.updatedAt[".write"].includes("data.parent().child('accountId').val() === auth.uid"));
    assert.ok(postsRule.updatedAt[".write"].includes("auth.uid === '26-000'"));
  });

  await t.test("posts/$postId/moderation の.write は 26-000 のみ許可されている", () => {
    assert.ok(postsRule.moderation[".write"]);
    assert.ok(postsRule.moderation[".write"].includes("auth.uid === '26-000'"));
    assert.ok(!postsRule.moderation[".write"].includes("data.child"));
  });

  await t.test("comments/$commentId の親.write が create または whole-comment delete のみに制限されている", () => {
    const writeRule = commentsRule[".write"];
    assert.ok(typeof writeRule === "string");
    assert.ok(writeRule.includes("!data.exists()"), "createの条件が含まれている");
    assert.ok(writeRule.includes("!newData.exists()"), "deleteの条件が含まれている");
    // コメント作者のみ削除可能（投稿作者が他人のコメントを改ざん・削除できない）
    assert.ok(writeRule.includes("data.child('accountId').val() === auth.uid"));
  });

  await t.test("comments/$commentId/moderation の.write は 26-000 のみ許可されている", () => {
    assert.ok(commentsRule.moderation[".write"]);
    assert.ok(commentsRule.moderation[".write"].includes("auth.uid === '26-000'"));
  });

  await t.test("likes/$postId/$accountId の.write が単項!ではなくval() !== trueでFirebase互換に記述されている", () => {
    const likesRule = rulesJson.rules.likes["$postId"]["$accountId"];
    const writeRule = likesRule[".write"];
    assert.ok(typeof writeRule === "string");
    // 単項 ! によるコンパイルエラー（! only operates on booleans）の防止
    assert.ok(!writeRule.includes("!root.child"), "val()に対する単項!が存在しないこと");
    // 正確なFirebase互換表現が含まれていること
    assert.ok(writeRule.includes("root.child('posts').child($postId).child('moderation/hidden').val() !== true"));
    assert.ok(writeRule.includes("auth.uid === $accountId"));
    assert.ok(writeRule.includes("auth.uid === '26-000'"));
  });
});
