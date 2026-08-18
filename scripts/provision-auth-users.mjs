#!/usr/bin/env node
/**
 * out/accounts.csv のカード情報を Firebase Authentication に登録する。
 *
 *   node scripts/provision-auth-users.mjs --project jc26-7dfdc
 *   node scripts/provision-auth-users.mjs --dry-run
 *
 * 認証情報は次の順に探す（追加パッケージは不要）。
 *   1. GOOGLE_APPLICATION_CREDENTIALS のサービスアカウントJSON
 *   2. gcloud のアプリケーションデフォルト認証情報
 *      （~/.config/gcloud/application_default_credentials.json）
 *
 * uid はカード番号そのもの（26-001）。データベースのルールが uid で所有者を判定するため、
 * ここを変えると投稿の編集・削除ができなくなる。
 * 既に同じ uid がある場合はパスワードを更新する（カードを刷り直したとき用）。
 */
import { createSign } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EMAIL_DOMAIN = "sns26.local";
const SCOPE = "https://www.googleapis.com/auth/cloud-platform";

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

const base64url = (input) =>
  Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** サービスアカウントの秘密鍵で署名したJWTをアクセストークンに交換する */
async function tokenFromServiceAccount(key) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: key.client_email,
      scope: SCOPE,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const signature = base64url(signer.sign(key.private_key));

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: `${header}.${claim}.${signature}`,
  });
  const res = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body });
  const json = await res.json();
  if (!json.access_token) throw new Error(`トークン取得に失敗: ${JSON.stringify(json)}`);
  return { token: json.access_token, needsQuotaProject: false };
}

/** gcloud のユーザー認証情報（ADC）をアクセストークンに交換する */
async function tokenFromUserCredentials(cred) {
  const body = new URLSearchParams({
    client_id: cred.client_id,
    client_secret: cred.client_secret,
    refresh_token: cred.refresh_token,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body });
  const json = await res.json();
  if (!json.access_token) throw new Error(`トークン取得に失敗: ${JSON.stringify(json)}`);
  // ユーザー認証情報の場合、Identity Toolkit は課金プロジェクトの指定を要求する
  return { token: json.access_token, needsQuotaProject: true };
}

async function getAccessToken() {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyPath && existsSync(keyPath)) {
    const key = JSON.parse(readFileSync(keyPath, "utf8"));
    if (key.type === "service_account") return tokenFromServiceAccount(key);
    if (key.type === "authorized_user") return tokenFromUserCredentials(key);
  }
  const adcPath = resolve(homedir(), ".config/gcloud/application_default_credentials.json");
  if (existsSync(adcPath)) {
    return tokenFromUserCredentials(JSON.parse(readFileSync(adcPath, "utf8")));
  }
  throw new Error(
    "認証情報が見つかりません。サービスアカウントJSONを GOOGLE_APPLICATION_CREDENTIALS に指定するか、" +
      "gcloud auth application-default login を実行してください。"
  );
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

  const { token, needsQuotaProject } = await getAccessToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...(needsQuotaProject ? { "x-goog-user-project": project } : {}),
  };
  const endpoint = `https://identitytoolkit.googleapis.com/v1/projects/${project}/accounts`;

  let created = 0;
  let updated = 0;
  for (const account of accounts) {
    const payload = {
      localId: account.id,
      email: `${account.id}@${EMAIL_DOMAIN}`,
      password: account.password,
      displayName: account.admin ? `運営 ${account.id}` : `カード ${account.id}`,
      emailVerified: true,
    };

    let res = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(payload) });
    if (res.ok) {
      created += 1;
      continue;
    }

    const error = await res.json().catch(() => ({}));
    const message = error?.error?.message ?? "";
    if (message.includes("EMAIL_EXISTS") || message.includes("DUPLICATE_LOCAL_ID")) {
      res = await fetch(`${endpoint}:update`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e2 = await res.text();
        throw new Error(`更新に失敗 ${account.id}: ${e2.slice(0, 300)}`);
      }
      updated += 1;
      continue;
    }
    throw new Error(`登録に失敗 ${account.id}: ${message || (await res.text()).slice(0, 300)}`);
  }

  console.log(`完了: 新規 ${created}件 / 更新 ${updated}件`);
  console.log("運営用カードは 26-000。データベースのルールでも同じIDを管理者として扱っている。");
}

main().catch((error) => {
  console.error(String(error.message ?? error));
  process.exit(1);
});
