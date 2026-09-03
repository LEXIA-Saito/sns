# 26アカデミー 例会SNS

26アカデミーの例会で使用する専用SNSアプリです。PR動画・画像・意気込みをアカデミーメンバーが投稿し、LOMメンバーからは思い出や激励コメントをリアルタイムで投稿できます。例会中に参加者がその場でコメントを投稿できます。

## プロジェクト概要

- **名称**: 26アカデミー 例会SNS
- **目的**: 例会をリアルタイムで盛り上げる投稿・コメント共有プラットフォーム
- **メイン利用環境**: スマートフォン(PCにも対応)

## 主な機能

- ✅ **アカウントカードでログイン（Firebase Authentication）** — 配布カード記載のログインID・パスワードで入場
  - カードのQRコード(`/?id=26-001`)から開くとログイン画面が出て、IDだけ入った状態になる
  - **QRにパスワードは載せない**。カードを拾われてもそのままでは入れないようにするため
  - 一度ログインすればその端末では入力不要(9/8配布 〜 10/19本番の携帯期間を想定)
- ✅ **氏名は名簿で固定（変更不可）** — ログインしたアカウントカード番号（`26-001`〜`26-084`）に基づき公式名簿の氏名が一意に決まります
  - 利用者自身による氏名の変更は不可（プロフィール設定では読み取り専用表示）
  - プロフィール設定では**アバター画像（アイコン）のみ自由に変更可能**
  - `26-000` は「運営」、`26-085` は「予備アカウント」、未知のIDは「アカウント <ID>」に安全にフォールバック
  - 過去に端末のローカル保存等に別の名前があっても、常に名簿の固定名が強制されます
- ✅ **レベル表示（おまけ要素）** — 名前の横に小さく `Lv.◯` が出るだけの控えめな演出
  - 公式な評価・順位づけではないため、アプリ内に説明やスコアの案内は出さない
  - 投稿画面・会場投影画面には表示しない（投稿の妨げにならないようにするため）
  - レベルは投稿の実績から計算する(別途保存しない)ため、投稿を消すと下がる
- ✅ **投稿機能** — テキストメッセージ + 画像・動画の添付(最大50MB)
- ✅ **リアルタイム表示** — Firebase Realtime Database で全端末に即時反映
- ✅ **コメント機能** — 各投稿に激励コメントを投稿（投稿者名は固定名を使用）
- ✅ **本人のみ編集・削除** — 投稿にログインIDが紐づく。運営用アカウント(`26-000`)は全投稿を操作可
- ✅ **いいね機能** — 各投稿にいいね（1アカウント1回、再タップ解除、ハートアイコン表示）
- ✅ **運営管理ダッシュボード（/admin）** — 公式運営（`26-000`）専用
  - **投稿・コメント受付管理**: 即時ON/OFF、締切日時設定、投稿ガイド文設定
  - **投稿・コメントモデレーション**: 非表示・理由記録・復元・完全削除
  - **参加進捗一覧**: 全85名のログイン・投稿・写真・コメント状況一覧、検索、絞り込み、CSVダウンロード
  - **写真素材一覧**: 投稿写真のサムネイル確認、個別保存、一括ZIPダウンロード
- ✅ **会場投影モード（/projector）** — 公式運営（`26-000`）専用
  - 16:9フルスクリーン対応、会場後方から読める特大文字・写真スライドショー
  - 公開中の投稿のみを自動切り替え、最新応援コメント吹き出し表示
  - マウス操作時のみ表示される運営用フローティング操作バー（再生/停止、速度切替、全画面）
- ✅ **黒（白線: whiteline）テーマが本番標準** — 背景 `#080808` に白い枠線、白抜きロゴ、ビットマップ書体（PixelMplus12）
- ✅ **ピクセルアート（ドット絵）アイコン** — ドット書体に合わせ、主要アイコンを自前のドット絵SVGに刷新
  - いいね・コメント・編集・削除・カメラ・送信・ログイン等は `src/components/PixelIcon.tsx` のドット絵SVG
  - 読み込み中スピナーや運営画面など一部は引き続き lucide-react を使用

## 機能エントリ(URL)

