"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import type { Comment } from "@/lib/types";
import type { Session } from "@/lib/session";
import { addComment } from "@/lib/posts";
import { formatRelativeTime } from "@/lib/utils";
import Avatar from "./Avatar";

interface CommentSectionProps {
  postId: string;
  comments: Comment[];
  session: Session;
  now: number;
}

export default function CommentSection({
  postId,
  comments,
  session,
  now,
}: CommentSectionProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      await addComment(
        postId,
        session.accountId,
        session.name,
        body,
        session.avatarUrl
      );
      setText("");
    } catch (e) {
      console.error(e);
      alert("コメントの送信に失敗しました");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t border-ink-100 bg-ink-50/50 px-4 py-3">
      {comments.length > 0 && (
        <ul className="mb-3 space-y-2">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-2 text-sm">
              <Avatar name={c.name} role="academy" avatarUrl={c.avatarUrl} size="sm" />
              <div className="flex-1">
                <span className="font-semibold text-ink-800">{c.name}</span>
                <span className="ml-2 whitespace-pre-wrap break-words text-ink-700">
                  {c.text}
                </span>
                <span className="ml-2 text-[11px] text-ink-400">
                  {formatRelativeTime(c.createdAt, now)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end gap-2">
        <div className="flex flex-1 items-end gap-2">
          <Avatar
            name={session.name || "?"}
            role={session.role}
            avatarUrl={session.avatarUrl}
            size="sm"
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`${session.name || "あなた"} としてコメント...`}
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleSend();
              }
            }}
            className="block h-9 w-full resize-none rounded-md border border-ink-200 bg-white px-3 py-2 text-sm leading-5 text-ink-800 outline-none focus:border-accent"
          />
        </div>
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !text.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-fg transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="コメントを送信"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
