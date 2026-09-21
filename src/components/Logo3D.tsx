"use client";

import { useEffect, useRef, useState } from "react";
import { mountLogo3D, type Logo3DVariant } from "@/lib/logo3d";

interface Logo3DProps {
  variant: Logo3DVariant;
  /** 表示サイズはここで決める（canvasは親いっぱいに広がる） */
  className?: string;
  /** 3Dが描けた時。描けなかった場合も静止画で表示は続くので、必ず呼ばれるとは限らない */
  onReady?: () => void;
}

/**
 * 26ロゴを3Dで表示する。
 * 3Dが出るまで、および WebGL が使えない端末では public/logo_26.svg の静止画を出す。
 * オープニングも読み込み中の表示も、ここを通すので glb の通信は端末で1回で済む。
 */
export default function Logo3D({ variant, className, onReady }: Logo3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  // onReady が毎レンダー変わっても3Dを作り直さないよう、refで受ける
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // canvasはReactに描かせず、この表示の分だけその場で作る。
    // 同じcanvasを使い回すと、StrictModeの2回マウントや作り直しのときに
    // 1つのWebGLコンテキストを2つのレンダラーが奪い合って描画が壊れる
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText =
      "display:block;width:100%;height:100%;opacity:0;transition:opacity 500ms";
    container.appendChild(canvas);

    let disposed = false;
    let handle: { dispose: () => void } | null = null;

    mountLogo3D(canvas, {
      variant,
      onReady: () => {
        if (disposed) return;
        canvas.style.opacity = "1";
        setReady(true);
        onReadyRef.current?.();
      },
    })
      .then((h) => {
        handle = h;
        // 表示前にアンマウントされた場合は後始末だけして捨てる
        if (disposed) h.dispose();
      })
      .catch((e) => {
        // WebGL非対応・glbの取得失敗。静止画のまま続行する
        console.warn("3Dロゴを表示できないため静止画で表示します", e);
      });

    return () => {
      disposed = true;
      handle?.dispose();
      canvas.remove();
    };
  }, [variant]);

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      {!ready && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/logo_26.svg"
          alt="26アカデミー ロゴ"
          className="app-logo absolute inset-0 h-full w-full object-contain"
        />
      )}
    </div>
  );
}
