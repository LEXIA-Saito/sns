"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Lock } from "lucide-react";
import { ADMIN_ACCOUNT_ID, onAuthStateChanged } from "@/lib/auth";

/**
 * 運営用カード（26-000）でログインしているときだけ中身を出す。
 * 参加者がURLを直接開いても見えないようにするための表示制御。
 */
interface AdminOnlyProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export default function AdminOnly({
  children,
  title = "運営用の画面です",
  description = "この画面は運営用カード（26-000）でログインしている場合のみ表示されます。",
}: AdminOnlyProps) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged((user) => {
      setAllowed(user?.uid === ADMIN_ACCOUNT_ID);
    });
    return () => unsubscribe();
  }, []);

  if (allowed === null) {
    return <div className="min-h-screen bg-media" />;
  }

  if (!allowed) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-media px-6 text-center text-white">
        <Lock size={28} className="text-white/60" />
        <div>
          <p className="text-base font-bold">{title}</p>
          <p className="mt-2 text-sm leading-relaxed text-white/60 max-w-sm">
            {description}
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
        >
          <ArrowLeft size={16} />
          SNSへ戻る
        </Link>
      </main>
    );
  }

  return <>{children}</>;
}
