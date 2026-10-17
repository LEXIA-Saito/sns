"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Logo3D from "@/components/Logo3D";
import LevelBadge from "@/components/LevelBadge";
import LevelIcon from "@/components/LevelIcon";
import PostCard from "@/components/PostCard";
import {
  PixelChevronLeft,
  PixelChevronRight,
  PixelCollapse,
  PixelExpand,
  PixelPause,
  PixelPlay,
} from "@/components/PixelIcon";
import { inMemoryPersistence, onAuthStateChanged, setPersistence, signInAnonymously } from "firebase/auth";
import { getAuthOrNull } from "@/lib/firebase";
import type { Post } from "@/lib/types";
import type { Session } from "@/lib/session";
import { subscribePosts, subscribeAccountNames } from "@/lib/posts";
import { applyAccountNames, type AccountNames } from "@/lib/accountNames";
import { filterVisiblePosts } from "@/lib/moderation";
import { ADMIN_ACCOUNT_ID } from "@/lib/auth";
import { ACCOUNT_ROSTER } from "@/lib/roster";
import { levelFromXp, tierFromLevel, xpByAccount } from "@/lib/level";

/**
 * 運営専用「ダイジェスト自動再生」ページ。
 * 会場のスクリーンで流しっぱなしにする用。
 *   みんなの投稿（自動スクロール）→ レベル一覧（自動スクロール）→ レベルTOP10 → 先頭へ戻って無限ループ。
 * 投稿・名前・レベルは周回の切れ目で最新に更新する（読んでいる途中で並びがずれないように）。
 */

type Phase = "timeline" | "levels" | "ranking";
const PHASE_ORDER: Phase[] = ["timeline", "levels", "ranking"];

/** 基準の画面サイズ。実際の画面に合わせて拡縮する */
const BASE_W = 1920;
const BASE_H = 1080;
/** スクロールする列の拡大率と幅（基準サイズ上のpx） */
const SCALE = 1.75;
const COL_W = 576;
const HOLD_START = 0.8; // スクロール前の静止（秒）
const HOLD_END = 2.5; // スクロール後の静止（秒）
const FADE_MS = 600;
const TOP_N = 10;

/** 投稿のスクロール速度（基準px/秒）。標準は1件あたり約6秒 */
const SPEEDS = [
  { id: "slow", label: "ゆっくり", px: 120 },
  { id: "normal", label: "標準", px: 180 },
  { id: "fast", label: "速い", px: 300 },
] as const;
type SpeedId = (typeof SPEEDS)[number]["id"];
/** レベル一覧は1行が小さいので、投稿より遅めにそろえる */
const LEVELS_SPEED_RATIO = 0.6;

const DUMMY_SESSION: Session = { accountId: "", name: "", admin: false };

interface Snapshot {
  posts: Post[];
  xp: Record<string, number>;
  members: { id: string; name: string; xp: number }[];
  now: number;
}

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/**
 * 列の中の画像・動画の読み込みが終わるまで待つ。読み込み中は進み具合を onProgress で知らせる。
 *
 * - 画像は complete（失敗したものも「済み」）
 * - 動画は「長さなどの情報が読めた」時点で済み（再生できる状態までは待たない。
 *   ブラウザによっては、再生するまで先を読み込まず、永遠に終わらなくなるため）
 * - 進み具合が stallMs のあいだ増えなければ、残りを待たずに先へ進む
 * - 全体でも maxMs で打ち切る
 */
async function waitForAllMedia(
  root: HTMLElement | null,
  onProgress?: (done: number, total: number) => void,
  stallMs = 6000,
  maxMs = 60000
) {
  if (!root) return;
  const imgs = Array.from(root.querySelectorAll("img"));
  const videos = Array.from(root.querySelectorAll("video"));
  imgs.forEach((i) => {
    i.loading = "eager";
  });
  const total = imgs.length + videos.length;
  const countDone = () =>
    imgs.filter((i) => i.complete).length +
    videos.filter((v) => v.readyState >= 1 || Boolean(v.error)).length;
  const start = performance.now();
  let lastDone = -1;
  let lastChange = start;
  for (;;) {
    const done = countDone();
    onProgress?.(done, total);
    const now = performance.now();
    if (done >= total) return;
    if (done !== lastDone) {
      lastDone = done;
      lastChange = now;
    }
    if (now - lastChange > stallMs || now - start > maxMs) return;
    await wait(250);
  }
}

