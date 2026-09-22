"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Logo3D from "./Logo3D";

/** 同じタブで2回目以降は出さないための印 */
const PLAYED_KEY = "academy26:opening-played";

/** ロゴが出てから閉じ始めるまで */
const HOLD_MS = 2800;
/** 3Dが出てこない時でも必ず閉じる（通信が細い会場で固まらせない） */
const HARD_CAP_MS = 6000;
/** 暗転してフィードに渡すまで */
const FADE_MS = 600;

/**
 * このページロードで再生するかの判定。
 * React StrictMode（開発時）はコンポーネントを2回マウントするので、
 * 判定のたびに sessionStorage を見に行くと「1回目で印を付けて2回目で弾かれる」ことになる。
 * 判定はモジュール変数に1回だけ残し、sessionStorage は次に開いた時のために使う。
 */
let decision: boolean | null = null;

function shouldPlay() {
  if (decision !== null) return decision;
  try {
    decision =
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
      !sessionStorage.getItem(PLAYED_KEY);
    sessionStorage.setItem(PLAYED_KEY, "1");
  } catch {
    // プライベートモードなどで sessionStorage が使えない場合は出さない
    // （開くたびに再生されて邪魔になる方を避ける）
    decision = false;
  }
  return decision;
}

type Phase = "unknown" | "play" | "out" | "done";

/**
 * 起動時のオープニング。26ロゴが奥から回り込んで正面で止まる。
 *
 * - 同じタブでは初回の1回だけ。リロードでは出ない
 * - 画面のどこかをタップ／Esc・スペース・Enterで即スキップ
 * - 3Dが使えない端末では静止ロゴのまま同じ尺で進む
 */
export default function OpeningAnimation() {
  const [phase, setPhase] = useState<Phase>("unknown");
  const [ready, setReady] = useState(false);
  const closed = useRef(false);

  const close = useCallback(() => {
    if (closed.current) return;
    closed.current = true;
    setPhase("out");
    setTimeout(() => setPhase("done"), FADE_MS);
  }, []);

  useEffect(() => {
    setPhase(shouldPlay() ? "play" : "done");
  }, []);

  // 3Dが描けたらそこから一定時間見せて閉じる
  useEffect(() => {
    if (phase !== "play" || !ready) return;
    const id = setTimeout(close, HOLD_MS);
    return () => clearTimeout(id);
  }, [phase, ready, close]);

  useEffect(() => {
    if (phase !== "play") return;

    // 3Dが間に合わなくても必ず閉じる
    const cap = setTimeout(close, HARD_CAP_MS);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === " " || e.key === "Enter") close();
    };
    window.addEventListener("keydown", onKey);

    // オープニング中は裏のフィードをスクロールさせない
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      clearTimeout(cap);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [phase, close]);

  if (phase === "unknown" || phase === "done") return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-canvas transition-opacity ease-out"
      style={{
        opacity: phase === "out" ? 0 : 1,
        transitionDuration: `${FADE_MS}ms`,
        pointerEvents: phase === "out" ? "none" : "auto",
      }}
      onClick={close}
      role="presentation"
    >
      <Logo3D
        variant="opening"
        className="h-56 w-56 sm:h-72 sm:w-72"
        onReady={() => setReady(true)}
      />

      <div className="opening-rise mt-6 text-center">
        <p className="text-lg font-black tracking-[0.2em] text-ink-900">26アカデミー</p>
        <p className="mt-1.5 text-xs tracking-[0.3em] text-ink-500">例会SNS</p>
      </div>

      <p className="opening-rise-late absolute bottom-10 text-[11px] tracking-widest text-ink-400">
        画面をタップでスキップ
      </p>
    </div>
  );
}
