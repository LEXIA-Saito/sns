"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  PenSquare,
  MessageSquareText,
  Database,
  Loader2,
  QrCode,
  X,
} from "lucide-react";
import type { Post, AuthorRole } from "@/lib/types";
import { subscribePosts } from "@/lib/posts";
import { useNow } from "@/lib/useNow";
import {
  clearSession,
  loadSession,
  readLegacyProfile,
  saveSession,
  type Session,
} from "@/lib/session";
import type { AccountRecord } from "@/lib/accounts";
import { DEMO_SESSION, buildDemoPosts } from "@/lib/demo";
import PostCard from "./PostCard";
import PostComposer from "./PostComposer";
import LoginGate from "./LoginGate";
import SetupNotice from "./SetupNotice";
import ProfileSetup from "./ProfileSetup";
import Avatar from "./Avatar";

export default function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  // localStorageの読み出しが終わるまでは画面を出さない(ログイン画面のちらつき防止)
  const [sessionReady, setSessionReady] = useState(false);
  // 1分ごとに現在時刻を更新し「◯分前」をリアルタイム表示
  const now = useNow(60_000);

  const firebaseConfigured =
    !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  // デザイン確認用。?demo=1 で開くとログインなしでダミーデータを表示する
  const [demo, setDemo] = useState(false);

  // 保存済みセッションの復元(?demo=1 のときはダミーのセッション)
  useEffect(() => {
    const isDemo = new URLSearchParams(window.location.search).get("demo") === "1";
    setDemo(isDemo);
    if (isDemo) {
      setSession(DEMO_SESSION);
      setPosts(buildDemoPosts(Date.now()));
      setLoading(false);
    } else {
      setSession(loadSession());
    }
    setSessionReady(true);
  }, []);

  // 名前が未設定なら、プロフィール設定を必ず通す
  useEffect(() => {
    if (session && !session.name) setProfileOpen(true);
  }, [session]);

  const handleLogin = (account: AccountRecord) => {
    const legacy = readLegacyProfile();
    const next: Session = {
      accountId: account.id,
      ...(account.admin ? { admin: true } : {}),
      name: legacy.name,
      role: legacy.role,
      avatarUrl: legacy.avatarUrl,
      loginAt: Date.now(),
    };
    saveSession(next);
    setSession(next);
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
    setProfileOpen(false);
  };

  const handleProfileSave = (
    name: string,
    role: AuthorRole,
    avatarUrl?: string
  ) => {
    if (!session) return;
    const next: Session = { ...session, name, role, avatarUrl };
    saveSession(next);
    setSession(next);
  };

  // リアルタイム購読
  useEffect(() => {
    if (demo) return;
    if (!firebaseConfigured || !session) {
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
  }, [firebaseConfigured, demo, session?.accountId]);

  if (!sessionReady) {
    return <div className="min-h-screen bg-canvas" />;
  }

  if (!session) {
    return <LoginGate onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* ヘッダー */}
      <header className="sticky top-0 z-30 border-b border-ink-200 bg-surface/85 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo_26.png"
              alt="26アカデミー ロゴ"
              className="h-10 w-10 rounded-md object-contain"
            />
            <div className="leading-tight">
              <h1 className="text-sm font-bold text-ink-900">26アカデミー</h1>
              <p className="text-[11px] text-ink-400">例会SNS</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-full overflow-hidden border border-ink-200 transition hover:border-ink-400"
              aria-label="プロフィール設定"
            >
              <Avatar
                name={session.name || "?"}
                role={session.role}
                avatarUrl={session.avatarUrl}
                size="sm"
              />
            </button>
            <Link
              href="/status"
              className="flex items-center gap-1.5 rounded-md border border-ink-200 px-2.5 py-1.5 text-xs font-medium text-ink-600 transition hover:border-ink-400 hover:text-ink-900"
              aria-label="SSRステータスページを表示"
            >
              <Database size={15} />
              <span className="hidden sm:inline">DB状態</span>
            </Link>
            <button
              type="button"
              onClick={() => setQrOpen(true)}
              className="flex items-center gap-1.5 rounded-md border border-ink-200 px-2.5 py-1.5 text-xs font-medium text-ink-600 transition hover:border-ink-400 hover:text-ink-900"
              aria-label="QRコードを表示"
            >
              <QrCode size={15} />
              <span className="hidden sm:inline">QRコード</span>
            </button>
          </div>
        </div>
      </header>

      {/* メイン */}
      <main className="mx-auto max-w-xl px-4 pb-28 pt-5">
        {!firebaseConfigured && !demo && <SetupNotice />}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-ink-400">
            <Loader2 size={28} className="animate-spin" />
            <p className="mt-3 text-sm">読み込み中...</p>
          </div>
        ) : error === "permission" ? (
          <div className="mx-auto max-w-md rounded-xl border border-ink-300 bg-surface px-5 py-6 text-center">
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
                session={session}
                now={now}
              />
            ))}
          </div>
        )}
      </main>

      {qrOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/60 px-5 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="qr-title"
          onClick={() => setQrOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-surface p-5 text-center shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-left">
                <h2 id="qr-title" className="text-base font-bold text-ink-900">
                  サイトQRコード
                </h2>
                <p className="mt-1 text-xs text-ink-500">
                  参加者に読み取ってもらうと、このSNSを開けます。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQrOpen(false)}
                className="rounded-full p-2 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
                aria-label="QRコードを閉じる"
              >
                <X size={18} />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/QR_349524.png"
              alt="26アカデミー例会SNSのQRコード"
              className="mx-auto mt-5 aspect-square w-full max-w-72 rounded-xl border border-ink-200 bg-surface p-3 object-contain"
            />
          </div>
        </div>
      )}

      {/* 投稿ボタン(FAB) */}
      <button
        onClick={() => setComposerOpen(true)}
        className="app-fab fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-fg shadow-lg transition hover:bg-accent-hover active:scale-95"
      >
        <PenSquare size={18} />
        投稿する
      </button>

      <PostComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        session={session}
        onProfileEdit={() => {
          setComposerOpen(false);
          setProfileOpen(true);
        }}
      />

      <ProfileSetup
        open={profileOpen}
        // 名前未設定のうちは閉じさせない(投稿者が誰か分からなくなるため)
        required={!session.name}
        accountId={session.accountId}
        onClose={() => setProfileOpen(false)}
        defaultName={session.name}
        defaultRole={session.role}
        defaultAvatarUrl={session.avatarUrl}
        onSave={handleProfileSave}
        onLogout={handleLogout}
      />
    </div>
  );
}
