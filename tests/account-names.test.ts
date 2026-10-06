import test from "node:test";
import assert from "node:assert/strict";
import {
  ACCOUNT_NAME_MAX,
  applyAccountNames,
  cleanAccountNames,
  normalizeAccountName,
  validateAccountName,
} from "../src/lib/accountNames";
import { getRosterName, setNameOverrides } from "../src/lib/roster";
import type { Post } from "../src/lib/types";

const post = (id: string, accountId: string | undefined, name: string): Post => ({
  id,
  ...(accountId ? { accountId } : {}),
  name,
  text: "",
  createdAt: 1,
});

test("氏名の入力検証 (normalizeAccountName / validateAccountName)", async (t) => {
  await t.test("前後の空白は全角も含めて取り除く", () => {
    assert.equal(normalizeAccountName("  青木　涼　"), "青木　涼");
    assert.equal(normalizeAccountName("　　"), "");
  });

  await t.test("空は不可、上限ちょうどは可、上限超えは不可", () => {
    assert.notEqual(validateAccountName(""), null);
    assert.equal(validateAccountName("あ".repeat(ACCOUNT_NAME_MAX)), null);
    assert.notEqual(validateAccountName("あ".repeat(ACCOUNT_NAME_MAX + 1)), null);
  });
});

test("DBの値の掃除 (cleanAccountNames)", async (t) => {
  await t.test("使える値だけ残し、壊れた値と運営の行は捨てる", () => {
    const cleaned = cleanAccountNames({
      "26-001": "  新しい名前 ",
      "26-002": "",
      "26-003": 123,
      "26-004": "あ".repeat(ACCOUNT_NAME_MAX + 1),
      "26-000": "乗っ取り",
    });
    assert.deepEqual(cleaned, { "26-001": "新しい名前" });
  });

  await t.test("null・文字列など想定外の値は空として扱う", () => {
    assert.deepEqual(cleanAccountNames(null), {});
    assert.deepEqual(cleanAccountNames(undefined), {});
    assert.deepEqual(cleanAccountNames("x"), {});
  });
});

test("投稿への氏名の上書き (applyAccountNames)", async (t) => {
  await t.test("変更がなければ元の配列をそのまま返す", () => {
    const list = [post("a", "26-001", "青木　涼")];
    assert.equal(applyAccountNames(list, {}), list);
  });

  await t.test("カード番号が一致する投稿だけ氏名が変わる", () => {
    const list = [
      post("a", "26-001", "青木　涼"),
      post("b", "26-002", "阿部　広昂"),
      post("c", undefined, "名無し"),
    ];
    const result = applyAccountNames(list, { "26-001": "青木　亮" });
    assert.deepEqual(result.map((p) => p.name), ["青木　亮", "阿部　広昂", "名無し"]);
  });

  await t.test("元の投稿データは書き換えない", () => {
    const original = post("a", "26-001", "青木　涼");
    applyAccountNames([original], { "26-001": "別名" });
    assert.equal(original.name, "青木　涼");
  });

  await t.test("すでに同じ氏名なら同じオブジェクトを返す", () => {
    const p = post("a", "26-001", "青木　亮");
    assert.equal(applyAccountNames([p], { "26-001": "青木　亮" })[0], p);
  });
});

test("名簿の氏名の上書き (getRosterName + setNameOverrides)", async (t) => {
  t.after(() => setNameOverrides({}));

  await t.test("上書きがなければ名簿どおり", () => {
    setNameOverrides({});
    assert.equal(getRosterName("26-001"), "青木　涼");
  });

  await t.test("上書きがあればその氏名になり、他のカードは変わらない", () => {
    setNameOverrides({ "26-001": "青木　亮" });
    assert.equal(getRosterName("26-001"), "青木　亮");
    assert.equal(getRosterName("26-002"), "阿部　広昂");
  });

  await t.test("運営（26-000）は上書きできない", () => {
    setNameOverrides({ "26-000": "乗っ取り" });
    assert.equal(getRosterName("26-000"), "運営");
  });

  await t.test("名簿にないカードも上書きできる", () => {
    setNameOverrides({ "26-999": "臨時の人" });
    assert.equal(getRosterName("26-999"), "臨時の人");
  });

  await t.test("上書きを空にすると名簿の氏名に戻る", () => {
    setNameOverrides({ "26-001": "青木　亮" });
    setNameOverrides({});
    assert.equal(getRosterName("26-001"), "青木　涼");
  });
});
