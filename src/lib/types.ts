// メディアの種別
export type MediaType = "image" | "video";

export interface Media {
  type: MediaType;
  url: string;
  // Storage上のパス(削除用)
  path?: string;
}

/** 投稿・コメントの非表示モデレーション情報 */
export interface ModerationInfo {
  hidden: boolean;
  reason?: string;
  moderatedAt?: number;
  moderatedBy?: string; // "26-000"
}

export interface Comment {
  id: string;
  /** 投稿者のログインID（アカウントカード） */
  accountId?: string;
  name: string;
  avatarUrl?: string;
  text: string;
  createdAt: number;
  moderation?: ModerationInfo;
}

export interface Post {
  id: string;
  /** 投稿者のログインID（アカウントカード）。本人だけが編集・削除できる */
  accountId?: string;
  name: string;
  avatarUrl?: string;
  text: string;
  media?: Media | null;
  createdAt: number;
  updatedAt?: number;
  comments?: Record<string, Comment>;
  moderation?: ModerationInfo;
}

/** 投稿・コメントの受付管理・締切設定 */
export interface AppSettings {
  /** 投稿受付 (未作成またはtrueなら受付中) */
  postAccepting?: boolean;
  /** コメント受付 (未作成またはtrueなら受付中) */
  commentAccepting?: boolean;
  /** 投稿締切日時 (Unixミリ秒) */
  postDeadline?: number | null;
  /** コメント締切日時 (Unixミリ秒) */
  commentDeadline?: number | null;
  /** ガイド文の締切表示文 (例: 写真付き投稿は10月12日まで) */
  postGuideNotice?: string;
  /** ガイド文の箇条書き */
  postGuideLines?: string[];
  updatedAt?: number;
  updatedBy?: string;
}

/** アカウントごとの活動履歴 */
export interface AccountActivity {
  lastLoginAt?: number;
  firstLoginAt?: number;
}

/** いいねデータ構造: likes[postId][accountId] = true */
export type LikesByPost = Record<string, Record<string, boolean>>;
