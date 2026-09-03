"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  PixelPen,
  PixelComment,
  PixelDatabase,
  PixelQrCode,
  PixelX,
  PixelShield,
  PixelTv,
} from "./PixelIcon";
import type { Post, AppSettings, LikesByPost } from "@/lib/types";
import {
  subscribePosts,
  subscribeSettings,
  subscribeLikes,
  recordAccountLogin,
} from "@/lib/posts";
import { filterVisiblePosts } from "@/lib/moderation";
import { canCreatePost } from "@/lib/settings";
import { useNow } from "@/lib/useNow";
import {
  buildSession,
  loadProfile,
  saveProfile,
  type Session,
} from "@/lib/session";
import { onAuthStateChanged, signOutCard } from "@/lib/auth";
import { DEMO_BASE_XP, DEMO_SESSION, buildDemoPosts } from "@/lib/demo";
import { xpByAccount } from "@/lib/level";
import PostCard from "./PostCard";
import PostComposer from "./PostComposer";
import LoginGate from "./LoginGate";
import SetupNotice from "./SetupNotice";
import ProfileSetup from "./ProfileSetup";
import Avatar from "./Avatar";

export default function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [likes, setLikes] = useState<LikesByPost>({});
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

  // ログイン状態は Firebase Auth が持つ。端末に残るので再訪時は自動で復帰する
  useEffect(() => {
    const isDemo = new URLSearchParams(window.location.search).get("demo") === "1";
    setDemo(isDemo);
    if (isDemo) {
      setSession(DEMO_SESSION);
      setPosts(buildDemoPosts(Date.now()));
      setLoading(false);
      setSessionReady(true);
      return;
    }

    // 認証の初期化が返ってこない端末（保存領域が制限されている等）でも
    // 白画面のままにせず、ログイン画面まで進める
    const fallback = window.setTimeout(() => setSessionReady(true), 5000);

    const unsubscribe = onAuthStateChanged((user) => {
      window.clearTimeout(fallback);
      if (user) {
        const s = buildSession(user.uid, loadProfile(user.uid));
        setSession(s);
        // ログイン成功時に活動履歴を記録
        recordAccountLogin(user.uid);
      } else {
        setSession(null);
      }
      setSessionReady(true);
    });
    return () => {
      window.clearTimeout(fallback);
      unsubscribe();
    };
  }, []);

  // 名前が未設定なら、プロフィール設定を必ず通す
  useEffect(() => {
    if (session && !session.name) setProfileOpen(true);
  }, [session]);

  const handleLogout = async () => {
    setProfileOpen(false);
    try {
      await signOutCard();
    } catch (e) {
      console.error(e);
      alert("ログアウトに失敗しました。通信環境をご確認ください。");
    }
  };

  const handleProfileSave = (name: string, avatarUrl?: string) => {
    if (!session) return;
    saveProfile(session.accountId, { name, avatarUrl });
    setSession({ ...session, name, avatarUrl });
  };

  // 投稿の実績から、カード番号ごとの経験値を出す（非表示投稿も実績に含む）
  const xpMap = useMemo(() => {
    const fromPosts = xpByAccount(posts);
    if (!demo) return fromPosts;
    // デモではレベルの段階が一通り見えるよう、過去ぶんを足して表示する
    const merged = { ...fromPosts };
    for (const [accountId, base] of Object.entries(DEMO_BASE_XP)) {
      merged[accountId] = (merged[accountId] ?? 0) + base;
    }
    return merged;
  }, [posts, demo]);

  // リアルタイム購読（posts, settings, likes）
  useEffect(() => {
    if (demo) return;
    if (!firebaseConfigured || !session) {
      setLoading(false);
      return;
    }
    let unsubPosts: (() => void) | undefined;
    let unsubSettings: (() => void) | undefined;
    let unsubLikes: (() => void) | undefined;

    try {
      unsubPosts = subscribePosts(
        (list) => {
          setPosts(list);
          setError(null);
          setLoading(false);
        },
        (err) => {
          const isPermission = /permission/i.test(err.message);
          setError(
            isPermission
              ? "permission"
              : "データの取得に失敗しました。通信環境をご確認ください。"
          );
          setLoading(false);
        }
      );

      unsubSettings = subscribeSettings((st) => {
        setSettings(st);
      });

      unsubLikes = subscribeLikes((lk) => {
        setLikes(lk);
      });
    } catch (e) {
      console.error(e);
      setError("接続に失敗しました。設定をご確認ください。");
      setLoading(false);
    }
    return () => {
      unsubPosts?.();
      unsubSettings?.();
      unsubLikes?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseConfigured, demo, session?.accountId]);

  // 一般フィードでは非表示投稿を除外
  const visiblePosts = useMemo(() => {
    return filterVisiblePosts(posts);
  }, [posts]);

  // 新規投稿の受付状態判定
  const postStatus = useMemo(() => {
    return canCreatePost(settings, now, session?.admin === true);
  }, [settings, now, session?.admin]);

  if (!sessionReady) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-canvas text-ink-400">
        <Loader2 size={28} className="animate-spin" />
        <p className="mt-3 text-sm">読み込み中...</p>
      </div>
    );
  }

  if (!session) {
    return <LoginGate />;
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
              className="app-logo h-10 w-10 rounded-md object-contain"
            />
            <div className="leading-tight">
              <h1 className="text-sm font-bold text-ink-900">26アカデミー</h1>
              <p className="text-[11px] text-ink-400">例会SNS</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-full overflow-hidden border border-ink-200 transition hover:border-ink-400"
              aria-label="プロフィール設定"
            >
              <Avatar name={session.name || "?"} avatarUrl={session.avatarUrl} size="sm" />
            </button>

            {/* 運営アカウント用メニュー */}
            {session.admin && (
              <>
                <Link
                  href="/admin"
                  className="flex items-center gap-1 rounded-md border border-ink-200 px-2 py-1.5 text-xs font-medium text-ink-700 transition hover:border-accent hover:text-accent"
                  title="管理画面（受付管理・モデレーション・進捗）"
                  aria-label="管理画面"
                >
                  <PixelShield size={14} className="text-accent" />
                  <span className="hidden sm:inline">管理</span>
                </Link>
                <Link
                  href="/projector"
                  className="flex items-center gap-1 rounded-md border border-ink-200 px-2 py-1.5 text-xs font-medium text-ink-700 transition hover:border-accent hover:text-accent"
                  title="会場投影用スライドショー"
                  aria-label="投影画面"
                >
                  <PixelTv size={14} />
                  <span className="hidden sm:inline">投影</span>
                </Link>
                <Link
                  href="/status"
                  className="flex items-center gap-1 rounded-md border border-ink-200 px-2 py-1.5 text-xs font-medium text-ink-600 transition hover:border-ink-400 hover:text-ink-900"
                  title="データベースの状態を表示"
                  aria-label="データベースの状態"
                >
                  <PixelDatabase size={14} />
                  <span className="hidden md:inline">DB</span>
                </Link>
              </>
            )}

            <button
              type="button"
              onClick={() => setQrOpen(true)}
              className="flex items-center gap-1.5 rounded-md border border-ink-200 px-2.5 py-1.5 text-xs font-medium text-ink-600 transition hover:border-ink-400 hover:text-ink-900"
              aria-label="QRコードを表示"
            >
              <PixelQrCode size={15} />
              <span className="hidden sm:inline">QR</span>
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
              Firebase Realtime Database のセキュリティルールをご確認ください。
            </p>
          </div>
        ) : error ? (
          <div className="py-24 text-center text-sm text-ink-500">{error}</div>
        ) : visiblePosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <PixelComment size={36} className="text-ink-300" />
            <p className="mt-4 text-base font-medium text-ink-700">
              まだ投稿がありません
            </p>
            <p className="mt-1 text-sm text-ink-400">
              最初の意気込みを投稿してみましょう
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visiblePosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                session={session}
                authorXp={post.accountId ? xpMap[post.accountId] ?? 0 : 0}
                now={now}
                likes={likes[post.id]}
                settings={settings}
              />
            ))}
          </div>
        )}
      </main>

      {/* サイトQRコードモーダル */}
      {qrOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/40 p-4"
          onClick={() => setQrOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-ink-200 bg-surface p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
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
                <PixelX size={18} />
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
        <PixelPen size={18} />
        <span>{postStatus.allowed ? "投稿する" : "投稿案内・締切"}</span>
      </button>

      <PostComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        session={session}
        xp={xpMap[session.accountId] ?? 0}
        onProfileEdit={() => {
          setComposerOpen(false);
          setProfileOpen(true);
        }}
        settings={settings}
        now={now}
      />

      <ProfileSetup
        open={profileOpen}
        // 名前未設定のうちは閉じさせない(投稿者が誰か分からなくなるため)
        required={!session.name}
        accountId={session.accountId}
        onClose={() => setProfileOpen(false)}
        defaultName={session.name}
        defaultAvatarUrl={session.avatarUrl}
        onSave={handleProfileSave}
        onLogout={() => void handleLogout()}
      />
    </div>
  );
}
