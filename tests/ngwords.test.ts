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
    "頑張って!!",
    "22人の団結力期待しています。",
    "例会当日楽しみにしています！！",
    "決意表明めちゃくちゃ楽しみにしています",
    "1年間のキセキを皆さんに披露します！！！！",
    "★かならず来てください",
    "",
  ];
  for (const s of samples) {
    assert.equal(checkText(s).level, null, `誤検知: ${s}`);
  }
});

test("卑猥な語は送信させない", () => {
  for (const s of [
    "ちんこ",
    "せっくすしたい",
    "オナニー",
    "強姦",
    "中出し",
    "ペニス",
    "アナル",
    "クンニ",
    "fellatio",
    "vaginal penis",
    "卑猥",
    "強制わいせつ罪",
    "強制猥褻",
    "尻穴ほじり虫",
    "エネマグラ",
    "バイブ",
    "オーラル",
    "おしり",
    "お尻",
  ]) {
    assert.equal(checkText(s).level, "block", `見逃し: ${s}`);
  }
});

test("差別語・強い攻撃は送信させない", () => {
  for (const s of ["お前は死ね", "殺すぞ", "キチガイ", "ガイジかよ", "覚醒剤"]) {
    assert.equal(checkText(s).level, "block", `見逃し: ${s}`);
  }
});

test("表記ゆれ・伏せ字でもすり抜けない", () => {
  for (const s of [
    "チンコ",
    "ち ん こ",
    "ち・ん・こ",
    "ちーんこ",
    "ち*んこ",
    "ＳＥＸ",
    "死　ね",
    "し ね",
    "痴●", // 伏せ字
    "ま○こ",
  ]) {
    assert.equal(checkText(s).level, "block", `すり抜け: ${s}`);
  }
});

test("当て字（読みが同じ漢字）でもすり抜けない", () => {
  for (const s of ["珍子", "セック巣", "尻穴", "おっぱお"]) {
    assert.equal(checkText(s).level, "block", `すり抜け: ${s}`);
  }
});

test("軽い悪態は確認のうえ送信できる", () => {
  for (const s of ["ばかじゃないの", "アホくさい", "うざい", "キモい", "変態だ"]) {
    assert.equal(checkText(s).level, "warn", `判定違い: ${s}`);
  }
});

test("紛らわしい普通の語は止めない", () => {
  // 「ばかり」「音痴」「愚痴」「analysis」など、部分一致で誤爆しやすいもの
  for (const s of [
    "お茶がちんちんに熱い", // 名古屋・西尾の方言
    "音痴ですが歌います",
    "愚痴ではなく前向きな話",
    "分析(analysis)の結果",
    "バイブコーディングの勉強会",
    "データのバイブスが良い",
    "ホモサピエンス",
    "満足しています",
    "調子はどうですか",
  ]) {
    assert.equal(checkText(s).level, null, `誤検知: ${s}`);
  }
});

test("正規化はカタカナ・全角・記号を吸収する", () => {
  assert.equal(normalizeForCheck("バ カ！"), "ばか");
  assert.equal(normalizeForCheck("ＡＢＣ"), "abc");
});
