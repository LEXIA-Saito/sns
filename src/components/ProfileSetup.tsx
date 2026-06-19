"use client";

import { useRef, useState } from "react";
import { X, Camera, GraduationCap, Users, Loader2 } from "lucide-react";
import type { AuthorRole } from "@/lib/types";
import { uploadAvatarImage } from "@/lib/posts";
import Avatar from "./Avatar";
import { cn } from "@/lib/utils";

interface ProfileSetupProps {
  open: boolean;
  onClose: () => void;
  defaultName: string;
  defaultRole: AuthorRole;
  defaultAvatarUrl?: string;
  onSave: (name: string, role: AuthorRole, avatarUrl?: string) => void;
}

export default function ProfileSetup({
  open,
  onClose,
  defaultName,
  defaultRole,
  defaultAvatarUrl,
  onSave,
}: ProfileSetupProps) {
  const [name, setName] = useState(defaultName);
  const [role, setRole] = useState<AuthorRole>(defaultRole);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(defaultAvatarUrl);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleFile = async (f: File | null) => {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      alert("ファイルサイズは5MB以下にしてください");
      return;
    }
    
    setIsUploading(true);
    try {
      const url = await uploadAvatarImage(f);
      setAvatarUrl(url);
    } catch (e) {
      console.error(e);
      alert("画像のアップロードに失敗しました");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert("お名前を入力してください");
      return;
    }
    onSave(name.trim(), role, avatarUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <h2 className="text-base font-semibold text-ink-900">プロフィール設定</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-900"
            aria-label="閉じる"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6 px-5 py-6">
          {/* アバター画像 */}
          <div className="flex flex-col items-center">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Avatar name={name || "?"} role={role} avatarUrl={avatarUrl} size="xl" />
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition group-hover:opacity-100">
                {isUploading ? (
                  <Loader2 size={24} className="animate-spin text-white" />
                ) : (
                  <Camera size={24} className="text-white" />
                )}
              </div>
            </div>
            <button
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
          </div>

          {/* 名前 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-500">
              お名前
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例:齋藤 雅人"
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-900 outline-none focus:border-ink-500"
            />
          </div>

          {/* 種別 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-500">
              あなたの立場
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("academy")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition",
                  role === "academy"
                    ? "border-ink-900 bg-ink-900 text-white"
                    : "border-ink-200 text-ink-600 hover:border-ink-400"
                )}
              >
                <GraduationCap size={16} />
                アカデミー
              </button>
              <button
                type="button"
                onClick={() => setRole("lom")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition",
                  role === "lom"
                    ? "border-ink-900 bg-ink-900 text-white"
                    : "border-ink-200 text-ink-600 hover:border-ink-400"
                )}
              >
                <Users size={16} />
                LOMメンバー
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-ink-100 px-5 py-4">
          <button
            onClick={handleSave}
            disabled={isUploading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink-900 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-700 disabled:opacity-50"
          >
            保存する
          </button>
        </div>
      </div>
    </div>
  );
}
