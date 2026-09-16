"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PixelX } from "./PixelIcon";

// 画面全体で viewport の maximumScale=1 によりブラウザのピンチズームが効かないため、
// 投稿画像は全画面ビューアで拡大できるようにする（ピンチ・ダブルタップ・ドラッグ・ホイール）

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_MS = 300;
const TAP_SLOP = 10;

interface Transform {
  s: number;
  x: number;
  y: number;
}

interface ImageViewerProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export default function ImageViewer({ src, alt, onClose }: ImageViewerProps) {
  const [t, setT] = useState<Transform>({ s: 1, x: 0, y: 0 });
  const [animate, setAnimate] = useState(false);
  const tRef = useRef(t);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{
    startT: Transform;
    startDist: number;
    startMid: { x: number; y: number };
    downAt: number;
    downPos: { x: number; y: number };
    moved: boolean;
    onImage: boolean;
  } | null>(null);
  const lastTap = useRef<{ at: number; x: number; y: number } | null>(null);
  // 親の再描画で履歴を積み直さないよう、onClose は ref 経由で参照する
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // 画像を枠外へ飛ばさないよう、拡大後の画像サイズからはみ出し量までに移動を制限する
  const clamp = useCallback((next: Transform): Transform => {
    const img = imgRef.current;
    const box = containerRef.current;
    if (!img || !box) return next;
    const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next.s));
    const maxX = Math.max(0, (img.offsetWidth * s - box.clientWidth) / 2);
    const maxY = Math.max(0, (img.offsetHeight * s - box.clientHeight) / 2);
    return {
      s,
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }, []);

  const apply = useCallback((next: Transform, withAnimation = false) => {
    tRef.current = next;
    setAnimate(withAnimation);
    setT(next);
  }, []);

  // 画面上の点（コンテナ中心基準）を固定したまま倍率を変える
  const zoomAt = useCallback(
    (base: Transform, s: number, p: { x: number; y: number }): Transform => {
      const ratio = s / base.s;
      return { s, x: p.x - (p.x - base.x) * ratio, y: p.y - (p.y - base.y) * ratio };
    },
    []
  );

  const toLocal = (clientX: number, clientY: number) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: clientX - rect.left - rect.width / 2,
      y: clientY - rect.top - rect.height / 2,
    };
  };

  // 背面のスクロールを止め、Androidの戻るボタンで閉じられるようにする
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.history.pushState({ imageViewer: true }, "");
    const onPop = () => onCloseRef.current();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") window.history.back();
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // 閉じるボタン・背景タップは履歴を1つ戻し、popstate経由で閉じる
  const requestClose = () => {
    if (window.history.state?.imageViewer) {
      window.history.back();
    } else {
      onCloseRef.current();
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // 取得できない環境ではキャプチャなしで続行する
    }
    const pos = toLocal(e.clientX, e.clientY);
    pointers.current.set(e.pointerId, pos);

    const pts = [...pointers.current.values()];
    if (pts.length === 1) {
      gesture.current = {
        startT: tRef.current,
        startDist: 0,
        startMid: pos,
        downAt: Date.now(),
        downPos: pos,
        moved: false,
        // setPointerCapture後は pointerup の target がコンテナになるため、押した時点で判定しておく
        onImage: e.target === imgRef.current,
      };
    } else if (pts.length === 2) {
      const [a, b] = pts;
      gesture.current = {
        startT: tRef.current,
        startDist: Math.hypot(a.x - b.x, a.y - b.y),
        startMid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        downAt: 0,
        downPos: pos,
        moved: true,
        onImage: false,
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    const pos = toLocal(e.clientX, e.clientY);
    pointers.current.set(e.pointerId, pos);
    const g = gesture.current;
    const pts = [...pointers.current.values()];

    if (pts.length >= 2) {
      const [a, b] = pts;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      // ピンチ中は下限を少し緩め、指を離したときに1倍へ戻す
      const s = Math.min(MAX_SCALE, Math.max(0.8, (g.startT.s * dist) / (g.startDist || 1)));
      const zoomed = zoomAt(g.startT, s, g.startMid);
      apply({ s, x: zoomed.x + mid.x - g.startMid.x, y: zoomed.y + mid.y - g.startMid.y });
      return;
    }

    const dx = pos.x - g.downPos.x;
    const dy = pos.y - g.downPos.y;
    if (!g.moved && Math.hypot(dx, dy) > TAP_SLOP) g.moved = true;
    if (g.moved && tRef.current.s > 1) {
      apply(clamp({ s: g.startT.s, x: g.startT.x + dx, y: g.startT.y + dy }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    const remaining = [...pointers.current.values()];

    if (remaining.length === 1) {
      // ピンチから1本指に戻ったら、そこからドラッグを続けられるようにする
      gesture.current = {
        startT: tRef.current,
        startDist: 0,
        startMid: remaining[0],
        downAt: 0,
        downPos: remaining[0],
        moved: true,
        onImage: false,
      };
      return;
    }
    if (remaining.length > 0) return;
    gesture.current = null;

    const settled = clamp(tRef.current);
    if (
      settled.s !== tRef.current.s ||
      settled.x !== tRef.current.x ||
      settled.y !== tRef.current.y
    ) {
      apply(settled.s <= 1 ? { s: 1, x: 0, y: 0 } : settled, true);
    }

    if (!g || g.moved || e.type === "pointercancel") return;
    if (Date.now() - g.downAt > 400) return;

    // ここからタップ判定
    const pos = g.downPos;
    const prev = lastTap.current;
    const now = Date.now();
    if (prev && now - prev.at < DOUBLE_TAP_MS && Math.hypot(pos.x - prev.x, pos.y - prev.y) < 40) {
      lastTap.current = null;
      if (tRef.current.s > 1) {
        apply({ s: 1, x: 0, y: 0 }, true);
      } else {
        apply(clamp(zoomAt(tRef.current, DOUBLE_TAP_SCALE, pos)), true);
      }
      return;
    }
    lastTap.current = { at: now, x: pos.x, y: pos.y };

    // 等倍のときに画像の外側をタップしたら閉じる
    if (tRef.current.s <= 1 && !g.onImage) {
      requestClose();
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    const p = toLocal(e.clientX, e.clientY);
    const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, tRef.current.s * Math.exp(-e.deltaY * 0.002)));
    const next = clamp(zoomAt(tRef.current, s, p));
    apply(next.s <= 1 ? { s: 1, x: 0, y: 0 } : next);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label="画像の拡大表示"
    >
      <div className="absolute right-3 top-3 z-10">
        <button
          type="button"
          onClick={requestClose}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25"
          aria-label="閉じる"
        >
          <PixelX size={22} />
        </button>
      </div>

      <div
        ref={containerRef}
        className="relative flex flex-1 select-none items-center justify-center overflow-hidden"
        style={{ touchAction: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          draggable={false}
          className="max-h-full max-w-full object-contain"
          style={{
            transform: `translate3d(${t.x}px, ${t.y}px, 0) scale(${t.s})`,
            transition: animate ? "transform 0.2s ease-out" : "none",
            willChange: "transform",
          }}
        />
      </div>

      <p
        className={`pointer-events-none absolute inset-x-0 bottom-6 text-center text-xs text-white/60 transition-opacity ${
          t.s > 1 ? "opacity-0" : "opacity-100"
        }`}
      >
        2本指で広げる／ダブルタップで拡大
      </p>
    </div>,
    document.body
  );
}
