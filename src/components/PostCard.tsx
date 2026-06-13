"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import type { Post } from "@/lib/types";
import { commentsToArray } from "@/lib/posts";
import { formatRelativeTime } from "@/lib/utils";
import Avatar from "./Avatar";
import RoleBadge from "./RoleBadge";
import CommentSection from "./CommentSection";

interface PostCardProps {
  post: Post;
  commenterName: string;
  onCommenterNameChange: (name: string) => void;
}

export default function PostCard({
  post,
  commenterName,
  onCommenterNameChange,
}: PostCardProps) {
  const comments = commentsToArray(post.comments);
  const [open, setOpen] = useState(false);

  return (
    <article className="animate-fade-in-up overflow-hidden rounded-xl border border-ink-200 bg-white shadow-sm">
      {/* ヘッダー */}
      <header className="flex items-center gap-3 px-4 pt-4">
        <Avatar name={post.name} role={post.role} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate font-semibold text-ink-900">
              {post.name}
            </span>
            <RoleBadge role={post.role} />
          </div>
          <time className="text-xs text-ink-400">
            {formatRelativeTime(post.createdAt)}
          </time>
        </div>
      </header>

      {/* 本文 */}
      {post.text && (
        <p className="whitespace-pre-wrap break-words px-4 py-3 text-[15px] leading-relaxed text-ink-800">
          {post.text}
        </p>
      )}

      {/* メディア */}
      {post.media && (
        <div className="bg-ink-950">
          {post.media.type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.media.url}
              alt="投稿画像"
              className="max-h-[70vh] w-full object-contain"
              loading="lazy"
            />
          ) : (
            <video
              src={post.media.url}
              controls
              playsInline
              className="max-h-[70vh] w-full object-contain"
            />
          )}
        </div>
      )}

      {/* アクション */}
      <div className="flex items-center gap-1 px-4 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-ink-500 transition hover:bg-ink-100 hover:text-ink-900"
        >
          <MessageCircle size={17} />
          <span>
            {comments.length > 0 ? `コメント ${comments.length}` : "コメント"}
          </span>
        </button>
      </div>

      {/* コメント欄 */}
      {(open || comments.length > 0) && (
        <CommentSection
          postId={post.id}
          comments={comments}
          defaultName={commenterName}
          onNameChange={onCommenterNameChange}
        />
      )}
    </article>
  );
}
