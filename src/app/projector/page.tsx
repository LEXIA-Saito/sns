"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useRef } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Settings,
  Shield,
} from "lucide-react";
import AdminOnly from "@/components/AdminOnly";
import Avatar from "@/components/Avatar";
import LevelBadge from "@/components/LevelBadge";
import type { Post } from "@/lib/types";
import { subscribePosts } from "@/lib/posts";
import { filterVisiblePosts } from "@/lib/moderation";
import { xpByAccount } from "@/lib/level";

export default function ProjectorPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [intervalSec, setIntervalSec] = useState(10); // 秒
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageError, setImageError] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 投稿購読
  useEffect(() => {
    const unsub = subscribePosts((list) => {
      setPosts(list);
    });
    return () => unsub();
  }, []);

  // 公開投稿のみ
  const visiblePosts = useMemo(() => {
    return filterVisiblePosts(posts);
  }, [posts]);

  // アカウント経験値マップ
  const xpMap = useMemo(() => {
    return xpByAccount(posts);
  }, [posts]);

  const currentPost: Post | undefined = visiblePosts[currentIndex];

  // 自動切り替えタイマー
  useEffect(() => {
    if (!isPlaying || visiblePosts.length <= 1) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % visiblePosts.length);
      setImageError(false);
    }, intervalSec * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, visiblePosts.length, intervalSec, currentIndex]);

  // マウス静止時にコントロールを自動非表示
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
      hideControlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    };
  }, []);

  // 全画面切り替え
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } catch (e) {
        console.error("Fullscreen request failed", e);
      }
    } else {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (e) {
        console.error("Exit fullscreen failed", e);
      }
    }
  };

  const handlePrev = () => {
    if (visiblePosts.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + visiblePosts.length) % visiblePosts.length);
    setImageError(false);
  };

  const handleNext = () => {
    if (visiblePosts.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % visiblePosts.length);
    setImageError(false);
  };

  // 表示中投稿の公開コメント

  return (
    <AdminOnly
      title="投影モード（16:9スライドショー）"
      description="この画面は公式運営アカウント（26-000）のみ利用可能です。"
    >
      <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#080808] text-white select-none">
        {/* メイン表示エリア (16:9 アスペクトにフィット) */}
        {visiblePosts.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center text-center p-8">
            <div>
              <p className="text-3xl font-bold tracking-wider text-white/40">
                26アカデミー 例会SNS
              </p>
              <p className="mt-4 text-xl text-white/25">
                現在、公開中の投稿はありません
              </p>
            </div>
          </div>
        ) : !currentPost ? null : (
          <div className="flex h-full w-full flex-col lg:flex-row items-center justify-center p-6 md:p-12 gap-8 md:gap-12">
            {/* 左側: メディア表示エリア */}
            {currentPost.media && !imageError ? (
              <div className="flex h-full w-full lg:w-3/5 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-black/60 shadow-2xl p-2">
                {currentPost.media.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentPost.media.url}
                    alt={currentPost.name}
                    className="max-h-[82vh] w-auto max-w-full object-contain rounded-xl"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <video
                    src={currentPost.media.url}
                    controls
                    playsInline
                    className="max-h-[82vh] w-auto max-w-full object-contain rounded-xl"
                  />
                )}
              </div>
            ) : null}

            {/* 右側 (またはメディア無し時は中央): 投稿情報 */}
            <div
              className={`flex flex-col justify-between ${
                currentPost.media && !imageError
                  ? "w-full lg:w-2/5 h-full max-h-[82vh]"
                  : "w-full max-w-4xl h-full max-h-[75vh] border border-white/20 rounded-3xl bg-white/[0.03] p-10 shadow-2xl"
              }`}
            >
              {/* 投稿者ヘッダー */}
              <div>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 md:h-20 md:w-20 shrink-0">
                    <Avatar
                      name={currentPost.name}
                      avatarUrl={currentPost.avatarUrl}
                      size="lg"
                    />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-2xl md:text-4xl font-extrabold tracking-wide">
                        {currentPost.name}
                      </span>
                      <LevelBadge xp={currentPost.accountId ? xpMap[currentPost.accountId] ?? 0 : 0} />
                    </div>
                    <p className="mt-1 text-sm md:text-base text-white/50 font-mono">
                      {currentPost.accountId}
                    </p>
                  </div>
                </div>

                {/* 投稿本文（会場後方から読める特大サイズ） */}
                {currentPost.text && (
                  <div className="mt-6 md:mt-8">
                    <p className="text-xl md:text-2xl lg:text-3xl font-medium leading-relaxed md:leading-normal text-white/95 whitespace-pre-wrap break-words">
                      {currentPost.text}
                    </p>
                  </div>
                )}
              </div>

              {/* 投稿番号インジケータ */}
              <div className="mt-4 flex items-center justify-between text-xs text-white/40 font-mono">
                <span>26アカデミー 例会SNS</span>
                <span>
                  {currentIndex + 1} / {visiblePosts.length}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 運営用フローティングコントロールバー（通常は自動非表示） */}
        <div
          className={`absolute bottom-6 left-1/2 -translate-x-1/2 transition-opacity duration-300 ${
            showControls ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        >
          <div className="flex items-center gap-3 rounded-full border border-white/20 bg-black/80 px-5 py-2.5 shadow-2xl backdrop-blur-md">
            <Link
              href="/admin"
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 hover:text-white transition"
              title="管理画面へ"
            >
              <Shield size={14} />
              <span>管理画面</span>
            </Link>

            <div className="h-4 w-px bg-white/20" />

            {/* 前へ / 再生停止 / 次へ */}
            <button
              onClick={handlePrev}
              className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white transition"
              aria-label="前の投稿へ"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="rounded-full bg-white text-black p-2.5 hover:bg-white/90 transition shadow"
              aria-label={isPlaying ? "一時停止" : "再生"}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} className="translate-x-0.5" />}
            </button>
            <button
              onClick={handleNext}
              className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white transition"
              aria-label="次の投稿へ"
            >
              <ChevronRight size={20} />
            </button>

            <div className="h-4 w-px bg-white/20" />

            {/* 秒数切り替え */}
            <select
              value={intervalSec}
              onChange={(e) => setIntervalSec(Number(e.target.value))}
              className="rounded-lg bg-white/10 px-2 py-1 text-xs text-white outline-none border border-white/10"
              title="切り替え間隔"
            >
              <option value={6} className="bg-neutral-900">速い (6秒)</option>
              <option value={10} className="bg-neutral-900">標準 (10秒)</option>
              <option value={18} className="bg-neutral-900">ゆっくり (18秒)</option>
            </select>

            {/* 全画面化ボタン */}
            <button
              onClick={toggleFullscreen}
              className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white transition"
              title="全画面表示"
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>
        </div>
      </div>
    </AdminOnly>
  );
}
