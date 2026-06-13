"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import type { Comment } from "@/lib/types";
import { addComment } from "@/lib/posts";
import { formatRelativeTime } from "@/lib/utils";

interface CommentSectionProps {
  postId: string;
  comments: Comment[];
  defaultName: string;
  onNameChange: (name: string) => void;
  now: number;
}

export default function CommentSection({
  postId,
  comments,
  defaultName,
  onNameChange,
  now,
}: CommentSectionProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const name = defaultName.trim();
    const body = text.trim();
    if (!name) {
      alert("お名前を入力してください");
      return;
    }
    if (!body) return;
    setSending(true);
    try {
      await addComment(postId, name, body);
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
            <li key={c.id} className="text-sm">
              <span className="font-semibold text-ink-800">{c.name}</span>
              <span className="ml-2 whitespace-pre-wrap break-words text-ink-700">
                {c.text}
              </span>
              <span className="ml-2 text-[11px] text-ink-400">
                {formatRelativeTime(c.createdAt, now)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <input
            type="text"
            value={defaultName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="お名前"
            className="mb-1.5 w-28 rounded-md border border-ink-200 bg-white px-2 py-1 text-xs text-ink-800 outline-none focus:border-ink-500"
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="激励コメントを入力..."
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleSend();
              }
            }}
            className="w-full resize-none rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 outline-none focus:border-ink-500"
          />
        </div>
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !text.trim()}
          className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-ink-900 text-white transition hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="コメントを送信"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
