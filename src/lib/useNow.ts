"use client";

import { useEffect, useState } from "react";

/**
 * 一定間隔で現在時刻(ミリ秒)を返すフック。
 * これを使って相対時間表示「◯分前」をリアルタイムに更新する。
 * @param intervalMs 更新間隔(デフォルト60秒)
 */
export function useNow(intervalMs: number = 60_000): number {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
