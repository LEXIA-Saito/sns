"use client";

import { useState } from "react";
import { Edit3, Loader2, MessageCircle, Trash2, X, Heart, EyeOff, Eye } from "lucide-react";
import type { Post, AppSettings } from "@/lib/types";
import type { Session } from "@/lib/session";
import { commentsToArray, deletePost, updatePost, toggleLike, setPostModeration } from "@/lib/posts";
import { countLikes, hasUserLiked } from "@/lib/likes";
import { formatRelativeTime } from "@/lib/utils";
import Avatar from "./Avatar";
import LevelBadge from "./LevelBadge";
import CommentSection from "./CommentSection";

interface PostCardProps {
  post: Post;
  session: Session;
  /** 投稿者の経験値（投稿の実績から集計したもの） */
  authorXp: number;
  now: number;
  likes?: Record<string, boolean>;
  settings?: AppSettings | null;
  /** 管理画面等で非表示状態を表示するかどうか */
  showModerationBadge?: boolean;
}

export default function PostCard({
  post,
  session,
  authorXp,
  now,
  likes,
  settings,
  showModerationBadge = false,
}: PostCardProps) {
  const comments = commentsToArray(post.comments);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.text);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [moderating, setModerating] = useState(false);
  const [liking, setLiking] = useState(false);

  const isHidden = Boolean(post.moderation?.hidden);
  const isLiked = hasUserLiked(likes, session.accountId);
  const likeCount = countLikes(likes);

  // 自分の投稿のみ編集・削除できる。運営用アカウントは全投稿を操作できる
  const canManage =
    session.admin === true ||
    (!!post.accountId && post.accountId === session.accountId);

  const startEdit = () => {
    setEditText(post.text);
    setEditing(true);
  };

  const handleToggleLike = async () => {
    if (liking || !session.accountId) return;
    if (isHidden && !session.admin) {
      alert("この投稿は非表示になっているためいいねできません。");
      return;
    }
    setLiking(true);
    try {
      await toggleLike(post.id, session.accountId, isLiked);
    } catch (err) {
      console.error(err);
      alert("いいねの更新に失敗しました。");
    } finally {
      setLiking(false);
    }
  };

  const handleToggleHide = async () => {
    if (!session.admin) return;
    if (isHidden) {
      if (!confirm("この投稿の非表示を解除し、全体に再公開しますか？")) return;
      setModerating(true);
      try {
        await setPostModeration(post.id, {
          hidden: false,
          moderatedBy: session.accountId,
        });
      } catch (err) {
        console.error(err);
        alert("復元に失敗しました。");
      } finally {
        setModerating(false);
      }
    } else {
      const reason = prompt("非表示にする理由を入力してください（任意）:", "不適切な内容");
      if (reason === null) return; // キャンセル
      setModerating(true);
      try {
        await setPostModeration(post.id, {
          hidden: true,
          reason: reason.trim() || "運営判断による非表示",
          moderatedBy: session.accountId,
        });
      } catch (err) {
        console.error(err);
        alert("非表示処理に失敗しました。");
      } finally {
        setModerating(false);
      }
    }
  };

  const handleSave = async () => {
    if (!editText.trim() && !post.media) {
      alert("メッセージを入力してください");
      return;
    }

    setSaving(true);
    try {
      await updatePost({ postId: post.id, text: editText });
      setEditing(false);
    } catch (error) {
      console.error(error);
      alert("投稿の更新に失敗しました。Firebaseの設定をご確認ください。");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const msg =
      session.admin && post.accountId !== session.accountId
        ? "【二段階確認】運営権限でこの投稿を完全に削除しますか？\n（復元できなくなります。通常は「非表示」を推奨します）"
        : "【確認】この投稿を完全に削除しますか？コメントも削除されます。";
    if (!confirm(msg)) return;

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
    <article
      className={`animate-fade-in-up overflow-hidden rounded-xl border bg-surface shadow-sm ${
        isHidden ? "border-amber-500/40 bg-ink-50/20 opacity-80" : "border-ink-200"
      }`}
    >
      {/* 非表示バッジ（管理画面など用） */}
      {showModerationBadge && isHidden && (
        <div className="flex items-center justify-between bg-amber-500/15 px-4 py-1.5 text-xs text-amber-300 border-b border-amber-500/30">
          <span className="flex items-center gap-1.5 font-semibold">
            <EyeOff size={14} />
            【非表示中】{post.moderation?.reason || "運営判断"}
          </span>
          <span className="text-[11px] text-amber-300/70">
            {formatRelativeTime(post.moderation?.moderatedAt || post.createdAt, now)}
          </span>
        </div>
      )}

      {/* ヘッダー */}
      <header className="flex items-start gap-3 px-4 pt-4">
        <Avatar name={post.name} avatarUrl={post.avatarUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate font-semibold text-ink-900">
              {post.name}
            </span>
            <LevelBadge xp={authorXp} />
          </div>
          <time className="text-xs text-ink-400">
            {formatRelativeTime(post.createdAt, now)}
            {post.updatedAt ? "（編集済み）" : ""}
          </time>
        </div>

        {/* 管理・操作アクション */}
        <div className="flex shrink-0 items-center gap-1">
          {session.admin && (
            <button
              type="button"
              onClick={handleToggleHide}
              disabled={moderating}
              className={`rounded-full p-2 transition disabled:cursor-not-allowed disabled:opacity-50 ${
                isHidden
                  ? "text-amber-400 hover:bg-amber-500/20"
                  : "text-ink-400 hover:bg-ink-100 hover:text-ink-800"
              }`}
              title={isHidden ? "投稿を復元（再公開）" : "投稿を非表示にする"}
              aria-label={isHidden ? "投稿を復元" : "投稿を非表示"}
            >
              {moderating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : isHidden ? (
                <Eye size={16} />
              ) : (
                <EyeOff size={16} />
              )}
            </button>
          )}
          {canManage && (
            <>
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
            </>
          )}
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
        <div className="bg-media">
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

      {/* アクション行（いいね・コメント） */}
      <div className="flex items-center gap-2 px-4 py-2 border-t border-ink-100/40">
        {/* いいねボタン */}
        <button
          type="button"
          onClick={handleToggleLike}
          disabled={liking || (isHidden && !session.admin)}
          className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
            isLiked
              ? "text-red-500 hover:bg-red-500/10"
              : "text-ink-500 hover:bg-ink-100 hover:text-ink-900"
          }`}
          aria-label={isLiked ? "いいねを取り消す" : "いいねする"}
        >
          <Heart
            size={17}
            className={`transition-transform duration-150 ${isLiked ? "fill-red-500 scale-110" : ""}`}
          />
          <span>{likeCount > 0 ? likeCount : "いいね"}</span>
        </button>

        {/* コメントボタン */}
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
          session={session}
          now={now}
          settings={settings}
        />
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-overlay/40 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-surface shadow-xl sm:rounded-2xl">
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
                  メッセージ
                </label>
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={5}
                  className="w-full resize-none rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-900 outline-none focus:border-accent"
                />
                {post.media && (
                  <p className="mt-2 text-xs text-ink-400">
                    添付済みの画像・動画はこの画面では変更されません。
                  </p>
                )}
                <p className="mt-2 text-xs text-ink-400">
                  アイコン画像はプロフィール設定から変更できます。
                </p>
              </div>
            </div>

            <div className="border-t border-ink-100 px-4 py-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-fg transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
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
