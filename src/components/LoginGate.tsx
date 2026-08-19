"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { KeyRound, Loader2, LogIn, ScanLine } from "lucide-react";
import { signInWithCard, CardSignInError } from "@/lib/auth";

interface LoginGateProps {
  /** サインイン成功時。実際のログイン状態は Firebase Auth の購読側で反映される */
  onLogin?: () => void;
}

export default function LoginGate({ onLogin }: LoginGateProps) {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // QRからのID自動入力を一度だけ行う
  const prefilled = useRef(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  const attemptLogin = useCallback(
    async (rawId: string, rawPassword: string) => {
      setChecking(true);
      setError(null);
      try {
        await signInWithCard(rawId, rawPassword);
        onLogin?.();
        return true;
      } catch (e) {
        setError(
          e instanceof CardSignInError
            ? e.message
            : "ログイン処理に失敗しました。通信環境をご確認ください。"
        );
        return false;
      } finally {
        setChecking(false);
      }
    },
    [onLogin]
  );

  // カードのQR（/?id=26-001）から開いた場合はIDだけ埋める。
  // パスワードはURLに載せず、必ず本人に入力してもらう（カードを拾われても開けないようにするため）
  useEffect(() => {
    if (prefilled.current) return;
    prefilled.current = true;

    const params = new URLSearchParams(window.location.search);
    const qrId = params.get("id");
    if (!qrId) return;

    setId(qrId);
    // 古いQR（パスワード付き）で開かれてもURLには残さない
    window.history.replaceState(null, "", window.location.pathname);
    passwordRef.current?.focus();
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!id.trim() || !password.trim()) {
      setError("IDとパスワードを入力してください。");
      return;
    }
    void attemptLogin(id, password);
  };

  return (
    <div className="gate-backdrop flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo_26.png"
            alt="26アカデミー ロゴ"
            className="h-20 w-20 object-contain"
          />
          <h1 className="mt-4 text-xl font-black tracking-wide text-white">
            26アカデミー 例会SNS
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/70">
            アカウントカードに記載の
            <br />
            ログインIDとパスワードを入力してください。
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-7 rounded-2xl bg-surface p-5 shadow-2xl"
        >
          <label className="block text-xs font-medium text-ink-500" htmlFor="login-id">
            ログインID
          </label>
          <input
            id="login-id"
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="26-001"
            autoComplete="username"
            inputMode="text"
            className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2.5 text-base tracking-widest text-ink-900 outline-none focus:border-accent"
          />

          <label
            className="mt-4 block text-xs font-medium text-ink-500"
            htmlFor="login-password"
          >
            パスワード
          </label>
          <input
            id="login-password"
            ref={passwordRef}
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="ABC123"
            autoComplete="current-password"
            autoCapitalize="characters"
            spellCheck={false}
            className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2.5 text-base uppercase tracking-[0.3em] text-ink-900 outline-none focus:border-accent"
          />

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={checking}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-3 text-sm font-semibold text-accent-fg transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {checking ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                確認中...
              </>
            ) : (
              <>
                <LogIn size={16} />
                ログイン
              </>
            )}
          </button>

          <div className="mt-4 flex items-start gap-2 rounded-lg bg-ink-50 px-3 py-2.5 text-[11px] leading-relaxed text-ink-500">
            <ScanLine size={14} className="mt-0.5 shrink-0" />
            <p>
              カードのQRコードを読み取ると、この画面が開きます。
              カード記載のIDとパスワードを入力してください。
              一度ログインすれば、この端末では次回から入力は不要です。
            </p>
          </div>
        </form>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-white/50">
          <KeyRound size={12} />
          カードを紛失した場合は運営（アカデミー統括）まで
        </p>
      </div>
    </div>
  );
}
