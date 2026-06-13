"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PenSquare, Monitor, MessageSquareText, Loader2 } from "lucide-react";
import type { Post, AuthorRole } from "@/lib/types";
import { subscribePosts } from "@/lib/posts";
import { useNow } from "@/lib/useNow";
import PostCard from "./PostCard";
import PostComposer from "./PostComposer";
import SetupNotice from "./SetupNotice";

const NAME_KEY = "academy26_name";
const ROLE_KEY = "academy26_role";

export default function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState<AuthorRole>("academy");
  // 1分ごとに現在時刻を更新し「◯分前」をリアルタイム表示
  const now = useNow(60_000);

  const firebaseConfigured =
    !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  // 名前・立場をローカル保存から復元
  useEffect(() => {
    const savedName = localStorage.getItem(NAME_KEY);
    if (savedName) setName(savedName);
    const savedRole = localStorage.getItem(ROLE_KEY);
    if (savedRole === "academy" || savedRole === "lom") setRole(savedRole);
  }, []);

  const handleNameChange = (v: string) => {
    setName(v);
    localStorage.setItem(NAME_KEY, v);
  };

  const handleRoleChange = (v: AuthorRole) => {
    setRole(v);
    localStorage.setItem(ROLE_KEY, v);
  };

  // リアルタイム購読
  useEffect(() => {
    if (!firebaseConfigured) {
      setLoading(false);
      return;
    }
    let unsub: (() => void) | undefined;
    try {
      unsub = subscribePosts(
        (list) => {
          setPosts(list);
          setError(null);
          setLoading(false);
        },
        (err) => {
          // 読み取り権限エラーなど
          const isPermission = /permission/i.test(err.message);
          setError(
            isPermission
              ? "permission"
              : "データの取得に失敗しました。通信環境をご確認ください。"
          );
          setLoading(false);
        }
      );
    } catch (e) {
      console.error(e);
      setError("接続に失敗しました。設定をご確認ください。");
      setLoading(false);
    }
    return () => unsub?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseConfigured]);

  return (
    <div className="min-h-screen bg-ink-50">
      {/* ヘッダー */}
      <header className="sticky top-0 z-30 border-b border-ink-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-ink-900 text-sm font-bold text-white">
              26
            </div>
            <div className="leading-tight">
              <h1 className="text-sm font-bold text-ink-900">26アカデミー</h1>
              <p className="text-[11px] text-ink-400">例会SNS</p>
            </div>
          </div>
          <Link
            href="/screen"
            className="flex items-center gap-1.5 rounded-md border border-ink-200 px-2.5 py-1.5 text-xs font-medium text-ink-600 transition hover:border-ink-400 hover:text-ink-900"
          >
            <Monitor size={15} />
            <span className="hidden sm:inline">スクリーン表示</span>
          </Link>
        </div>
      </header>

      {/* メイン */}
      <main className="mx-auto max-w-xl px-4 pb-28 pt-5">
        {!firebaseConfigured && <SetupNotice />}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-ink-400">
            <Loader2 size={28} className="animate-spin" />
            <p className="mt-3 text-sm">読み込み中...</p>
          </div>
        ) : error === "permission" ? (
          <div className="mx-auto max-w-md rounded-xl border border-ink-300 bg-white px-5 py-6 text-center">
            <p className="text-base font-semibold text-ink-900">
              データベースに接続できません
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">
              Firebase Realtime Database の読み取りが許可されていません。
              Firebaseコンソールで <code className="rounded bg-ink-100 px-1">posts</code>{" "}
              のセキュリティルール(読み書き許可)を設定してください。
            </p>
          </div>
        ) : error ? (
          <div className="py-24 text-center text-sm text-ink-500">{error}</div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <MessageSquareText size={40} className="text-ink-300" />
            <p className="mt-4 text-base font-medium text-ink-700">
              まだ投稿がありません
            </p>
            <p className="mt-1 text-sm text-ink-400">
              最初の意気込みを投稿してみましょう
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                commenterName={name}
                onCommenterNameChange={handleNameChange}
                now={now}
              />
            ))}
          </div>
        )}
      </main>

      {/* 投稿ボタン(FAB) */}
      <button
        onClick={() => setComposerOpen(true)}
        className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink-900 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-ink-700 active:scale-95"
      >
        <PenSquare size={18} />
        投稿する
      </button>

      <PostComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        defaultName={name}
        onNameChange={handleNameChange}
        role={role}
        onRoleChange={handleRoleChange}
      />
    </div>
  );
}
