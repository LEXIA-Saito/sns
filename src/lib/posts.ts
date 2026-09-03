import {
  ref,
  push,
  set,
  onValue,
  query,
  orderByChild,
  serverTimestamp,
  update,
  remove,
  type Unsubscribe,
} from "firebase/database";
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "./firebase";
import { getRosterName } from "./roster";
import { buildAvatarResetUpdates } from "./avatarReset";
import type { Media, Post, ModerationInfo, AppSettings, AccountActivity } from "./types";

const POSTS_PATH = "posts";
const SETTINGS_PATH = "settings";
const ACTIVITY_PATH = "accountActivity";
const AVATAR_RESET_PATH = "avatarResets";

/**
 * 投稿の購読(リアルタイム)。新しい順に並べたPost配列をコールバックで返す。
 */
export function subscribePosts(
  callback: (posts: Post[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const postsQuery = query(ref(db, POSTS_PATH), orderByChild("createdAt"));
  return onValue(
    postsQuery,
    (snapshot) => {
      const val = snapshot.val() as Record<string, Omit<Post, "id">> | null;
      if (!val) {
        callback([]);
        return;
      }
      const list: Post[] = Object.entries(val).map(([id, data]) => ({
        ...data,
        id,
      }));
      // createdAt 降順(新しい順)
      list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      callback(list);
    },
    (error) => {
      console.error("Realtime DB read error:", error);
      onError?.(error);
    }
  );
}

export interface CreatePostInput {
  accountId: string;
  name: string;
  avatarUrl?: string;
  text: string;
  file?: File | null;
  onProgress?: (percent: number) => void;
}

export interface UpdatePostInput {
  postId: string;
  text: string;
}

/**
 * メディアファイルをFirebase Storageにアップロードし、ダウンロードURLとパスを返す。
 */
async function uploadMedia(
  file: File,
  accountId: string,
  onProgress?: (percent: number) => void
): Promise<Media> {
  const isVideo = file.type.startsWith("video/");
  const ext = file.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
  const path = `posts/${Date.now()}_${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;
  const sRef = storageRef(storage, path);
  // 投稿を消したときに本人が画像も消せるよう、アップロード者を記録する
  const task = uploadBytesResumable(sRef, file, {
    contentType: file.type,
    customMetadata: { owner: accountId },
  });

  return new Promise<Media>((resolve, reject) => {
    task.on(
      "state_changed",
      (snapshot) => {
        const percent =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(percent);
      },
      (error) => reject(error),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve({
          type: isVideo ? "video" : "image",
          url,
          path,
        });
      }
    );
  });
}

/**
 * プロフィール画像(アバター)をアップロードし、ダウンロードURLを返す。
 */
export async function uploadAvatarImage(
  file: File,
  accountId: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `avatars/${Date.now()}_${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;
  const sRef = storageRef(storage, path);
  const task = uploadBytesResumable(sRef, file, {
    contentType: file.type,
    customMetadata: { owner: accountId },
  });

  return new Promise<string>((resolve, reject) => {
    task.on(
      "state_changed",
      (snapshot) => {
        const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(percent);
      },
      (error) => reject(error),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve(url);
      }
    );
  });
}

/**
 * 新規投稿を作成する。ファイルがあればStorageにアップロードしてから保存。
 */
export async function createPost(input: CreatePostInput): Promise<void> {
  let media: Media | null = null;
  if (input.file) {
    media = await uploadMedia(input.file, input.accountId, input.onProgress);
  }

  const fixedName = input.accountId ? getRosterName(input.accountId) : input.name.trim();

  const newRef = push(ref(db, POSTS_PATH));
  await set(newRef, {
    accountId: input.accountId,
    name: fixedName,
    ...(input.avatarUrl ? { avatarUrl: input.avatarUrl } : {}),
    text: input.text.trim(),
    media,
    createdAt: serverTimestamp(),
  });
}

/**
 * 投稿の本文を更新する。名前・立場はアカウント（プロフィール）側で管理するため変更しない。
 */
export async function updatePost(input: UpdatePostInput): Promise<void> {
  await update(ref(db, `${POSTS_PATH}/${input.postId}`), {
    text: input.text.trim(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * 投稿を削除する。Storage上のメディアがあればあわせて削除する。
 */
export async function deletePost(post: Post): Promise<void> {
  await remove(ref(db, `${POSTS_PATH}/${post.id}`));

  if (!post.media?.path) return;

  try {
    await deleteObject(storageRef(storage, post.media.path));
  } catch (error) {
    console.warn("Storage media delete error:", error);
  }
}

// -------------------------------------------------------------
// 運営用モデレーションAPI (非表示・復元)
// -------------------------------------------------------------

/**
 * 投稿の非表示・復元を更新
 */
export async function setPostModeration(
  postId: string,
  moderation: ModerationInfo
): Promise<void> {
  await update(ref(db, `${POSTS_PATH}/${postId}/moderation`), {
    ...moderation,
    moderatedAt: serverTimestamp(),
  });
}

/**
 * 運営が全投稿を削除する。
 * Storage の画像・動画も消してから、投稿をまとめて削除する。
 * 画像の削除に失敗しても投稿の削除は続ける（残骸より投稿が消えることを優先）。
 * 戻り値は削除した投稿数。
 */
export async function deleteAllPosts(
  posts: Post[],
  onProgress?: (done: number, total: number) => void
): Promise<number> {
  let done = 0;
  for (const post of posts) {
    if (post.media?.path) {
      try {
        await deleteObject(storageRef(storage, post.media.path));
      } catch (error) {
        console.warn("Storage media delete error:", error);
      }
    }
    done += 1;
    onProgress?.(done, posts.length);
  }

  const updates: Record<string, null> = {};
  for (const post of posts) {
    updates[`${POSTS_PATH}/${post.id}`] = null;
  }
  if (Object.keys(updates).length > 0) {
    await update(ref(db), updates);
  }
  return posts.length;
}

/**
 * 運営が、あるカードのアイコンをデフォルト（名前のみ）へ戻す。
 * 過去の投稿・コメントからも外し、本人の端末にも初期化を伝える。
 * 戻り値は外した件数。
 */
export async function resetAccountAvatar(
  posts: Post[],
  accountId: string
): Promise<number> {
  const paths = buildAvatarResetUpdates(posts, accountId);
  const updates: Record<string, unknown> = { ...paths };
  updates[`${AVATAR_RESET_PATH}/${accountId}`] = serverTimestamp();
  await update(ref(db), updates);
  return Object.keys(paths).length;
}

/**
 * 自分のカードが運営に初期化されたかの購読。
 * 初期化された時刻（Unixミリ秒）を返す。
 */
export function subscribeAvatarReset(
  accountId: string,
  callback: (resetAt: number | undefined) => void
): Unsubscribe {
  return onValue(ref(db, `${AVATAR_RESET_PATH}/${accountId}`), (snapshot) => {
    const value = snapshot.val();
    callback(typeof value === "number" ? value : undefined);
  });
}

// -------------------------------------------------------------
// 受付設定 API (settings)
// -------------------------------------------------------------

/**
 * 受付設定のリアルタイム購読
 */
export function subscribeSettings(
  callback: (settings: AppSettings | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onValue(
    ref(db, SETTINGS_PATH),
    (snapshot) => {
      const val = snapshot.val() as AppSettings | null;
      callback(val);
    },
    (err) => {
      console.error("Settings read error:", err);
      onError?.(err);
    }
  );
}

/**
 * 受付設定の更新（運営のみ）
 */
export async function updateSettings(
  settings: Partial<AppSettings>
): Promise<void> {
  await update(ref(db, SETTINGS_PATH), {
    ...settings,
    updatedAt: serverTimestamp(),
  });
}

// -------------------------------------------------------------
// アカウント活動履歴 API (accountActivity)
// -------------------------------------------------------------

/**
 * ログイン日時の記録
 */
export async function recordAccountLogin(accountId: string): Promise<void> {
  if (!accountId) return;
  try {
    await update(ref(db, `${ACTIVITY_PATH}/${accountId}`), {
      lastLoginAt: serverTimestamp(),
    });
  } catch (err) {
    // ログイン処理自体を阻害しないようログのみ
    console.warn("recordAccountLogin error:", err);
  }
}

/**
 * 全アカウントの活動履歴を購読（運営画面用）
 */
export function subscribeAllActivities(
  callback: (activities: Record<string, AccountActivity>) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onValue(
    ref(db, ACTIVITY_PATH),
    (snapshot) => {
      const val = snapshot.val() as Record<string, AccountActivity> | null;
      callback(val || {});
    },
    (err) => {
      console.error("Activities read error:", err);
      onError?.(err);
    }
  );
}