| パス | 説明 | 権限 |
|------|------|------|
| `/` | メインフィード(投稿一覧・投稿フォーム・コメント・いいね) | 全員（ログイン必須） |
| `/admin` | 運営管理ダッシュボード（受付管理、モデレーション、進捗CSV、写真ZIP） | 運営（`26-000`）のみ |
| `/projector` | 会場投影用16:9スライドショー（自動切替・大画面表示） | 運営（`26-000`）のみ |
| `/status` | データベース接続状態確認ページ | 運営（`26-000`）のみ |

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
    name: string          # 投稿者名（名簿固定）
    text: string          # メッセージ
    media: {              # 添付メディア(任意)
      type: "image" | "video"
      url: string         # Storage上のダウンロードURL
      path: string        # Storage上のパス
    } | null
    createdAt: number     # サーバータイムスタンプ
    updatedAt: number     # 編集日時
    moderation: {         # 非表示モデレーション情報（運営管理用）
      hidden: boolean     # true: 一般画面・投影画面から除外
      reason: string      # 非表示理由
      moderatedAt: number # 実行日時
      moderatedBy: string # "26-000"
    }
    comments/
      <commentId>/
        accountId: string
        name: string
        text: string
        createdAt: number
        moderation: {
          hidden: boolean
          reason: string
          moderatedAt: number
          moderatedBy: string
        }

settings/                 # 投稿・コメント受付・締切設定（運営管理）
  postAccepting: boolean  # 投稿受付スイッチ (true/false)
  commentAccepting: boolean # コメント受付スイッチ (true/false)
  postDeadline: number    # 投稿締切日時 (Unixミリ秒)
  commentDeadline: number # コメント締切日時 (Unixミリ秒)
  postGuideNotice: string # 締切案内文（例: 写真付き投稿は10月12日まで）
  postGuideLines: string[]# 投稿テーマ箇条書き
  updatedAt: number
  updatedBy: string

likes/                    # いいね（1アカウント1投稿1回）
  <postId>/
    <accountId>: true     # いいね済みフラグ

accountActivity/          # 参加者のログイン記録
  <accountId>/
    lastLoginAt: number   # 最終ログイン日時 (Unixミリ秒)
```

メディアファイルは Firebase Storage の `posts/` 配下に保存されます。

## アカウントカードのID・パスワード発行

参加者に配るカード(85枚 + 予備2セット)のログイン情報はスクリプトで発行する。

```bash
npm run accounts -- --count 85 --base https://sns26.vercel.app
```

出力は `out/accounts.csv`(ログインID・パスワード・QR用URL)。**gitignore対象**で、カード印刷の入稿データになる。紛失注意。

発行したら、Firebase Authentication にユーザーを作る。

```bash
# Firebaseコンソール > Authentication > Sign-in method で「メール/パスワード」を有効化してから
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json \
  node scripts/provision-auth-users.mjs --project jc26-7dfdc
```

- 認証は **Firebase Authentication のメール/パスワード**。参加者はメールを持たない運用なので、
  ログインIDから `26-001@sns26.local` という識別用アドレスを機械的に作っている(メールは届かない/送らない)
- **uid はカード番号そのもの**(`26-001`)。データベースのルールが uid で投稿の持ち主を判定する
- 同じIDが既にある場合はパスワードを更新する(カードを刷り直したとき用)

- ID は `26-001` 〜 `26-085`。`26-000` は運営用(全投稿・コメントの管理・非表示・削除が可能)
- パスワードは紛らわしい文字(`0` `O` `1` `I`)を除いた6文字(Firebase Authの最低文字数は6)
- 予備カードは「原本のコピー」運用のため、予備セット用のIDは発行しない
- 再発行して登録し直すと、**印刷済みカードのパスワードは使えなくなる**。カード入稿後は実行しないこと

## セキュリティルール

`database.rules.json` / `storage.rules` に入っている。デプロイは次のとおり。

```bash
firebase deploy --only database,storage --project jc26-7dfdc
```

- **投稿・コメントの受付制御**: `settings/postAccepting` や `settings/postDeadline` を参照し、受付停止中または締切超過の一般メンバーからの書き込みを拒否（運営 `26-000` は常に書き込み可能）。
- **投稿・コメントモデレーション**: `posts/$postId/moderation` およびコメントの `moderation` ノードは `26-000` のみ書き込み可能。
- **いいね機能**: `likes/$postId/$accountId` の書き込みは自分の `accountId` のみ許可。非表示投稿へのいいねは拒否。
- **活動履歴**: `accountActivity/$accountId` は本人のみ更新可能。全一覧の読み取りは `26-000` のみ許可。
- **メディアファイル**: 投稿50MB / アイコン5MB、画像・動画のみ。

## 運営上の操作注意

1. **投稿の管理は原則「非表示」を使用**:
   - 誤投稿や不適切投稿の対応は、削除ではなく `/admin` から「非表示にする」を行ってください。非表示理由が保存され、いつでも再公開（復元）が可能です。
   - 完全削除はメディアファイルも含めて復元不可となるため、二段階確認が付いています。
2. **受付締切の設定**:
   - `/admin` の「受付・締切管理」から日本時間で締切日時を設定・解除できます。未設定時は「受付中」として動作します。
   - 一般メンバーには締切日時および受付停止中の案内が画面上に表示されます。
3. **写真素材の一括ダウンロード**:
   - `/admin` の「写真素材」から、例会投影や記録用の写真を一括ZIPダウンロードできます（ブラウザ内で安全に生成）。動画は対象外です。

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

> ✅ **配色は「白線（whiteline）」で決定済み**。`design/whiteline` は `main` に取り込み済みで、上記の一覧画面は今後の再検討用に `feat/theme-preview` ブランチへ残してある。

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

### 3. Firebase 側の設定

ルールはリポジトリ内の `database.rules.json` / `storage.rules` を `firebase deploy` で反映する
(上の「セキュリティルール」を参照)。あわせて **Authentication → Sign-in method → メール/パスワード** を有効化する。

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

> ⚠️ 参加者の認証はアカウントカード配布によるものです。例会など限られた期間での利用を想定しています。

### 4. ローカルで起動・テスト実行

```bash
npm install

