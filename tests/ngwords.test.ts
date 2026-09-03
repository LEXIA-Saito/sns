import { test } from "node:test";
import assert from "node:assert/strict";
import { checkText, normalizeForCheck } from "../src/lib/ngwords";

test("普通の投稿は通る", () => {
  const samples = [
    "今日の例会、すごく良かったです！",
    "みんなで作り上げたステージ、感動しました。",
    "準備ばかりで大変でしたが、やって良かったです。",
    "ラーメン食べて帰ります",
    "この一年、失敗ばかりだったけど成長できた",
    "",
  ];
  for (const s of samples) {
    assert.equal(checkText(s).level, null, `誤検知: ${s}`);
  }
});

test("卑猥な語は送信させない", () => {
  for (const s of ["ちんこ", "せっくすしたい", "オナニー", "強姦", "中出し"]) {
    assert.equal(checkText(s).level, "block", `見逃し: ${s}`);
  }
});

test("差別語・強い攻撃は送信させない", () => {
  for (const s of ["お前は死ね", "殺すぞ", "キチガイ", "ガイジかよ"]) {
    assert.equal(checkText(s).level, "block", `見逃し: ${s}`);
  }
});

test("表記ゆれ・伏せ字でもすり抜けない", () => {
  for (const s of ["チンコ", "ち ん こ", "ち・ん・こ", "ちーんこ", "ち*んこ", "ＳＥＸ", "死　ね", "し ね"]) {
    assert.equal(checkText(s).level, "block", `すり抜け: ${s}`);
  }
});

test("軽い悪態は確認のうえ送信できる", () => {
  for (const s of ["ばかじゃないの", "アホくさい", "うざい", "キモい"]) {
    assert.equal(checkText(s).level, "warn", `判定違い: ${s}`);
  }
});

test("名古屋・西尾の「ちんちん」は止めない", () => {
  // 「ちんちんに熱い」の意味で使われる方言
  assert.equal(checkText("お茶がちんちんに熱い").level, null);
});

test("正規化はカタカナ・全角・記号を吸収する", () => {
  assert.equal(normalizeForCheck("バ カ！"), "ばか");
  assert.equal(normalizeForCheck("ＡＢＣ"), "abc");
});
