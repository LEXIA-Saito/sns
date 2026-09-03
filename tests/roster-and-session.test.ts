import test from "node:test";
import assert from "node:assert/strict";
import { getRosterName, ACCOUNT_ROSTER } from "../src/lib/roster";
import { loadProfile, saveProfile, buildSession } from "../src/lib/session";

test("固定名マッピングの検証", async (t) => {
  await t.test("26-000 は「運営」", () => {
    assert.equal(getRosterName("26-000"), "運営");
  });

  await t.test("26-001 は名簿上の「青木　涼」", () => {
    assert.equal(getRosterName("26-001"), "青木　涼");
  });

  await t.test("26-036 は名簿上の「齋藤　雅人」", () => {
    assert.equal(getRosterName("26-036"), "齋藤　雅人");
  });

  await t.test("26-084 は名簿上の「和田　翔」", () => {
    assert.equal(getRosterName("26-084"), "和田　翔");
  });

  await t.test("26-085 は「予備アカウント」", () => {
    assert.equal(getRosterName("26-085"), "予備アカウント");
  });

  await t.test("未知のIDは安全なフォールバック（アカウントID表示）", () => {
    assert.equal(getRosterName("26-999"), "アカウント 26-999");
    assert.equal(getRosterName("custom-card"), "アカウント custom-card");
    assert.equal(getRosterName(""), "ゲスト");
    assert.equal(getRosterName("   "), "ゲスト");
  });

  await t.test("名簿全体の整合性（全86件が登録済み）", () => {
    assert.equal(Object.keys(ACCOUNT_ROSTER).length, 86);
    for (let i = 0; i <= 85; i++) {
      const id = `26-${String(i).padStart(3, "0")}`;
      assert.ok(ACCOUNT_ROSTER[id], `${id} が未定義または空です`);
    }
  });
});

test("localStorageの保存名で固定名を上書きできないことの検証", async (t) => {
  // localStorage モックのセットアップ
  const store = new Map<string, string>();
  const mockLocalStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };

  // Node環境にブラウザオブジェクトを一時モック
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;
  // @ts-expect-error test mock
  globalThis.window = {};
  // @ts-expect-error test mock
  globalThis.localStorage = mockLocalStorage;

  t.after(() => {
    globalThis.window = originalWindow;
    globalThis.localStorage = originalLocalStorage;
  });

  await t.test("過去に任意の氏名が保存されていても、loadProfileは名簿の固定名を返す", () => {
    store.clear();
    // 過去に「悪意のある改ざん名」や「ニックネーム」が保存されていたケースをシミュレート
    store.set(
      "academy26_profile_26-001",
      JSON.stringify({ name: "勝手に変更した偽名", avatarUrl: "https://example.com/avatar1.png" })
    );

    const profile = loadProfile("26-001");
    // 氏名は名簿の「青木　涼」に固定される
    assert.equal(profile.name, "青木　涼");
    // アバター画像URLは保持される
    assert.equal(profile.avatarUrl, "https://example.com/avatar1.png");
  });

  await t.test("saveProfileで別名を渡しても、固定名で保存される", () => {
    store.clear();
    saveProfile("26-085", {
      name: "上書きしようとした名前",
      avatarUrl: "https://example.com/sub.png",
    });

    const profile = loadProfile("26-085");
    assert.equal(profile.name, "予備アカウント");
    assert.equal(profile.avatarUrl, "https://example.com/sub.png");

    const savedRaw = store.get("academy26_profile_26-085");
    assert.ok(savedRaw);
    const parsed = JSON.parse(savedRaw);
    assert.equal(parsed.name, "予備アカウント");
  });

  await t.test("buildSessionでも常に固定名が適用される", () => {
    const session = buildSession("26-001", {
      name: "不正な名前",
      avatarUrl: "https://example.com/avatar.png",
    });
    assert.equal(session.name, "青木　涼");
    assert.equal(session.accountId, "26-001");
    assert.equal(session.avatarUrl, "https://example.com/avatar.png");
  });
});