type ViewerAuth = "checking" | "ready" | "error";

/**
 * ID・パスワードなしで開けるページ。投稿の読み取りには Firebase の匿名ログインを使う
 * （端末には保存しない。カードでログイン済みの端末ではそのログインをそのまま使う）。
 */
function useViewerAuth(): ViewerAuth {
  const [state, setState] = useState<ViewerAuth>("checking");
  useEffect(() => {
    const auth = getAuthOrNull();
    if (!auth) {
      setState("error");
      return;
    }
    let started = false;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setState("ready");
        return;
      }
      if (started) return;
      started = true;
      try {
        await setPersistence(auth, inMemoryPersistence);
        await signInAnonymously(auth);
      } catch (e) {
        console.error("匿名ログインに失敗:", e);
        setState("error");
      }
    });
    return () => unsub();
  }, []);
  return state;
}

export default function DigestPage() {
  const viewerAuth = useViewerAuth();
  // ---- ライブデータ ----
  const [rawPosts, setRawPosts] = useState<Post[]>([]);
  const [accountNames, setAccountNames] = useState<AccountNames>({});

  /** 投稿・名前が、それぞれ最初に届いたか */
  const [loaded, setLoaded] = useState({ posts: false, names: false });
  useEffect(() => {
    if (viewerAuth !== "ready") return;
    const u1 = subscribePosts((list) => {
      setRawPosts(list);
      setLoaded((l) => (l.posts ? l : { ...l, posts: true }));
    });
    const u2 = subscribeAccountNames((names) => {
      setAccountNames(names);
      setLoaded((l) => (l.names ? l : { ...l, names: true }));
    });
    return () => {
      u1();
      u2();
    };
  }, [viewerAuth]);
  const dataReady = loaded.posts && loaded.names;

  const named = useMemo(() => applyAccountNames(rawPosts, accountNames), [rawPosts, accountNames]);

  const latest = useMemo<Snapshot>(() => {
    // LOM全員の投稿を流す（運営が非表示にした投稿だけ除く）。
    // /projector のようにアカデミーメンバーだけには絞らない
    const visible = filterVisiblePosts(named);
    const xp = xpByAccount(named);
    const members = Object.entries(ACCOUNT_ROSTER)
      .filter(([id]) => id !== ADMIN_ACCOUNT_ID && id !== "26-085")
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([id, name]) => ({
        id,
        name: (accountNames[id] ?? name).replace("　", " "),
        xp: xp[id] ?? 0,
      }));
    return { posts: visible, xp, members, now: Date.now() };
  }, [named, accountNames]);
  const latestRef = useRef(latest);
  latestRef.current = latest;

  // ---- 再生状態 ----
  const [snap, setSnap] = useState<Snapshot>(latest);
  const [phase, setPhase] = useState<Phase>("timeline");
  const [lap, setLap] = useState(0);
  const [fading, setFading] = useState(false);
  /** いまの場面が、画像まで含めて表示できる状態か */
  const [sceneReady, setSceneReady] = useState(false);
  const [mediaProgress, setMediaProgress] = useState<{ done: number; total: number } | null>(null);
  const onSceneReady = useCallback(() => setSceneReady(true), []);
  const onMediaProgress = useCallback((done: number, total: number) => setMediaProgress({ done, total }), []);
  const [playing, setPlaying] = useState(true);
  const [speedId, setSpeedId] = useState<SpeedId>("normal");
  const playingRef = useRef(true);
  playingRef.current = playing;
  const speedRef = useRef<number>(180);
  speedRef.current = SPEEDS.find((s) => s.id === speedId)!.px;
  const snapRef = useRef(snap);
  snapRef.current = snap;
  /** データがそろうまで再生しない（起動直後の空の状態で「投稿なし」と判断して飛ばさないため） */
  const [started, setStarted] = useState(false);
  useEffect(() => {
    if (dataReady && !started) {
      setSnap(latestRef.current);
      setStarted(true);
    }
  }, [dataReady, started]);
  // 万一どれかが届かなくても、8秒後には届いた分で再生を始める
  useEffect(() => {
    if (viewerAuth !== "ready" || started) return;
    const t = setTimeout(() => {
      setSnap(latestRef.current);
      setStarted(true);
    }, 8000);
    return () => clearTimeout(t);
  }, [viewerAuth, started]);

  const phaseRef = useRef<Phase>("timeline");
  phaseRef.current = phase;
  const busyRef = useRef(false);

  /** 次の場面へ。ランキングの次は先頭に戻り、ここで最新のデータに入れ替える */
  const goNext = useCallback(async (dir: 1 | -1 = 1) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setFading(true);
    await wait(FADE_MS);
    const i = PHASE_ORDER.indexOf(phaseRef.current);
    const next = PHASE_ORDER[(i + dir + PHASE_ORDER.length) % PHASE_ORDER.length];
    if (next === "timeline" && dir === 1) {
      setSnap(latestRef.current);
      setLap((l) => l + 1);
    }
    setSceneReady(false);
    setMediaProgress(null);
    setPhase(next);
    setFading(false);
    busyRef.current = false;
  }, []);

  // 投稿がひとつも無いときはタイムラインを飛ばす
  useEffect(() => {
    if (started && phase === "timeline" && snap.posts.length === 0 && playing) {
      const t = setTimeout(() => goNext(1), 1500);
      return () => clearTimeout(t);
    }
  }, [started, phase, snap.posts.length, playing, goNext, lap]);

  // ---- 画面に合わせた拡縮 ----
  const [fit, setFit] = useState(1);
  useEffect(() => {
    const update = () => setFit(Math.min(window.innerWidth / BASE_W, window.innerHeight / BASE_H));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // ---- コントロール（マウスを止めると隠れる） ----
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const onMove = () => {
      setShowControls(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setShowControls(false), 3500);
    };
    onMove();
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch (e) {
      console.error("fullscreen failed", e);
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === "ArrowRight") goNext(1);
      else if (e.key === "ArrowLeft") goNext(-1);
      else if (e.key === "f" || e.key === "F") toggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, toggleFullscreen]);

  // ---- 画面を消さない ----
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        const nav = navigator as Navigator & {
          wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> };
        };
        if (nav.wakeLock && document.visibilityState === "visible") {
          const l = await nav.wakeLock.request("screen");
          if (cancelled) await l.release();
          else lock = l;
        }
      } catch {
        /* 非対応や拒否は無視 */
      }
    };
    request();
    const onVis = () => {
      if (document.visibilityState === "visible") request();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      lock?.release().catch(() => {});
    };
  }, []);

  if (viewerAuth === "error") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#080808] px-6 text-center text-white">
        <p className="text-lg font-bold">投稿を読み込めませんでした</p>
        <p className="max-w-md text-sm leading-relaxed text-white/60">
          画面を再読み込みしてください。それでも表示されない場合は、運営に連絡してください。
          <br />
          （運営向け: Firebase Authentication で「匿名」のログインが有効か確認してください）
        </p>
      </main>
    );
  }
  if (viewerAuth === "checking" || !started) return <LoadingScreen message="読み込み中…" />;

  const heading =
    phase === "timeline"
      ? { title: "専用SNS ダイジェスト", note: null }
      : phase === "levels"
        ? { title: "みんなのレベル", note: "投稿するほど育つ\n文字だけ 10 ／ 写真・動画つき 25" }
        : null;

  return (
    <>
      <div
        className="fixed inset-0 overflow-hidden bg-[#080808] text-white select-none"
        style={{ cursor: showControls ? "default" : "none" }}
      >
        <div
          className="absolute left-1/2 top-1/2 bg-canvas"
          style={{
            width: BASE_W,
            height: BASE_H,
            marginLeft: -BASE_W / 2,
            marginTop: -BASE_H / 2,
            transform: `scale(${fit})`,
            transformOrigin: "center",
            overflow: "hidden",
            fontFamily: "var(--font-theme)",
          }}
        >
          <div
            key={`${lap}-${phase}`}
            style={{
              opacity: fading || !sceneReady ? 0 : 1,
              transition: `opacity ${FADE_MS}ms ease`,
            }}
            className="absolute inset-0"
          >
            {phase === "timeline" && (
              <TimelineScene
                snap={snap}
                lap={lap}
                heading={heading!}
                playingRef={playingRef}
                speedRef={speedRef}
                onDone={() => goNext(1)}
                onReady={onSceneReady}
                onProgress={onMediaProgress}
              />
            )}
            {phase === "levels" && (
              <LevelsScene
                snap={snap}
                heading={heading!}
                playingRef={playingRef}
                speedRef={speedRef}
                onDone={() => goNext(1)}
                onReady={onSceneReady}
                onProgress={onMediaProgress}
              />
            )}
            {phase === "ranking" && (
              <RankingScene snap={snap} playingRef={playingRef} onDone={() => goNext(1)} onReady={onSceneReady} />
            )}
          </div>
          {/* 画像の読み込みが終わるまでは、3Dロゴの読み込み画面（すぐ終わるときは出さない） */}
          <LoadingOverlay active={!sceneReady && !fading} progress={mediaProgress} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 6, background: "#fff" }} />
        </div>

        {/* 運営用コントロールバー（通常は自動で隠れる） */}
        <div
          className={`absolute bottom-6 left-1/2 -translate-x-1/2 transition-opacity duration-300 ${
            showControls ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        >
          <div className="flex items-center gap-3 rounded-full border border-white/20 bg-black/80 px-5 py-2.5 shadow-2xl backdrop-blur-md">
            <button
              onClick={() => goNext(-1)}
              className="rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
              aria-label="前の場面へ"
              title="前の場面へ"
            >
              <PixelChevronLeft size={20} />
            </button>
            <button
              onClick={() => setPlaying((p) => !p)}
              className="rounded-full bg-white p-2.5 text-black shadow transition hover:bg-white/90"
              aria-label={playing ? "一時停止" : "再生"}
            >
              {playing ? <PixelPause size={18} /> : <PixelPlay size={18} className="translate-x-0.5" />}
            </button>
            <button
              onClick={() => goNext(1)}
              className="rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
              aria-label="次の場面へ"
              title="次の場面へ"
            >
              <PixelChevronRight size={20} />
            </button>
            <div className="h-4 w-px bg-white/20" />
            <span className="text-xs text-white/50">
              {phase === "timeline" ? "投稿" : phase === "levels" ? "レベル" : "ランキング"}・{lap + 1}周目
            </span>
            <select
              value={speedId}
              onChange={(e) => setSpeedId(e.target.value as SpeedId)}
              className="rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-xs text-white outline-none"
              title="スクロールの速さ"
            >
              {SPEEDS.map((s) => (
                <option key={s.id} value={s.id} className="bg-neutral-900">
                  {s.label}
                </option>
              ))}
            </select>
            <button
              onClick={toggleFullscreen}
              className="rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
              title="全画面表示"
            >
              {isFullscreen ? <PixelCollapse size={18} /> : <PixelExpand size={18} />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 読み込み画面（3Dロゴ）                                                */
/* ------------------------------------------------------------------ */
function LoadingBody({ message, detail }: { message: string; detail?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center text-white">
      <Logo3D variant="spin" className="h-[360px] w-[360px]" />
      <p style={{ fontSize: 44, marginTop: 28, letterSpacing: ".2em" }}>26アカデミー</p>
      <p style={{ fontSize: 26, marginTop: 8, color: "rgb(var(--ink-400))", letterSpacing: ".3em" }}>例会SNS</p>
      <p style={{ fontSize: 28, marginTop: 56, color: "rgb(var(--ink-500))", letterSpacing: ".15em" }}>{message}</p>
      {detail ? <p style={{ fontSize: 22, marginTop: 12, color: "rgb(var(--ink-500))" }}>{detail}</p> : null}
    </div>
  );
}

/** 起動直後（データが届くまで）の全画面の読み込み画面 */
function LoadingScreen({ message }: { message: string }) {
  return (
    <main className="fixed inset-0 flex items-center justify-center bg-canvas">
      <div style={{ transform: "scale(0.6)" }}>
        <LoadingBody message={message} />
      </div>
    </main>
  );
}

/** 場面の準備（画像の読み込み）中に、舞台の上に重ねる。短時間で終わるときは出さない */
function LoadingOverlay({
  active,
  progress,
}: {
  active: boolean;
  progress: { done: number; total: number } | null;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    const t = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(t);
  }, [active]);
  return (
    <div
      className="absolute inset-0 flex items-center justify-center bg-canvas"
      style={{
        opacity: active && visible ? 1 : 0,
        pointerEvents: "none",
        transition: `opacity ${FADE_MS}ms ease`,
      }}
    >
      {active && visible ? (
        <LoadingBody
          message="読み込み中…"
          detail={progress && progress.total > 0 ? `画像・動画 ${progress.done} / ${progress.total}` : undefined}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 共通: 左の見出し                                                      */
/* ------------------------------------------------------------------ */
function LeftHeading({ title, note }: { title: string; note: string | null }) {
  return (
    <div
      style={{ position: "absolute", left: 0, top: 0, width: 860, height: BASE_H }}
      className="flex flex-col items-center justify-center text-center"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo_26.svg" alt="" style={{ width: 230, height: 230, filter: "var(--logo-filter)" }} />
      <h1 style={{ fontSize: 62, marginTop: 30, color: "#fff", letterSpacing: ".08em" }}>26アカデミー</h1>
      <p style={{ fontSize: 36, marginTop: 10, color: "rgb(var(--ink-400))", letterSpacing: ".25em" }}>例会SNS</p>
      <div style={{ marginTop: 70, border: "3px solid #fff", padding: "20px 44px", fontSize: 40, color: "#fff" }}>
        {title}
      </div>
      {note ? (
        <p style={{ marginTop: 50, fontSize: 28, color: "rgb(var(--ink-500))", lineHeight: 1.9, whiteSpace: "pre-line" }}>
          {note}
        </p>
      ) : null}
      <p style={{ marginTop: note ? 30 : 56, fontSize: 30, color: "rgb(var(--ink-500))", letterSpacing: ".1em" }}>
        10月例会事業　Road of Young Leaders
      </p>
      <p style={{ marginTop: 14, fontSize: 30, color: "rgb(var(--ink-500))" }}>～この先へ～　2026.10.19</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 共通: 縦へ自動スクロールする列                                         */
/* ------------------------------------------------------------------ */
function useAutoScroll(
  colRef: React.RefObject<HTMLDivElement>,
  enabled: boolean,
  speedFactor: number,
  playingRef: React.MutableRefObject<boolean>,
  speedRef: React.MutableRefObject<number>,
  onDone: () => void,
  extra: number,
  onReady: () => void,
  onProgress: (done: number, total: number) => void
) {
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const readyRef = useRef(onReady);
  readyRef.current = onReady;
  const progressRef = useRef(onProgress);
  progressRef.current = onProgress;
  useEffect(() => {
    if (!enabled) {
      readyRef.current();
      return;
    }
    let cancelled = false;
    let raf = 0;
    (async () => {
      // すべて読み込めてから、表示を始めて流す（読み込み中は3Dロゴの画面）
      await waitForAllMedia(colRef.current, (d, t) => progressRef.current(d, t));
      if (cancelled || !colRef.current) return;
      readyRef.current();
      await wait(FADE_MS + 100);
      if (cancelled || !colRef.current) return;
      const col = colRef.current;
      const measure = () => Math.max(0, col.scrollHeight * SCALE - BASE_H + extra);
      let total = measure();
      let elapsed = 0; // 一時停止中は進めない
      let last = performance.now();
      let sinceMeasure = 0;
      let endHold = -1; // 末尾に着いてからの静止時間（-1 = まだ着いていない）
      const step = (now: number) => {
        if (cancelled) return;
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        if (playingRef.current) elapsed += dt;
        // 流れながら画像が読み込まれて高さが増えることがあるので、ときどき計測し直す
        sinceMeasure += dt;
        if (sinceMeasure > 0.5) {
          sinceMeasure = 0;
          total = measure();
        }
        const speed = speedRef.current * speedFactor;
        const y = Math.min(total, Math.max(0, elapsed - HOLD_START) * speed);
        col.style.transform = `translate3d(0, ${-y}px, 0) scale(${SCALE})`;
        if (y >= total - 0.5) {
          if (playingRef.current) endHold = endHold < 0 ? 0 : endHold + dt;
          if (endHold >= HOLD_END) {
            cancelled = true;
            doneRef.current();
            return;
          }
        } else {
          endHold = -1;
        }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}

/* ------------------------------------------------------------------ */
/* 1. みんなの投稿                                                       */
/* ------------------------------------------------------------------ */
function TimelineScene({
  snap,
  lap,
  heading,
  playingRef,
  speedRef,
  onDone,
  onReady,
  onProgress,
}: {
  snap: Snapshot;
  lap: number;
  heading: { title: string; note: string | null };
  playingRef: React.MutableRefObject<boolean>;
  speedRef: React.MutableRefObject<number>;
  onDone: () => void;
  onReady: () => void;
  onProgress: (done: number, total: number) => void;
}) {
  const colRef = useRef<HTMLDivElement>(null);
  /** 古い投稿から新しい投稿へ向かって流す */
  const oldestFirst = useMemo(() => [...snap.posts].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0)), [snap.posts]);
  useAutoScroll(colRef, snap.posts.length > 0, 1, playingRef, speedRef, onDone, 0, onReady, onProgress);
  return (
    <>
      <LeftHeading title={heading.title} note={heading.note} />
      <div
        style={{
          position: "absolute",
          left: 860,
          top: 0,
          width: COL_W * SCALE,
          height: BASE_H,
          overflow: "hidden",
          borderLeft: "3px solid rgb(var(--ink-200))",
        }}
      >
        <div
          ref={colRef}
          key={lap}
          style={{ width: COL_W, transformOrigin: "top left", transform: `scale(${SCALE})`, willChange: "transform" }}
        >
          <div className="space-y-4 px-4 py-6">
            {oldestFirst.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                session={DUMMY_SESSION}
                authorXp={p.accountId && p.accountId !== ADMIN_ACCOUNT_ID ? snap.xp[p.accountId] ?? 0 : 0}
                now={snap.now}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 2. みんなのレベル                                                     */
/* ------------------------------------------------------------------ */
function LevelsScene({
  snap,
  heading,
  playingRef,
  speedRef,
  onDone,
  onReady,
  onProgress,
}: {
  snap: Snapshot;
  heading: { title: string; note: string | null };
  playingRef: React.MutableRefObject<boolean>;
  speedRef: React.MutableRefObject<number>;
  onDone: () => void;
  onReady: () => void;
  onProgress: (done: number, total: number) => void;
}) {
  const colRef = useRef<HTMLDivElement>(null);
  useAutoScroll(colRef, snap.members.length > 0, LEVELS_SPEED_RATIO, playingRef, speedRef, onDone, 40, onReady, onProgress);
  return (
    <>
      <LeftHeading title={heading.title} note={heading.note} />
      <div
        style={{
          position: "absolute",
          left: 860,
          top: 0,
          width: COL_W * SCALE,
          height: BASE_H,
          overflow: "hidden",
          borderLeft: "3px solid rgb(var(--ink-200))",
        }}
      >
        <div
          ref={colRef}
          style={{ width: COL_W, transformOrigin: "top left", transform: `scale(${SCALE})`, willChange: "transform" }}
        >
          <div className="space-y-3 px-4 py-6">
            {snap.members.map((r) => {
              const st = levelFromXp(r.xp);
              const tier = tierFromLevel(st.level);
              return (
                <div
                  key={r.id}
                  className="border bg-surface"
                  style={{ borderColor: "rgb(var(--ink-200))", padding: "14px 18px" }}
                >
                  <div className="flex items-center gap-3">
                    <LevelIcon rank={tier.rank} size={30} />
                    <span style={{ fontSize: 24, flex: 1 }}>{r.name}</span>
                    <LevelBadge xp={r.xp} className="!px-2.5 !py-1 !text-[14px]" />
                  </div>
                  <div style={{ height: 12, marginTop: 10, flexShrink: 0, border: "2px solid rgb(var(--ink-200))" }}>
                    <div style={{ height: "100%", width: `${Math.round(st.progress * 100)}%`, background: "#fff" }} />
                  </div>
                  <div style={{ fontSize: 13, marginTop: 8, color: "rgb(var(--ink-500))" }}>
                    経験値 {r.xp}　次のレベルまで {st.remaining}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 3. レベルランキング TOP10                                             */
/* ------------------------------------------------------------------ */
function RankingScene({
  snap,
  playingRef,
  onDone,
  onReady,
}: {
  snap: Snapshot;
  playingRef: React.MutableRefObject<boolean>;
  onDone: () => void;
  onReady: () => void;
}) {
  useEffect(() => {
    onReady();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const top = useMemo(() => {
    const all = [...snap.members].sort((a, b) => b.xp - a.xp || a.id.localeCompare(b.id));
    let prevXp = -1;
    let prevRank = 0;
    const ranked = all.map((r, i) => {
      const rank = r.xp === prevXp ? prevRank : i + 1;
      prevXp = r.xp;
      prevRank = rank;
      return { ...r, rank };
    });
    return ranked.filter((r) => r.rank <= TOP_N);
  }, [snap.members]);

  // 下位から1行ずつ登場 → 1位は最後に大きく → しばらく見せる
  const STEP = 1.1;
  const START = 1.6;
  const HOLD = 8;
  const n = top.length;
  const total = START + n * STEP + HOLD;
  const [t, setT] = useState(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let elapsed = 0;
    let finished = false;
    const step = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (playingRef.current) elapsed += dt;
      setT(elapsed);
      if (!finished && elapsed >= total) {
        finished = true;
        doneRef.current();
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [total, playingRef]);

  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 170,
          borderBottom: "3px solid rgb(var(--ink-200))",
          background: "rgb(var(--surface))",
        }}
        className="flex items-center justify-between px-20"
      >
        <div className="flex items-center gap-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo_26.svg" alt="" style={{ width: 100, height: 100, filter: "var(--logo-filter)" }} />
          <div>
            <div style={{ fontSize: 64, letterSpacing: ".1em", color: "#fff" }}>レベルランキング TOP{TOP_N}</div>
            <div style={{ fontSize: 26, color: "rgb(var(--ink-400))", marginTop: 8 }}>
              26アカデミー 例会SNS　投稿で育てた経験値の上位
            </div>
          </div>
        </div>
        <div style={{ fontSize: 28, color: "rgb(var(--ink-500))", textAlign: "right" }}>
          Road of Young Leaders
          <br />
          ～この先へ～　2026.10.19
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 110,
          right: 110,
          top: 200,
          bottom: 40,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          gap: 12,
          color: "#fff",
        }}
      >
        {top.map((r, i) => {
          const idxFromBottom = n - 1 - i; // 0 = いちばん下
          const appear = START + idxFromBottom * STEP;
          const shown = t >= appear;
          const isFirst = r.rank === 1;
          const st = levelFromXp(r.xp);
          const tier = tierFromLevel(st.level);
          const p = Math.min(1, Math.max(0, (t - appear) / 0.5));
          return (
            <div
              key={r.id}
              style={{
                opacity: shown ? p : 0,
                transform: `translateX(${(1 - p) * 90}px)`,
                border: "3px solid #fff",
                background: isFirst ? "#fff" : "rgb(var(--surface))",
                color: isFirst ? "#0a0a0a" : "#fff",
                height: isFirst ? 150 : 66,
                display: "flex",
                alignItems: "center",
                gap: 28,
                padding: "0 36px",
                flexShrink: 0,
              }}
            >
              <span style={{ width: 120, fontSize: isFirst ? 74 : 38 }}>{r.rank}位</span>
              <LevelIcon rank={tier.rank} size={isFirst ? 76 : 40} />
              <span style={{ flex: 1, fontSize: isFirst ? 78 : 40, letterSpacing: ".05em" }}>{r.name}</span>
              <LevelBadge
                xp={r.xp}
                className={
                  isFirst ? "!border-black !px-5 !py-2 !text-[34px] !text-black" : "!px-4 !py-1.5 !text-[24px]"
                }
              />
              <span
                style={{
                  width: 230,
                  textAlign: "right",
                  fontSize: isFirst ? 46 : 28,
                  color: isFirst ? "#0a0a0a" : "rgb(var(--ink-400))",
                }}
              >
                {r.xp} XP
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}
