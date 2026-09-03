"use client";

import { useCallback, useEffect, useState } from "react";
import { THEMES, DEFAULT_THEME_KEY } from "@/lib/themes";

const STORAGE_KEY = "academy26_preview_theme";
// 暗い配色だけフォームの見た目をダーク側に寄せる
const DARK_KEYS = new Set(["midnight", "whiteline"]);

/** どの案かに関わらず、上書きしうる変数を洗い出しておく */
const ALL_VAR_NAMES = Array.from(
  new Set(THEMES.flatMap((theme) => Object.keys(theme.vars)))
);

export function applyTheme(key: string) {
  const theme = THEMES.find((t) => t.key === key);
  if (!theme || typeof document === "undefined") return;

  const root = document.documentElement;
  // 前の案で当てた値（書体やロゴの白抜きなど）を残さない
  for (const name of ALL_VAR_NAMES) {
    root.style.removeProperty(name);
  }
  for (const [name, value] of Object.entries(theme.vars)) {
    root.style.setProperty(name, value);
  }
  root.style.colorScheme = DARK_KEYS.has(key) ? "dark" : "light";

  const meta = document.querySelector('meta[name="theme-color"]');
  const themeColor = theme.vars["--theme-color"];
  if (meta && themeColor) meta.setAttribute("content", themeColor);
}

/** "24 24 27" -> "rgb(24 24 27)" */
function toColor(value?: string) {
  if (!value) return "transparent";
  return /^\d/.test(value) ? `rgb(${value})` : value;
}

/**
 * 配色レビュー用の切り替えバー。
 * `?preview=1` を付けて開いたときだけ表示される。通常の利用では一切出ない。
 */
export default function ThemePreview() {
  const [active, setActive] = useState<string | null>(null);

  const select = useCallback((key: string) => {
    applyTheme(key);
    setActive(key);
    localStorage.setItem(STORAGE_KEY, key);
    // URLを更新して、その配色のままリンクを共有できるようにする
    const url = new URL(window.location.href);
    url.searchParams.set("theme", key);
    window.history.replaceState(null, "", url.toString());
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isPreview = params.get("preview") === "1";
    const fromUrl = params.get("theme");
    const saved = localStorage.getItem(STORAGE_KEY);
    // 保存した配色を引き継ぐのはレビュー中だけ。通常の利用では既定の配色に戻す
    const key = fromUrl ?? (isPreview ? saved ?? DEFAULT_THEME_KEY : DEFAULT_THEME_KEY);

    if (fromUrl || isPreview) applyTheme(key);
    if (!isPreview) return;

    setActive(key);
    document.body.classList.add("preview-mode");
    return () => document.body.classList.remove("preview-mode");
  }, []);

  if (!active) return null;

  return (
    <div className="theme-preview-bar">
      <p className="theme-preview-label">配色を切り替え</p>
      <div className="theme-preview-chips">
        {THEMES.map((theme) => (
          <button
            key={theme.key}
            type="button"
            onClick={() => select(theme.key)}
            className={`theme-chip${theme.key === active ? " is-active" : ""}`}
            aria-pressed={theme.key === active}
          >
            <span
              className="theme-chip-dot"
              style={{
                background: toColor(theme.vars["--accent"]),
                borderColor: toColor(theme.vars["--canvas"]),
              }}
            />
            {theme.label}
          </button>
        ))}
      </div>
    </div>
  );
}
