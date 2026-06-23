"use client";

import { useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogIn,
  Mail,
  User as UserIcon,
  UserPlus,
} from "lucide-react";
import { authErrorMessage, useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup";

export default function LoginForm() {
  const { configured, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignup = mode === "signup";

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!configured) return;
    setError(null);

    if (!email.trim()) {
      setError("メールアドレスを入力してください。");
      return;
    }
    if (!password) {
      setError("パスワードを入力してください。");
      return;
    }
    if (isSignup && !name.trim()) {
      setError("お名前を入力してください。");
      return;
    }

    setSubmitting(true);
    try {
      if (isSignup) {
        await signUp(email, password, name);
      } else {
        await signIn(email, password);
      }
      // 成功すると onAuthStateChanged 経由で画面が切り替わる
    } catch (err) {
      console.error(err);
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-5 py-10">
      <div className="w-full max-w-sm">
        {/* ブランド */}
        <div className="mb-8 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo_26.png"
            alt="26アカデミー ロゴ"
            className="h-16 w-16 rounded-xl object-contain"
          />
          <h1 className="mt-4 text-xl font-black tracking-wide text-white">
            26アカデミー
          </h1>
          <p className="mt-1 text-xs tracking-[0.2em] text-white/50">例会SNS</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-2xl shadow-black/40">
          <h2 className="text-base font-bold text-ink-900">
            {isSignup ? "アカウント作成" : "ログイン"}
          </h2>
          <p className="mt-1 text-xs text-ink-500">
            {isSignup
              ? "メールアドレスとパスワードで登録します。"
              : "登録済みのメールアドレスでログインしてください。"}
          </p>

          {!configured && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-ink-300 bg-ink-50 px-3 py-2.5">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-ink-700" />
              <p className="text-xs leading-relaxed text-ink-600">
                Firebaseの設定が未完了のため、ログインできません。
                <code className="rounded bg-white px-1">.env.local</code> に
                FirebaseのWebアプリ設定を入力してください。
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {isSignup && (
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-500">
                  お名前
                </label>
                <div className="relative">
                  <UserIcon
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
                  />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例:齋藤 雅人"
                    autoComplete="name"
                    className="w-full rounded-lg border border-ink-200 py-2 pl-9 pr-3 text-sm text-ink-900 outline-none focus:border-ink-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-medium text-ink-500">
                メールアドレス
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full rounded-lg border border-ink-200 py-2 pl-9 pr-3 text-sm text-ink-900 outline-none focus:border-ink-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-ink-500">
                パスワード
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignup ? "6文字以上" : "パスワード"}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  className="w-full rounded-lg border border-ink-200 py-2 pl-9 pr-10 text-sm text-ink-900 outline-none focus:border-ink-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-400 transition hover:text-ink-700"
                  aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !configured}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink-900 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {isSignup ? "登録中..." : "ログイン中..."}
                </>
              ) : isSignup ? (
                <>
                  <UserPlus size={16} />
                  アカウントを作成
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  ログイン
                </>
              )}
            </button>
          </form>

          {/* モード切り替え */}
          <div className="mt-5 border-t border-ink-100 pt-4 text-center text-xs text-ink-500">
            {isSignup ? (
              <span>
                すでにアカウントをお持ちですか?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className={cn(
                    "font-semibold text-ink-900 underline-offset-2 transition hover:underline",
                    submitting && "pointer-events-none opacity-50"
                  )}
                >
                  ログイン
                </button>
              </span>
            ) : (
              <span>
                アカウントがありませんか?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className={cn(
                    "font-semibold text-ink-900 underline-offset-2 transition hover:underline",
                    submitting && "pointer-events-none opacity-50"
                  )}
                >
                  新規登録
                </button>
              </span>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-white/40">
          ログインすることで、例会SNSの投稿・コメント機能を利用できます。
        </p>
      </div>
    </div>
  );
}
