"use client";

import { useRef, useState } from "react";
import { Loader2, Clock, AlertCircle } from "lucide-react";
import { PixelX, PixelCamera, PixelFilm, PixelSparkle } from "./PixelIcon";
import { createPost } from "@/lib/posts";
import type { Session } from "@/lib/session";
import type { AppSettings } from "@/lib/types";
import {
  canCreatePost,
  DEFAULT_POST_GUIDE_LINES,
  DEFAULT_POST_GUIDE_NOTICE,
  formatJstDateTime,
} from "@/lib/settings";
import Avatar from "./Avatar";

interface PostComposerProps {
  open: boolean;
  onClose: () => void;
  session: Session;
  onProfileEdit: () => void;
  settings?: AppSettings | null;
  now?: number;
}

const MAX_FILE_MB = 50;

export default function PostComposer({
  open,
  onClose,
  session,
  onProfileEdit,
  settings,
  now = Date.now(),
}: PostComposerProps) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const postStatus = canCreatePost(settings, now, session.admin === true);

  if (!open) return null;

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      alert(`ファイルサイズは${MAX_FILE_MB}MB以下にしてください`);
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const clearFile = () => {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const reset = () => {
    setText("");
    clearFile();
    setProgress(0);
  };

  const handleSubmit = async () => {
    if (!postStatus.allowed) {
      alert(postStatus.reason || "投稿受付は現在停止しています。");
      return;
    }
    if (!session.name.trim()) {
      alert("プロフィールでお名前を設定してください");
      onProfileEdit();
      return;
    }
    if (!text.trim() && !file) {
      alert("メッセージか、画像・動画を入力してください");
      return;
    }
    setSubmitting(true);
    setProgress(0);
    try {
      await createPost({
        accountId: session.accountId,
        name: session.name,
        avatarUrl: session.avatarUrl,
        text,
        file,
        onProgress: (p) => setProgress(p),
      });
      reset();
      onClose();
    } catch (e) {
      console.error(e);
      alert("投稿に失敗しました。Firebaseの設定をご確認ください。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-overlay/40 p-0 sm:items-center sm:p-4">
      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-surface shadow-xl sm:rounded-2xl">
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
          <h2 className="text-base font-semibold text-ink-900">投稿する</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-900"
            aria-label="閉じる"
          >
            <PixelX size={18} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
          {/* プロフィール（名前とアイコン） */}
          <div className="flex shrink-0 items-center justify-between rounded-lg border border-ink-200 bg-ink-50 p-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10">
                <Avatar name={session.name || "?"} avatarUrl={session.avatarUrl} size="md" />
              </div>
              <p className="text-sm font-semibold text-ink-900">
                {session.name || "名前未設定"}
              </p>
            </div>
            <button
              onClick={onProfileEdit}
              className="rounded-md border border-ink-200 bg-surface px-2.5 py-1 text-xs font-medium text-ink-600 transition hover:border-ink-400 hover:text-ink-900"
            >
              画像変更
            </button>
          </div>

          {/* 受付状態・締切に関する注意表示 */}
          {!postStatus.allowed ? (
            <div className="shrink-0 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 text-amber-400 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-200">
                  {postStatus.isDeadlinePassed ? "投稿受付期間終了" : "投稿受付停止中"}
                </p>
                <p className="mt-0.5 text-amber-300/90 leading-relaxed">
                  {postStatus.reason}
                </p>
              </div>
            </div>
          ) : session.admin ? (
            <div className="shrink-0 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-white/60 flex items-center justify-between">
              <span>※ 運営アカウントのため受付状態に関わらず投稿可能です</span>
              {settings?.postDeadline && (
                <span className="text-white/40">締切: {formatJstDateTime(settings.postDeadline)}</span>
              )}
            </div>
          ) : settings?.postDeadline ? (
            <div className="shrink-0 rounded-md border border-ink-200 bg-ink-50 px-3 py-1.5 text-[11px] text-ink-500 flex items-center gap-1.5">
              <Clock size={12} className="text-ink-400" />
              <span>投稿締切: {formatJstDateTime(settings.postDeadline)} まで</span>
            </div>
          ) : null}

          {/* 投稿テーマ・ガイド（常時表示） */}
          <div className="shrink-0 rounded-lg border border-ink-200 bg-ink-50/50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-900">
                <PixelSparkle size={13} className="text-accent" />
                投稿のテーマ・ガイド
              </span>
              <span className="text-[11px] font-medium text-accent">
                {settings?.postGuideNotice || DEFAULT_POST_GUIDE_NOTICE}
              </span>
            </div>
            <ul className="space-y-1 text-xs text-ink-700">
              {(settings?.postGuideLines || DEFAULT_POST_GUIDE_LINES).map((line, idx) => (
                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-accent font-bold">・</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <p className="pt-1 text-[11px] text-ink-400 border-t border-ink-200/60 leading-normal">
              ※ 写真付き投稿が推奨されていますが、テキストのみの投稿も可能です。
            </p>
          </div>

          {/* テキスト（レベル表示をやめた分、入力欄を広く取る） */}
          <div className="flex min-h-0 flex-1 flex-col">
            <label className="mb-1 block text-xs font-medium text-ink-500">
              メッセージ
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="意気込み・思い出・激励のメッセージを..."
              rows={10}
              className="min-h-[11rem] w-full flex-1 resize-none rounded-lg border border-ink-200 px-3 py-2 text-sm leading-relaxed text-ink-900 outline-none focus:border-accent"
            />
          </div>

          {/* メディアプレビュー */}
          {preview && file && (
            <div className="relative shrink-0 overflow-hidden rounded-lg border border-ink-200 bg-media">
              {file.type.startsWith("video/") ? (
                <video src={preview} className="max-h-64 w-full object-contain" controls />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="プレビュー" className="max-h-64 w-full object-contain" />
              )}
              <button
                onClick={clearFile}
                className="absolute right-2 top-2 rounded-full bg-media/70 p-1.5 text-white transition hover:bg-media"
                aria-label="メディアを削除"
              >
                <PixelX size={16} />
              </button>
            </div>
          )}

          {/* メディア追加ボタン */}
          {!file && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-dashed border-ink-300 px-3 py-3 text-sm text-ink-500 transition hover:border-accent hover:text-ink-800"
            >
              <PixelCamera size={18} />
              画像
              <PixelFilm size={18} className="ml-1" />
              動画を追加
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />

          {/* アップロード進捗 */}
          {submitting && file && (
            <div className="shrink-0 space-y-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                <div
                  className="h-full bg-accent transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-xs text-ink-400">
                アップロード中 {Math.round(progress)}%
              </p>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="border-t border-ink-100 px-4 py-3">
          <button
            onClick={handleSubmit}
            disabled={submitting || !postStatus.allowed}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-fg transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                投稿中...
              </>
            ) : !postStatus.allowed ? (
              postStatus.isDeadlinePassed ? "投稿受付期間終了" : "投稿受付停止中"
            ) : (
              "投稿する"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
