#!/usr/bin/env node
/**
 * アカウントカード用の「ログインID・パスワード」を発行する。
 *
 *   node scripts/generate-accounts.mjs --count 85 --base https://sns26.vercel.app
 *
 * 出力は2つ。
 *   src/lib/account-hashes.json … アプリが照合に使うハッシュ（コミットする。平文パスワードは入らない）
 *   out/accounts.csv            … カード印刷用のID・パスワード・QR URL（gitignore。配布前に紛失しないこと）
 *
 * 予備カードは「原本のコピー」運用（委員長判断）のため、予備セット分のIDは発行しない。
 */
import { createHash, randomInt } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// 紛らわしい文字（0 O 1 I など）を除いた32文字
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PASSWORD_LENGTH = 6;

function parseArgs(argv) {
  const args = { count: 85, base: "https://sns26.vercel.app", prefix: "26" };
  for (let i = 0; i < argv.length; i += 1) {
    const [key, inline] = argv[i].split("=");
    const value = inline ?? argv[i + 1];
    if (key === "--count") args.count = Number(value);
    else if (key === "--base") args.base = String(value).replace(/\/$/, "");
    else if (key === "--prefix") args.prefix = String(value);
  }
  return args;
}

function makePassword() {
  let out = "";
  for (let i = 0; i < PASSWORD_LENGTH; i += 1) {
    out += ALPHABET[randomInt(ALPHABET.length)];
  }
  return out;
}

export function hashCredentials(id, password) {
  return createHash("sha256").update(`${id}:${password}`).digest("hex");
}

function main() {
  const { count, base, prefix } = parseArgs(process.argv.slice(2));
  if (!Number.isInteger(count) || count < 1 || count > 999) {
    throw new Error("--count は 1〜999 で指定してください");
  }

  const rows = [];
  // 000 は運営用（投稿の編集・削除ができる管理アカウント）
  const ids = ["000", ...Array.from({ length: count }, (_, i) => String(i + 1).padStart(3, "0"))];

  for (const serial of ids) {
    const id = `${prefix}-${serial}`;
    const password = makePassword();
    rows.push({
      id,
      password,
      admin: serial === "000",
      hash: hashCredentials(id, password),
      url: `${base}/?id=${id}&k=${password}`,
    });
  }

  const hashesPath = resolve(ROOT, "src/lib/account-hashes.json");
  writeFileSync(
    hashesPath,
    `${JSON.stringify(
      {
        version: 1,
        note: "アカウントカードのID/パスワード照合用ハッシュ。scripts/generate-accounts.mjs で再生成できる",
        accounts: rows.map(({ id, hash, admin }) => (admin ? { id, hash, admin } : { id, hash })),
      },
      null,
      2
    )}\n`
  );

  const csvPath = resolve(ROOT, "out/accounts.csv");
  mkdirSync(dirname(csvPath), { recursive: true });
  const csv = [
    "通し番号,ログインID,パスワード,QR用URL,用途",
    ...rows.map((r) => `${r.id.split("-")[1]},${r.id},${r.password},${r.url},${r.admin ? "運営用" : "参加者"}`),
  ].join("\n");
  writeFileSync(csvPath, `${csv}\n`);

  console.log(`発行: 参加者${count}件 + 運営用1件`);
  console.log(`  照合用ハッシュ: ${hashesPath}`);
  console.log(`  カード印刷用CSV: ${csvPath}（gitignore対象。取り扱い注意）`);
}

main();
