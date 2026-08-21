"use client";

import { useEffect } from "react";

/**
 * 配色案が指定した書体を読み込む。
 *
 * ビルド時に取り込むと日本語の書体データが巨大になり、デプロイのたびに
 * 数百ファイルを取得することになるため、実行時に必要なときだけ読み込む。
 * 読み込めなかった場合は端末標準のゴシックにそのまま落ちる。
 */
const FONT_SOURCES: Record<string, string> = {
  DotGothic16: "https://fonts.googleapis.com/css2?family=DotGothic16&display=swap",
};

function ensureFont(family: string) {
  const href = FONT_SOURCES[family];
  if (!href || document.querySelector(`link[data-webfont="${family}"]`)) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.dataset.webfont = family;
  document.head.appendChild(link);
}

export default function WebFont() {
  useEffect(() => {
    const load = () => {
      const value = getComputedStyle(document.documentElement)
        .getPropertyValue("--font-theme")
        .trim();
      for (const family of Object.keys(FONT_SOURCES)) {
        if (value.includes(family)) ensureFont(family);
      }
    };

    load();
    // 配色を切り替えたときにも読み込む（レビュー用の切り替えバー）
    const observer = new MutationObserver(load);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
    return () => observer.disconnect();
  }, []);

  return null;
}
