# 26アカデミー 例会SNS

26アカデミーの例会で使用する専用SNSアプリです。PR動画・画像・意気込みをアカデミーメンバーが投稿し、LOMメンバーからは思い出や激励コメントをリアルタイムで投稿できます。例会中に参加者がその場でコメントを投稿できます。

## プロジェクト概要

- **名称**: 26アカデミー 例会SNS
- **目的**: 例会をリアルタイムで盛り上げる投稿・コメント共有プラットフォーム
- **メイン利用環境**: スマートフォン(PCにも対応)

## 主な機能

- ✅ **アカウントカードでログイン** — 配布カード記載のログインID・パスワードで入場
  - カードのQRコード(`/?id=26-001&k=XXXXXX`)から開くと自動ログイン
  - 一度ログインすればその端末では入力不要(9/8配布 〜 10/19本番の携帯期間を想定)
- ✅ **プロフィール** — 表示名・立場(アカデミー / LOM)・アバター画像
- ✅ **投稿機能** — テキストメッセージ + 画像・動画の添付(最大50MB)
- ✅ **リアルタイム表示** — Firebase Realtime Database で全端末に即時反映
- ✅ **コメント機能** — 各投稿に激励コメントを投稿
- ✅ **本人のみ編集・削除** — 投稿にログインIDが紐づく。運営用アカウント(`26-000`)は全投稿を操作可
- ✅ **レスポンシブ対応** — スマホ最適化 + PC対応
- ✅ **テーマ差し替え** — 配色は `src/app/theme.css` の1ファイルで切り替え
- ✅ **Lucideアイコン** 使用

## 機能エントリ(URL)

| パス | 説明 |
|------|------|
| `/` | メインフィード(投稿一覧・投稿フォーム・コメント) |

## 技術スタック

- **フレームワーク**: Next.js 14 (App Router) + TypeScript
- **データベース**: Firebase Realtime Database
- **ファイルストレージ**: Firebase Storage(画像・動画本体)
- **スタイリング**: Tailwind CSS(モノトーン基調)
- **アイコン**: lucide-react
- **デプロイ先**: Vercel

## データ構造

Firebase Realtime Database のスキーマ:

```
posts/
  <postId>/
    accountId: string     # 投稿者のログインID(カード番号)
    name: string          # 投稿者名
    role: "academy" | "lom"  # 立場
    text: string          # メッセージ
    media: {              # 添付メディア(任意)
      type: "image" | "video"
      url: string         # Storage上のダウンロードURL
      path: string        # Storage上のパス
    } | null
    createdAt: number     # サーバータイムスタンプ
    comments/
      <commentId>/
        accountId: string
        name: string
        text: string
        createdAt: number
```

メディアファイルは Firebase Storage の `posts/` 配下に保存されます。

## アカウントカードのID・パスワード発行

参加者に配るカード(85枚 + 予備2セット)のログイン情報はスクリプトで発行する。

```bash
npm run accounts -- --count 85 --base https://sns26.vercel.app
```

出力は2つ。

| ファイル | 内容 | 扱い |
|---|---|---|
| `src/lib/account-hashes.json` | 照合用のハッシュのみ | **コミットする**(平文パスワードは入らない) |
| `out/accounts.csv` | ログインID・パスワード・QR用URL | **gitignore対象**。カード印刷の入稿データ。紛失注意 |

- ID は `26-001` 〜 `26-085`。`26-000` は運営用(全投稿の編集・削除が可能)
- パスワードは紛らわしい文字(`0` `O` `1` `I`)を除いた6文字
- 予備カードは「原本のコピー」運用のため、予備セット用のIDは発行しない
- 再発行するとハッシュが変わり、**印刷済みカードは使えなくなる**。カード入稿後は実行しないこと

> ⚠️ 照合ハッシュはブラウザ側に配信される。これは「誰の投稿か」を成立させるためのカード認証であり、
> 総当たりに耐える強度は持たせていない。期間限定の例会運用を前提とした割り切り。

## デザインテーマの切り替え

配色は CSS変数に集約してある。差し替えるのは次の2ファイルだけ。

- `src/app/theme.css` … 画面の色(グレースケール・アクセント・ログイン画面の背景)
- `src/app/theme-meta.ts` … ブラウザのアドレスバー色

配色案は `design/*` ブランチに1案ずつ用意してある。

### 配色レビュー用の画面（`feat/theme-preview`）

色を決めるための入口として、ブランチを切り替えずに6案を見比べられる画面がある。

