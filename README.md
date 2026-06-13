# 26アカデミー 例会SNS

26アカデミーの例会で使用する専用SNSアプリです。PR動画・画像・意気込みをアカデミーメンバーが投稿し、LOMメンバーからは思い出や激励コメントをリアルタイムで投稿できます。例会中に参加者がその場でコメントを投稿できます。

## プロジェクト概要

- **名称**: 26アカデミー 例会SNS
- **目的**: 例会をリアルタイムで盛り上げる投稿・コメント共有プラットフォーム
- **メイン利用環境**: スマートフォン(PCにも対応)

## 主な機能

- ✅ **投稿機能** — 名前を入力して誰でも投稿可能(認証なし)
  - アカデミーメンバー / LOMメンバーの立場を選択
  - テキストメッセージ + 画像・動画の添付(最大50MB)
- ✅ **リアルタイム表示** — Firebase Realtime Database で全端末に即時反映
- ✅ **コメント機能** — 各投稿に激励コメントを投稿
- ✅ **レスポンシブ対応** — スマホ最適化 + PC対応
- ✅ **モノトーンデザイン** — シンプルで洗練されたUI
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
        name: string
        text: string
        createdAt: number
```

メディアファイルは Firebase Storage の `posts/` 配下に保存されます。

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
      allow write: if request.resource.size < 50 * 1024 * 1024;
    }
  }
}
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

### 投稿する
1. 画面下部の「投稿する」ボタンをタップ
2. お名前を入力(次回以降は自動保存)
3. 立場(アカデミー / LOMメンバー)を選択
4. メッセージを入力、必要なら画像・動画を追加
5. 「投稿する」で完了 → 全員の画面に即時反映

### コメントする
- 各投稿の「コメント」ボタンをタップ → 名前とコメントを入力して送信

## デプロイ状況

- **プラットフォーム**: Vercel(GitHub連携)
- **ステータス**: 🚧 コード完成 / Firebase設定・Vercel接続待ち
- **最終更新**: 2026-06-13