# 単体テストの実行（Node.js標準テストランナー。外部通信なし）
npm test

# 開発サーバー起動
npm run dev
# http://localhost:3000
```

## 自動テストについて

外部Firebaseサービスに依存しない高速な単体テストを備えています（`npm test` で **61件** 実行、外部通信なし）。

- **名簿固定マッピングの検証**: `26-000`（運営）、`26-001`〜`26-084`（全名簿）、`26-085`（予備アカウント）、および未知IDに対するフォールバック
- **改ざん防止の検証**: ブラウザのローカルストレージに過去の別名が残っていても、常に名簿の固定名が返されること
- **経験値・レベル進捗計算の検証**: テキスト(+10XP)/メディア(+25XP)の加算、レベルアップ閾値、進捗率、Tier判定
- **受付・締切判定の検証**: スイッチOFF・締切前後の境界値、設定が無い旧環境での既定動作、運営(`26-000`)によるバイパス
- **JST日時変換の検証**: 締切日時の表示フォーマットと `datetime-local` 入力からUnixミリ秒への復元
- **モデレーション表示判定の検証**: 非表示投稿・非表示コメントの除外、`moderation` が無い旧データの扱い
- **参加進捗集計・CSV出力の検証**: 85件固定の一覧生成、投稿数・写真数・コメント数の集計、BOM付きUTF-8のCSVヘッダー
- **写真ZIPの検証**: `accountId_氏名_YYYYMMDD-HHmm_連番.拡張子` のファイル名整形と、外部npmなしのZIP生成
- **いいね集計の検証**: `countLikes` / `hasUserLiked` の判定
- **セキュリティルールの静的リグレッション**: `database.rules.json` の投稿・モデレーション権限が緩んでいないことを検査

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
2. IDは自動で入るので、カード記載のパスワードを入力する
3. ログイン完了後、そのままフィードが表示されます（氏名はアカウントカードに基づき自動設定済み）
4. アイコン画像を設定したい場合は、右上のプロフィールアイコンからいつでも設定可能です

### 投稿する
1. 画面下部の「投稿する」ボタンをタップ
2. メッセージを入力、必要なら画像・動画を追加
3. 「投稿する」で完了 → 全員の画面に即時反映

> レベルは参加者に案内しないおまけ要素です。計算式（加算値・閾値・アイコンの段階）は `src/lib/level.ts` を参照してください。

### コメントする
- 各投稿の「コメント」ボタンをタップ → コメントを入力して送信(投稿者名は固定名が自動で使用されます)

### 投稿を直す・消す
- 自分の投稿だけ、編集(本文)と削除ができる
- 運営用カード(`26-000`)でログインすると、すべての投稿を編集・削除できる

## デプロイ状況

- **プラットフォーム**: Vercel(GitHub連携 / `main` へのプッシュで自動デプロイ)
- **本番URL**: https://sns26.vercel.app
- **ステータス**: ✅ 本番稼働中（Firebase Authentication・Realtime Database・Storage 設定済み、Vercel接続済み）
- **最終更新**: 2026-09-03