| URL | 内容 |
|---|---|
| `/themes` | 6案の一覧。選ぶとその色のまま実際の画面が開く |
| `/?demo=1&preview=1&theme=fire` | ダミー投稿つきのフィード＋画面下の切り替えバー |

`?preview=1` が無ければ切り替えバーは出ないので、参加者の画面には影響しない。
採用が決まったら、その `design/*` ブランチを取り込んで既定の配色にする。

## セットアップ手順

### 1. Firebase の設定情報を取得

[Firebaseコンソール](https://console.firebase.google.com/project/jc26-7dfdc/settings/general) →
「プロジェクトの設定」→「マイアプリ」(Webアプリ)から設定値を取得します。
Webアプリが未登録の場合は「アプリを追加」→ Web(`</>`)で作成してください。

### 2. 環境変数を設定

`.env.local`(ローカル開発用)に以下を記入します。`.env.local.example` を参照してください。

```
NEXT_PUBLIC_FIREBASE_API_KEY=取得したapiKey
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=jc26-7dfdc.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://jc26-7dfdc-default-rtdb.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=jc26-7dfdc
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=jc26-7dfdc.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=取得したsenderId
NEXT_PUBLIC_FIREBASE_APP_ID=取得したappId
```

### 3. Firebase 側のルール設定(認証なし運用)

**Realtime Database のルール**(コンソール → Realtime Database → ルール):

```json
{
  "rules": {
    "posts": {
      ".read": true,
      ".write": true,
      ".indexOn": ["createdAt"]
    }
  }
}
```

**Storage のルール**(コンソール → Storage → ルール):

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /posts/{file} {
      allow read: if true;
      allow write: if request.resource.size < 50 * 1024 * 1024
        && request.resource.contentType.matches('image/.*|video/.*');
    }
  }
}
```

**Storage の CORS 設定**(画像・動画アップロードで `blocked by CORS policy` が出る場合):

Firebase Storage のアップロードはブラウザから `firebasestorage.googleapis.com` に直接送信されるため、
本番ドメイン `https://sns26.vercel.app` からのプリフライトリクエストを Storage バケット側で許可します。
リポジトリ内の `firebase-storage-cors.json` を使って、Google Cloud SDK で次を実行してください。

```bash
gcloud storage buckets update gs://jc26-7dfdc.firebasestorage.app --cors-file=firebase-storage-cors.json
```

旧形式のバケット名を使っている Firebase プロジェクトでは、次のように `.appspot.com` バケットへ適用します。

```bash
gcloud storage buckets update gs://jc26-7dfdc.appspot.com --cors-file=firebase-storage-cors.json
```

設定確認は次のコマンドでできます。

```bash
gcloud storage buckets describe gs://jc26-7dfdc.firebasestorage.app --format='default(cors_config)'
```

> ⚠️ 認証なしの公開運用です。例会など限られた期間での利用を想定しています。長期公開する場合はルールの見直しを推奨します。

### 4. ローカルで起動

```bash
npm install
npm run dev
# http://localhost:3000
```

## Vercel へのデプロイ

1. このリポジトリを GitHub にプッシュ
2. [Vercel](https://vercel.com/) で「New Project」→ GitHubリポジトリをインポート
3. **Environment Variables** に `.env.local` と同じ環境変数を全て登録
   (`NEXT_PUBLIC_FIREBASE_*` を7つ)
4. 「Deploy」をクリック
5. 完了後、発行されたURLを例会参加者に共有

> Firebaseコンソール → Authentication → Settings →「承認済みドメイン」に
> Vercelのドメイン(`xxx.vercel.app`)を追加すると安心です(Storage利用時)。

## ユーザーガイド

### ログインする
1. カードのQRコードを読み取る(または `https://sns26.vercel.app` を開く)
2. QRから開いた場合はそのままログイン。手入力の場合はカードのログインID・パスワードを入力
3. 初回のみ、表示名・立場・アイコンを設定

### 投稿する
1. 画面下部の「投稿する」ボタンをタップ
2. メッセージを入力、必要なら画像・動画を追加
3. 「投稿する」で完了 → 全員の画面に即時反映

### コメントする
- 各投稿の「コメント」ボタンをタップ → コメントを入力して送信(名前はプロフィールのもの)

### 投稿を直す・消す
- 自分の投稿だけ、編集(本文)と削除ができる
- 運営用カード(`26-000`)でログインすると、すべての投稿を編集・削除できる

## デプロイ状況

- **プラットフォーム**: Vercel(GitHub連携)
- **ステータス**: 🚧 コード完成 / Firebase設定・Vercel接続待ち
- **最終更新**: 2026-08-18
