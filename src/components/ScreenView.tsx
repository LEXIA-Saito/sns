"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageCircle, Radio } from "lucide-react";
import type { Post } from "@/lib/types";
import { subscribePosts, commentsToArray } from "@/lib/posts";
import { formatRelativeTime } from "@/lib/utils";
import { useNow } from "@/lib/useNow";
import Avatar from "./Avatar";
import RoleBadge from "./RoleBadge";

export default function ScreenView() {
  const [posts, setPosts] = useState<Post[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const now = useNow(60_000);

  useEffect(() => {
    const unsub = subscribePosts((list) => setPosts(list));
    return () => unsub();
  }, []);

  // 自動スクロール(ゆっくり上下に巡回)
  useEffect(() => {
    if (!autoScroll) return;
    const el = scrollRef.current;
    if (!el) return;
    let dir = 1;
    const interval = setInterval(() => {
      if (!el) return;
      const atBottom =
        el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
      const atTop = el.scrollTop <= 0;
      if (atBottom) dir = -1;
      if (atTop) dir = 1;
      el.scrollBy({ top: dir * 1, behavior: "auto" });
    }, 30);
    return () => clearInterval(interval);
  }, [autoScroll]);

  return (
    <div className="flex h-screen flex-col bg-ink-950 text-white">
      {/* ヘッダー */}
      <header className="flex shrink-0 items-center justify-between border-b border-ink-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <img
            src="/The_Year_of_the_fire_academy%20(1).svg"
            alt="26アカデミー ロゴ"
            className="h-12 w-12 rounded-lg bg-white object-contain p-1"
          />
          <div>
            <h1 className="text-xl font-bold">26アカデミー 例会SNS</h1>
            <p className="text-xs text-ink-400">
              みんなの意気込み・激励をリアルタイムでお届け
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-xs text-ink-300">
            <Radio size={14} className="animate-pulse text-white" />
            LIVE
          </span>
          <button
            onClick={() => setAutoScroll((v) => !v)}
            className="rounded-md border border-ink-700 px-3 py-1.5 text-xs text-ink-300 transition hover:border-ink-500 hover:text-white"
          >
            自動スクロール: {autoScroll ? "ON" : "OFF"}
          </button>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-md border border-ink-700 px-3 py-1.5 text-xs text-ink-300 transition hover:border-ink-500 hover:text-white"
          >
            <ArrowLeft size={14} />
            戻る
          </Link>
        </div>
      </header>

      {/* 投稿グリッド */}
      <div
        ref={scrollRef}
        className="no-scrollbar flex-1 overflow-y-auto px-6 py-6"
        onMouseEnter={() => setAutoScroll(false)}
      >
        {posts.length === 0 ? (
          <div className="flex h-full items-center justify-center text-ink-500">
            <p className="text-lg">投稿をお待ちしています…</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => {
              const comments = commentsToArray(post.comments);
              return (
                <article
                  key={post.id}
                  className="animate-fade-in-up flex flex-col overflow-hidden rounded-xl border border-ink-800 bg-ink-900"
                >
                  <header className="flex items-center gap-3 px-4 pt-4">
                    <Avatar name={post.name} role={post.role} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-semibold">
                          {post.name}
                        </span>
                        <RoleBadge role={post.role} />
                      </div>
                      <time className="text-xs text-ink-500">
                        {formatRelativeTime(post.createdAt, now)}
                      </time>
                    </div>
                  </header>

                  {post.text && (
                    <p className="whitespace-pre-wrap break-words px-4 py-3 text-[15px] leading-relaxed text-ink-100">
                      {post.text}
                    </p>
                  )}

                  {post.media && (
                    <div className="bg-black">
                      {post.media.type === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={post.media.url}
                          alt=""
                          className="max-h-72 w-full object-contain"
                        />
                      ) : (
                        <video
                          src={post.media.url}
                          autoPlay
                          muted
                          loop
                          playsInline
                          className="max-h-72 w-full object-contain"
                        />
                      )}
                    </div>
                  )}

                  {comments.length > 0 && (
                    <div className="mt-auto space-y-1.5 border-t border-ink-800 bg-ink-950/40 px-4 py-3">
                      <div className="mb-1 flex items-center gap-1 text-xs text-ink-500">
                        <MessageCircle size={13} />
                        {comments.length}件のコメント
                      </div>
                      {comments.slice(-3).map((c) => (
                        <p key={c.id} className="text-sm text-ink-200">
                          <span className="font-semibold">{c.name}</span>{" "}
                          <span className="text-ink-300">{c.text}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
