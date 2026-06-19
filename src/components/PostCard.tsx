"use client";

import { useState } from "react";
import { Edit3, Loader2, MessageCircle, Trash2, X, GraduationCap, Users } from "lucide-react";
import type { AuthorRole, Post } from "@/lib/types";
import { commentsToArray, deletePost, updatePost } from "@/lib/posts";
import { formatRelativeTime } from "@/lib/utils";
import Avatar from "./Avatar";
import RoleBadge from "./RoleBadge";
import CommentSection from "./CommentSection";
import { cn } from "@/lib/utils";

interface PostCardProps {
  post: Post;
  commenterName: string;
  commenterAvatarUrl?: string;
  onCommenterNameChange: (name: string) => void;
  now: number;
}

export default function PostCard({
  post,
  commenterName,
  commenterAvatarUrl,
  onCommenterNameChange,
  now,
}: PostCardProps) {
  const comments = commentsToArray(post.comments);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(post.name);
  const [editRole, setEditRole] = useState<AuthorRole>(post.role);
  const [editText, setEditText] = useState(post.text);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const startEdit = () => {
    setEditName(post.name);
    setEditRole(post.role);
    setEditText(post.text);
    setEditing(true);
  };

  const handleSave = async () => {
    const name = editName.trim();
    if (!name) {
      alert("お名前を入力してください");
      return;
    }
    if (!editText.trim() && !post.media) {
      alert("メッセージを入力してください");
      return;
    }

    setSaving(true);
    try {
      await updatePost({
        postId: post.id,
        name,
        role: editRole,
        avatarUrl: commenterAvatarUrl,
        text: editText,
      });
      setEditing(false);
    } catch (error) {
      console.error(error);
      alert("投稿の更新に失敗しました。Firebaseの設定をご確認ください。");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("この投稿を削除しますか？コメントも削除されます。")) return;

    setDeleting(true);
    try {
      await deletePost(post);
    } catch (error) {
      console.error(error);
      alert("投稿の削除に失敗しました。Firebaseの設定をご確認ください。");
      setDeleting(false);
    }
  };

  return (
    <article className="animate-fade-in-up overflow-hidden rounded-xl border border-ink-200 bg-white shadow-sm">
      {/* ヘッダー */}
      <header className="flex items-start gap-3 px-4 pt-4">
        <Avatar name={post.name} role={post.role} avatarUrl={post.avatarUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate font-semibold text-ink-900">
              {post.name}
            </span>
            <RoleBadge role={post.role} />
          </div>
          <time className="text-xs text-ink-400">
            {formatRelativeTime(post.createdAt, now)}
            {post.updatedAt ? "（編集済み）" : ""}
          </time>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={startEdit}
            disabled={deleting}
            className="rounded-full p-2 text-ink-400 transition hover:bg-ink-100 hover:text-ink-800 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="投稿を編集"
          >
            <Edit3 size={16} />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-full p-2 text-ink-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="投稿を削除"
          >
            {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
          </button>
        </div>
      </header>

      {/* 本文 */}
      {post.text && (
        <p className="whitespace-pre-wrap break-words px-4 py-3 text-[15px] leading-relaxed text-ink-800">
          {post.text}
        </p>
      )}

      {/* メディア */}
      {post.media && (
        <div className="bg-ink-950">
          {post.media.type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.media.url}
              alt="投稿画像"
              className="max-h-[70vh] w-full object-contain"
              loading="lazy"
            />
          ) : (
            <video
              src={post.media.url}
              controls
              playsInline
              className="max-h-[70vh] w-full object-contain"
            />
          )}
        </div>
      )}

      {/* アクション */}
      <div className="flex items-center gap-1 px-4 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-ink-500 transition hover:bg-ink-100 hover:text-ink-900"
        >
          <MessageCircle size={17} />
          <span>
            {comments.length > 0 ? `コメント ${comments.length}` : "コメント"}
          </span>
        </button>
      </div>

      {/* コメント欄 */}
      {(open || comments.length > 0) && (
        <CommentSection
          postId={post.id}
          comments={comments}
          defaultName={commenterName}
          commenterAvatarUrl={commenterAvatarUrl}
          onNameChange={onCommenterNameChange}
          now={now}
        />
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/40 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
              <h2 className="text-base font-semibold text-ink-900">投稿を編集</h2>
              <button
                onClick={() => setEditing(false)}
                disabled={saving}
                className="rounded-full p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-900 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="閉じる"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-500">
                  お名前
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-900 outline-none focus:border-ink-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-ink-500">
                  あなたの立場
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditRole("academy")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition",
                      editRole === "academy"
                        ? "border-ink-900 bg-ink-900 text-white"
                        : "border-ink-200 text-ink-600 hover:border-ink-400"
                    )}
                  >
                    <GraduationCap size={16} />
                    アカデミー
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditRole("lom")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition",
                      editRole === "lom"
                        ? "border-ink-900 bg-ink-900 text-white"
                        : "border-ink-200 text-ink-600 hover:border-ink-400"
                    )}
                  >
                    <Users size={16} />
                    LOMメンバー
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-ink-500">
                  メッセージ
                </label>
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={5}
                  className="w-full resize-none rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-900 outline-none focus:border-ink-500"
                />
                {post.media && (
                  <p className="mt-2 text-xs text-ink-400">
                    添付済みの画像・動画はこの画面では変更されません。
                  </p>
                )}
              </div>
            </div>

            <div className="border-t border-ink-100 px-4 py-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink-900 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    保存中...
                  </>
                ) : (
                  "保存する"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
