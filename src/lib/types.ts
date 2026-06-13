// 投稿者の種別
export type AuthorRole = "academy" | "lom";

// メディアの種別
export type MediaType = "image" | "video";

export interface Media {
  type: MediaType;
  url: string;
  // Storage上のパス(削除用)
  path?: string;
}

export interface Comment {
  id: string;
  name: string;
  text: string;
  createdAt: number;
}

export interface Post {
  id: string;
  name: string;
  role: AuthorRole;
  text: string;
  media?: Media | null;
  createdAt: number;
  updatedAt?: number;
  comments?: Record<string, Comment>;
}

export const ROLE_LABEL: Record<AuthorRole, string> = {
  academy: "アカデミーメンバー",
  lom: "LOMメンバー",
};
