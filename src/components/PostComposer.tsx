"use client";

import { useRef, useState } from "react";
import { Loader2, Clock, AlertCircle } from "lucide-react";
import { PixelX, PixelCamera, PixelFilm, PixelSparkle } from "./PixelIcon";
import { createPost } from "@/lib/posts";
import type { Session } from "@/lib/session";
import type { AppSettings } from "@/lib/types";
import {
  XP_MEDIA_POST,
  XP_TEXT_POST,
  levelFromXp,
  tierFromLevel,
} from "@/lib/level";
import {
  canCreatePost,
  DEFAULT_POST_GUIDE_LINES,
  DEFAULT_POST_GUIDE_NOTICE,
  formatJstDateTime,
} from "@/lib/settings";
import Avatar from "./Avatar";
import LevelIcon from "./LevelIcon";

interface PostComposerProps {
  open: boolean;
  onClose: () => void;
  session: Session;
  /** 自分の経験値（投稿の実績から集計したもの） */
  xp: number;
  onProfileEdit: () => void;
  settings?: AppSettings | null;
  now?: number;
}

const MAX_FILE_MB = 50;

export default function PostComposer({
  open,
  onClose,
  session,
  xp,
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

  const gain = file ? XP_MEDIA_POST : XP_TEXT_POST;
  const current = levelFromXp(xp);
  // 投稿するとどこまで伸びるかを、薄いバーで先に見せる
  const after = levelFromXp(xp + gain);
  const willLevelUp = after.level > current.level;
  const tier = tierFromLevel(current.level);

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

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {/* プロフィールと現在のレベル・横線プログレスバー */}
          <div className="rounded-lg border border-ink-200 bg-ink-50 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10">
                  <Avatar name={session.name || "?"} avatarUrl={session.avatarUrl} size="md" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-900">
                    {session.name || "名前未設定"}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-ink-500">
                    <LevelIcon rank={tier.rank} size={12} />
                    レベル {current.level}
                    <span className="text-ink-400">
                      ・次まで あと {current.remaining}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={onProfileEdit}
                className="rounded-md border border-ink-200 bg-surface px-2.5 py-1 text-xs font-medium text-ink-600 transition hover:border-ink-400 hover:text-ink-900"
              >
                画像変更
              </button>
            </div>

            {/* 横線プログレスバー（アクセシブル対応） */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-ink-500">
                  Lv.{current.level} 進捗
                </span>
                <span className="text-ink-600 font-medium">
                  {Math.round(current.progress * 100)}%
                  {willLevelUp ? (
                    <span className="ml-1.5 font-semibold text-accent">
                      → Lv.{after.level} UP!
                    </span>
                  ) : (
                    after.progress > current.progress && (
                      <span className="ml-1.5 font-medium text-accent">
                        → {Math.round(after.progress * 100)}%
                      </span>
                    )
                  )}
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={Math.round(current.progress * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`レベル${current.level}の経験値進捗`}
                className="relative h-2 w-full overflow-hidden rounded-full bg-ink-200"
              >
                {/* 投稿後見込みプレビューバー */}
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-accent/40 transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.max(0, (willLevelUp ? 1 : after.progress) * 100))}%`,
                  }}
                />
                {/* 現在の進捗バー */}
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-accent transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.max(0, current.progress * 100))}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* 受付状態・締切に関する注意表示 */}
          {!postStatus.allowed ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 flex items-start gap-2.5">
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
            <div className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-white/60 flex items-center justify-between">
              <span>※ 運営アカウントのため受付状態に関わらず投稿可能です</span>
              {settings?.postDeadline && (
                <span className="text-white/40">締切: {formatJstDateTime(settings.postDeadline)}</span>
              )}
            </div>
          ) : settings?.postDeadline ? (
            <div className="rounded-md border border-ink-200 bg-ink-50 px-3 py-1.5 text-[11px] text-ink-500 flex items-center gap-1.5">
              <Clock size={12} className="text-ink-400" />
              <span>投稿締切: {formatJstDateTime(settings.postDeadline)} まで</span>
            </div>
          ) : null}

          {/* 投稿テーマ・ガイド（常時表示） */}
          <div className="rounded-lg border border-ink-200 bg-ink-50/50 p-3 space-y-2">
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
              ※ 写真付き投稿が推奨されていますが、テキストのみの投稿（+10 XP）も可能です。
            </p>
          </div>

          {/* テキスト */}
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-500">
              メッセージ
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="意気込み・思い出・激励のメッセージを..."
              rows={4}
              className="w-full resize-none rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-900 outline-none focus:border-accent"
            />
          </div>

          {/* メディアプレビュー */}
          {preview && file && (
            <div className="relative overflow-hidden rounded-lg border border-ink-200 bg-media">
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
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-ink-300 px-3 py-3 text-sm text-ink-500 transition hover:border-accent hover:text-ink-800"
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

          {/* 経験値の案内 */}
          <p className="text-center text-xs text-ink-500">
            この投稿で <span className="font-semibold text-ink-900">+{gain}</span>
            {file ? "（画像・動画つき）" : `　画像・動画をつけると +${XP_MEDIA_POST}`}
            {willLevelUp && (
              <span className="ml-1 font-semibold text-ink-900">
                ・レベル{after.level}に上がります
              </span>
            )}
          </p>

          {/* アップロード進捗 */}
          {submitting && file && (
            <div className="space-y-1">
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
