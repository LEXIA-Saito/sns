"use client";

import { useState } from "react";
import { AlertCircle, Clock } from "lucide-react";
import { PixelSend } from "./PixelIcon";
import type { Comment, AppSettings } from "@/lib/types";
import type { Session } from "@/lib/session";
import { addComment } from "@/lib/posts";
import { checkText, NG_BLOCK_MESSAGE, NG_WARN_MESSAGE } from "@/lib/ngwords";
import { filterVisibleComments } from "@/lib/moderation";
import { canCreateComment, formatJstDateTime } from "@/lib/settings";
import { formatRelativeTime } from "@/lib/utils";
import Avatar from "./Avatar";

interface CommentSectionProps {
  postId: string;
  comments: Comment[];
  session: Session;
  now: number;
  settings?: AppSettings | null;
}

export default function CommentSection({
  postId,
  comments,
  session,
  now,
  settings,
}: CommentSectionProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  // 非表示コメントを除外
  const visibleComments = filterVisibleComments(comments);
  const commentStatus = canCreateComment(settings, now, session.admin === true);

  const handleSend = async () => {
    if (!commentStatus.allowed) {
      alert(commentStatus.reason || "コメント受付は停止しています。");
      return;
    }
    const body = text.trim();
    if (!body) return;
    const ng = checkText(body);
    if (ng.level === "block") {
      alert(NG_BLOCK_MESSAGE);
      return;
    }
    if (ng.level === "warn" && !confirm(NG_WARN_MESSAGE)) {
      return;
    }
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
    <div className="border-t border-ink-100 bg-ink-50/50 px-4 py-3 space-y-3">
      {visibleComments.length > 0 && (
        <ul className="space-y-2">
          {visibleComments.map((c) => (
            <li key={c.id} className="flex gap-2 text-sm">
              <Avatar name={c.name} avatarUrl={c.avatarUrl} size="sm" />
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

      {/* 受付状態の注意表示 */}
      {!commentStatus.allowed ? (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300 flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0 text-amber-400" />
          <span>{commentStatus.reason}</span>
        </div>
      ) : session.admin ? (
        <div className="text-[11px] text-white/50">
          ※ 運営アカウントのため受付停止中もコメント可能です
        </div>
      ) : null}

      {/* コメント入力エリア */}
      <div className="flex items-end gap-2">
        <div className="flex flex-1 items-end gap-2">
          <Avatar name={session.name || "?"} avatarUrl={session.avatarUrl} size="sm" />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!commentStatus.allowed}
            placeholder={
              !commentStatus.allowed
                ? "コメントの受付は終了しています"
                : `${session.name || "あなた"} としてコメント...`
            }
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleSend();
              }
            }}
            className="block h-9 w-full resize-none rounded-md border border-ink-200 bg-surface px-3 py-2 text-sm leading-5 text-ink-800 outline-none focus:border-accent disabled:cursor-not-allowed disabled:bg-ink-100/50 disabled:text-ink-400"
          />
        </div>
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !text.trim() || !commentStatus.allowed}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-fg transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="コメントを送信"
        >
          <PixelSend size={16} />
        </button>
      </div>
    </div>
  );
}
