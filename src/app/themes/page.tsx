"use client";

import Link from "next/link";
import { ArrowRight, Palette } from "lucide-react";
import { THEMES } from "@/lib/themes";
import { applyTheme } from "@/components/ThemePreview";

/** "24 24 27" -> "rgb(24 24 27)" */
function toColor(value?: string) {
  if (!value) return "transparent";
  return /^\d/.test(value) ? `rgb(${value})` : value;
}

/**
 * 配色レビュー用のページ。実際の画面をその配色で開ける。
 * 参加者向けの機能ではなく、Aチーム・統括で色を決めるための入口。
 */
export default function ThemesPage() {
  return (
    <main className="min-h-screen bg-canvas px-5 py-8">
      <div className="mx-auto max-w-xl">
        <div className="flex items-center gap-2 text-ink-500">
          <Palette size={16} />
          <p className="text-xs font-semibold tracking-[0.14em]">26アカデミー 例会SNS</p>
        </div>
        <h1 className="mt-3 text-2xl font-bold text-ink-900">配色6案</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">
          気になる案を選ぶと、その色のまま実際の画面が開きます。
          画面下のバーでいつでも切り替えられるので、並べて見比べてください。
          機能はどの案もまったく同じで、違うのは色だけです。
        </p>

        <ul className="mt-6 space-y-3">
          {THEMES.map((theme) => (
            <li key={theme.key}>
              <Link
                href={`/?demo=1&preview=1&theme=${theme.key}`}
                onClick={() => applyTheme(theme.key)}
                className="flex items-center gap-4 rounded-xl border border-ink-200 bg-surface p-4 transition hover:border-ink-400"
              >
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: toColor(theme.vars["--canvas"]) }}
                >
                  <span
                    className="h-6 w-6 rounded-full"
                    style={{ background: toColor(theme.vars["--accent"]) }}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink-900">{theme.label}</span>
                  <span className="block text-xs text-ink-500">{theme.note}</span>
                </span>
                <ArrowRight size={18} className="shrink-0 text-ink-400" />
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-xs leading-relaxed text-ink-400">
          この画面はレビュー用です。参加者が使う画面は、カードのIDとパスワードでログインしてから始まります。
        </p>
      </div>
    </main>
  );
}
