"use client";

import { useRef, useState } from "react";
import { X, ImagePlus, Film, Loader2, GraduationCap, Users } from "lucide-react";
import type { AuthorRole } from "@/lib/types";
import { createPost } from "@/lib/posts";
import { cn } from "@/lib/utils";
import Avatar from "./Avatar";

interface PostComposerProps {
  open: boolean;
  onClose: () => void;
  defaultName: string;
  onNameChange: (name: string) => void;
  role: AuthorRole;
  onRoleChange: (role: AuthorRole) => void;
  avatarUrl?: string;
  onProfileEdit: () => void;
}

const MAX_FILE_MB = 50;

export default function PostComposer({
  open,
  onClose,
  defaultName,
  onNameChange,
  role,
  onRoleChange,
  avatarUrl,
  onProfileEdit,
}: PostComposerProps) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const name = defaultName.trim();
    if (!name) {
      alert("お名前を入力してください");
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
        name,
        role,
        avatarUrl,
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/40 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
          <h2 className="text-base font-semibold text-ink-900">投稿する</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-900"
            aria-label="閉じる"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {/* プロフィール (編集ボタンつき) */}
          <div className="flex items-center justify-between rounded-lg border border-ink-200 bg-ink-50 p-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10">
                <Avatar name={defaultName || "?"} role={role} avatarUrl={avatarUrl} size="md" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink-900">{defaultName || "名前未設定"}</p>
                <p className="text-xs text-ink-500">
                  {role === "academy" ? "アカデミー" : "LOMメンバー"}
                </p>
              </div>
            </div>
            <button
              onClick={onProfileEdit}
              className="rounded-md border border-ink-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-600 transition hover:border-ink-400 hover:text-ink-900"
            >
              変更
            </button>
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
              className="w-full resize-none rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-900 outline-none focus:border-ink-500"
            />
          </div>

          {/* メディアプレビュー */}
          {preview && file && (
            <div className="relative overflow-hidden rounded-lg border border-ink-200 bg-ink-950">
              {file.type.startsWith("video/") ? (
                <video src={preview} className="max-h-64 w-full object-contain" controls />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="プレビュー" className="max-h-64 w-full object-contain" />
              )}
              <button
                onClick={clearFile}
                className="absolute right-2 top-2 rounded-full bg-ink-950/70 p-1.5 text-white transition hover:bg-ink-950"
                aria-label="メディアを削除"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* メディア追加ボタン */}
          {!file && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-dashed border-ink-300 px-3 py-3 text-sm text-ink-500 transition hover:border-ink-500 hover:text-ink-800"
              >
                <ImagePlus size={18} />
                画像
                <Film size={18} className="ml-1" />
                動画を追加
              </button>
            </div>
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
            <div className="space-y-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                <div
                  className="h-full bg-ink-900 transition-all"
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
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink-900 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                投稿中...
              </>
            ) : (
              "投稿する"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
