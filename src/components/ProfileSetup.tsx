"use client";

import { useRef, useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { PixelX, PixelCamera, PixelLogOut } from "./PixelIcon";
import { uploadAvatarImage } from "@/lib/posts";
import Avatar from "./Avatar";

interface ProfileSetupProps {
  open: boolean;
  /** 名前未設定のうちは閉じられない(投稿者が誰か分からなくなるため) */
  required?: boolean;
  accountId: string;
  onClose: () => void;
  defaultName: string;
  defaultAvatarUrl?: string;
  onSave: (name: string, avatarUrl?: string) => void;
  onLogout: () => void;
}

export default function ProfileSetup({
  open,
  required = false,
  accountId,
  onClose,
  defaultName,
  defaultAvatarUrl,
  onSave,
  onLogout,
}: ProfileSetupProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(defaultAvatarUrl);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setAvatarUrl(defaultAvatarUrl);
    }
  }, [defaultAvatarUrl, open]);

  if (!open) return null;

  const handleFile = async (f: File | null) => {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      alert("ファイルサイズは5MB以下にしてください");
      return;
    }

    setIsUploading(true);
    try {
      const url = await uploadAvatarImage(f, accountId);
      setAvatarUrl(url);
    } catch (e) {
      console.error(e);
      alert("画像のアップロードに失敗しました");
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    if (!confirm("プロフィール画像を、名前のみの初期表示に戻します。よろしいですか？")) {
      return;
    }
    setAvatarUrl(undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = () => {
    onSave(defaultName, avatarUrl);
    onClose();
  };

  const handleLogout = () => {
    if (!confirm("ログアウトします。次に使うときはカードのIDとパスワードが必要です。")) {
      return;
    }
    onLogout();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink-900">
              {required ? "はじめにプロフィール設定" : "プロフィール設定"}
            </h2>
            <p className="mt-0.5 text-[11px] text-ink-400">カード番号 {accountId}</p>
          </div>
          {!required && (
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-900"
              aria-label="閉じる"
            >
              <PixelX size={18} />
            </button>
          )}
        </div>

        <div className="space-y-6 px-5 py-6">
          {required && (
            <p className="rounded-lg bg-ink-50 px-3 py-2.5 text-xs leading-relaxed text-ink-600">
              投稿に表示されるプロフィール画像を設定できます。あとから変更できます。
            </p>
          )}

          {/* アバター画像 */}
          <div className="flex flex-col items-center">
            <div
              className="relative group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Avatar name={defaultName || "?"} avatarUrl={avatarUrl} size="xl" />
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition group-hover:opacity-100">
                {isUploading ? (
                  <Loader2 size={24} className="animate-spin text-white" />
                ) : (
                  <PixelCamera size={24} className="text-white" />
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="mt-3 text-sm font-medium text-ink-600 hover:text-ink-900 transition"
            >
              {isUploading ? "アップロード中..." : "画像を変更"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            {avatarUrl && (
              <button
                type="button"
                onClick={handleReset}
                disabled={isUploading}
                className="mt-1.5 text-xs font-medium text-ink-400 transition hover:text-ink-700 disabled:opacity-50"
              >
                デフォルトに戻す
              </button>
            )}

            {/* お名前（入力枠や固定バッジを排したシンプルなテキスト表示） */}
            <p className="mt-4 text-base font-bold text-ink-900">{defaultName}</p>
          </div>
        </div>

        <div className="border-t border-ink-100 px-5 py-4">
          <button
            onClick={handleSave}
            disabled={isUploading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-fg transition hover:bg-accent-hover disabled:opacity-50"
          >
            保存する
          </button>
          {/* 名前未設定でも、別のカードで入り直せるようにログアウトは常に出す */}
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center justify-center gap-1.5 text-xs font-medium text-ink-400 transition hover:text-ink-700"
          >
            <PixelLogOut size={14} />
            ログアウト
          </button>
        </div>
      </div>
    </div>
  );
}
