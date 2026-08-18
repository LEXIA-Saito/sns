#!/usr/bin/env node
/**
 * out/accounts.csv のカード情報を Firebase Authentication に登録する。
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json \
 *     node scripts/provision-auth-users.mjs --project jc26-7dfdc
 *
 *   確認だけしたいときは --dry-run を付ける。
 *
 * uid はカード番号そのもの（26-001）。データベースのルールが uid で所有者を判定するため、
 * ここを変えると投稿の編集・削除ができなくなる。
 *
 * 既に同じ uid がある場合はパスワードを更新する（カードを刷り直したとき用）。
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EMAIL_DOMAIN = "sns26.local";

function parseArgs(argv) {
  const args = { project: process.env.FIREBASE_PROJECT_ID || "jc26-7dfdc", dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const [key, inline] = argv[i].split("=");
    if (key === "--project") args.project = inline ?? argv[i + 1];
    else if (key === "--dry-run") args.dryRun = true;
  }
  return args;
}

function readAccounts() {
  const csv = readFileSync(resolve(ROOT, "out/accounts.csv"), "utf8").trim();
  const [, ...lines] = csv.split("\n");
  return lines.map((line) => {
    const [serial, id, password, , 用途] = line.split(",");
    return { serial, id, password, admin: 用途 === "運営用" };
  });
}

function credential() {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyPath && keyPath.endsWith(".json")) {
    return cert(JSON.parse(readFileSync(keyPath, "utf8")));
  }
  // gcloud のアプリケーションデフォルト認証情報を使う
  return applicationDefault();
}

async function main() {
  const { project, dryRun } = parseArgs(process.argv.slice(2));
  const accounts = readAccounts();

  console.log(`対象: ${accounts.length}件（プロジェクト ${project}）`);
  if (dryRun) {
    for (const a of accounts.slice(0, 3)) {
      console.log(`  ${a.id} -> ${a.id}@${EMAIL_DOMAIN}${a.admin ? "（運営用）" : ""}`);
    }
    console.log("  … --dry-run のため登録は行いません");
    return;
  }

  initializeApp({ credential: credential(), projectId: project });
  const auth = getAuth();

  let created = 0;
  let updated = 0;
  for (const account of accounts) {
    const payload = {
      uid: account.id,
      email: `${account.id}@${EMAIL_DOMAIN}`,
      emailVerified: true,
      password: account.password,
      displayName: account.admin ? `運営 ${account.id}` : `カード ${account.id}`,
      disabled: false,
    };
    try {
      await auth.createUser(payload);
      created += 1;
    } catch (error) {
      if (error?.code === "auth/uid-already-exists" || error?.code === "auth/email-already-exists") {
        const { uid, ...rest } = payload;
        await auth.updateUser(account.id, rest);
        updated += 1;
      } else {
        console.error(`失敗 ${account.id}:`, error?.message ?? error);
        throw error;
      }
    }
  }

  console.log(`完了: 新規 ${created}件 / 更新 ${updated}件`);
  console.log("運営用カードは 26-000。データベースのルールでも同じIDを管理者として扱っている。");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
