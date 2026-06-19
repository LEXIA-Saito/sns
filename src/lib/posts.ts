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
import type { AuthorRole, Media, Post, Comment } from "./types";

const POSTS_PATH = "posts";

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
  name: string;
  role: AuthorRole;
  avatarUrl?: string;
  text: string;
  file?: File | null;
  onProgress?: (percent: number) => void;
}

export interface UpdatePostInput {
  postId: string;
  name: string;
  role: AuthorRole;
  avatarUrl?: string;
  text: string;
}

/**
 * メディアファイルをFirebase Storageにアップロードし、ダウンロードURLとパスを返す。
 */
async function uploadMedia(
  file: File,
  onProgress?: (percent: number) => void
): Promise<Media> {
  const isVideo = file.type.startsWith("video/");
  const ext = file.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
  const path = `posts/${Date.now()}_${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;
  const sRef = storageRef(storage, path);
  const task = uploadBytesResumable(sRef, file, { contentType: file.type });

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
  onProgress?: (percent: number) => void
): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `avatars/${Date.now()}_${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;
  const sRef = storageRef(storage, path);
  const task = uploadBytesResumable(sRef, file, { contentType: file.type });

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
    media = await uploadMedia(input.file, input.onProgress);
  }

  const newRef = push(ref(db, POSTS_PATH));
  await set(newRef, {
    name: input.name.trim(),
    role: input.role,
    ...(input.avatarUrl ? { avatarUrl: input.avatarUrl } : {}),
    text: input.text.trim(),
    media,
    createdAt: serverTimestamp(),
  });
}

/**
 * 投稿の名前・立場・本文を更新する。
 */
export async function updatePost(input: UpdatePostInput): Promise<void> {
  await update(ref(db, `${POSTS_PATH}/${input.postId}`), {
    name: input.name.trim(),
    role: input.role,
    ...(input.avatarUrl ? { avatarUrl: input.avatarUrl } : {}),
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

/**
 * 投稿にコメントを追加する。
 */
export async function addComment(
  postId: string,
  name: string,
  text: string,
  avatarUrl?: string
): Promise<void> {
  const newRef = push(ref(db, `${POSTS_PATH}/${postId}/comments`));
  await set(newRef, {
    name: name.trim(),
    ...(avatarUrl ? { avatarUrl } : {}),
    text: text.trim(),
    createdAt: serverTimestamp(),
  });
}

/**
 * コメントオブジェクトを配列に変換(古い順)。
 */
export function commentsToArray(
  comments?: Record<string, Comment>
): Comment[] {
  if (!comments) return [];
  return Object.entries(comments)
    .map(([id, c]) => ({ ...c, id }))
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
}
