"use client";

import { useEffect, useState } from "react";

const LOGO_SRC = "/The_Year_of_the_fire_academy%20(1).svg";

export default function OpeningAnimation() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 3600);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="opening-animation fixed inset-0 z-[100] overflow-hidden bg-ink-950 text-white"
      aria-label="26アカデミー オープニングアニメーション"
      role="status"
    >
      <div className="opening-aurora opening-aurora-one" />
      <div className="opening-aurora opening-aurora-two" />
      <div className="opening-grid" />
      <div className="opening-sparks" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="opening-emblem-wrap relative">
          <div className="opening-orbit opening-orbit-one" />
          <div className="opening-orbit opening-orbit-two" />
          <div className="opening-logo-glow" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOGO_SRC}
            alt="26アカデミー ロゴ"
            className="opening-logo relative z-10 h-40 w-40 rounded-[2rem] bg-white/95 object-contain p-3 shadow-2xl sm:h-52 sm:w-52"
          />
        </div>

        <div className="opening-copy mt-10">
          <p className="opening-kicker text-xs font-semibold uppercase tracking-[0.6em] text-white/60 sm:text-sm">
            The Year of the Fire Academy
          </p>
          <h1 className="mt-4 text-3xl font-black tracking-[0.12em] text-white sm:text-5xl">
            26アカデミー
          </h1>
          <p className="mt-3 text-sm font-medium tracking-[0.25em] text-white/70 sm:text-base">
            例会SNS、開幕。
          </p>
        </div>

        <div className="opening-progress mt-10 h-1 w-56 overflow-hidden rounded-full bg-white/10 sm:w-72">
          <div className="opening-progress-bar h-full rounded-full bg-white" />
        </div>
      </div>
    </div>
  );
}
