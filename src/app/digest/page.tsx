"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import type { Post, AppSettings } from "@/lib/types";
import type { Session } from "@/lib/session";
import {
  subscribePosts,
  subscribeSettings,
  subscribeTimelineAccounts,
  subscribeAccountNames,
} from "@/lib/posts";
import { applyAccountNames, type AccountNames } from "@/lib/accountNames";
import { filterProjectorPosts } from "@/lib/moderation";
import { normalizeVisibility } from "@/lib/timelineVisibility";
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
const HOLD_START = 2.5; // スクロール前の静止（秒）
const HOLD_END = 3; // スクロール後の静止（秒）
const FADE_MS = 600;
const TOP_N = 10;

/** 投稿のスクロール速度（基準px/秒）。標準は1件あたり約4.4秒 */
const SPEEDS = [
  { id: "slow", label: "ゆっくり", px: 160 },
  { id: "normal", label: "標準", px: 245 },
  { id: "fast", label: "速い", px: 400 },
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

/** 列の中の画像がそろうまで待つ（最大 maxMs）。途中で高さが変わってスクロールがずれるのを防ぐ */
async function waitForImages(root: HTMLElement | null, maxMs = 20000) {
  if (!root) return;
  const imgs = Array.from(root.querySelectorAll("img"));
  imgs.forEach((i) => {
    i.loading = "eager";
  });
  await Promise.race([
    Promise.all(
      imgs.map((i) =>
        i.complete
          ? Promise.resolve()
          : new Promise<void>((r) => {
              i.onload = i.onerror = () => r();
            })
      )
    ),
    wait(maxMs),
  ]);
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
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [timelineAllow, setTimelineAllow] = useState<Record<string, boolean>>({});

  /** 投稿・設定・表示許可・名前の4つが、それぞれ最初に届いたか */
  const [loaded, setLoaded] = useState({ posts: false, settings: false, allow: false, names: false });
  useEffect(() => {
    if (viewerAuth !== "ready") return;
    const u1 = subscribePosts((list) => {
      setRawPosts(list);
      setLoaded((l) => (l.posts ? l : { ...l, posts: true }));
    });
    const u2 = subscribeSettings((st) => {
      setSettings(st);
      setLoaded((l) => (l.settings ? l : { ...l, settings: true }));
    });
    const u3 = subscribeTimelineAccounts((allow) => {
      setTimelineAllow(allow);
      setLoaded((l) => (l.allow ? l : { ...l, allow: true }));
    });
    const u4 = subscribeAccountNames((names) => {
      setAccountNames(names);
      setLoaded((l) => (l.names ? l : { ...l, names: true }));
    });
    return () => {
      u1();
      u2();
      u3();
      u4();
    };
  }, [viewerAuth]);
  const dataReady = loaded.posts && loaded.settings && loaded.allow && loaded.names;

  const named = useMemo(() => applyAccountNames(rawPosts, accountNames), [rawPosts, accountNames]);

  const latest = useMemo<Snapshot>(() => {
    const visibility = normalizeVisibility(settings?.timelineFilterEnabled, timelineAllow);
    const visible = filterProjectorPosts(named, visibility);
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
  }, [named, accountNames, settings?.timelineFilterEnabled, timelineAllow]);
  const latestRef = useRef(latest);
  latestRef.current = latest;

  // ---- 再生状態 ----
  const [snap, setSnap] = useState<Snapshot>(latest);
  const [phase, setPhase] = useState<Phase>("timeline");
  const [lap, setLap] = useState(0);
  const [fading, setFading] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [speedId, setSpeedId] = useState<SpeedId>("normal");
  const playingRef = useRef(true);
  playingRef.current = playing;
  const speedRef = useRef<number>(245);
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
  if (viewerAuth === "checking" || !started) return <div className="min-h-screen bg-[#080808]" />;

  const heading =
    phase === "timeline"
      ? { title: "みんなの投稿", note: null }
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
            style={{ opacity: fading ? 0 : 1, transition: `opacity ${FADE_MS}ms ease` }}
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
              />
            )}
            {phase === "levels" && (
              <LevelsScene
                snap={snap}
                heading={heading!}
                playingRef={playingRef}
                speedRef={speedRef}
                onDone={() => goNext(1)}
              />
            )}
            {phase === "ranking" && (
              <RankingScene snap={snap} playingRef={playingRef} onDone={() => goNext(1)} />
            )}
          </div>
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
  extra: number
) {
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let raf = 0;
    (async () => {
      await waitForImages(colRef.current);
      await wait(400);
      if (cancelled || !colRef.current) return;
      const col = colRef.current;
      const total = Math.max(0, col.scrollHeight * SCALE - BASE_H + extra);
      let elapsed = 0; // 一時停止中は進めない
      let last = performance.now();
      const scrollSec = () => total / (speedRef.current * speedFactor);
      const step = (now: number) => {
        if (cancelled) return;
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        if (playingRef.current) elapsed += dt;
        const sec = scrollSec();
        const into = Math.max(0, elapsed - HOLD_START);
        const y = Math.min(total, into * speedRef.current * speedFactor);
        col.style.transform = `translate3d(0, ${-y}px, 0) scale(${SCALE})`;
        if (elapsed >= HOLD_START + sec + HOLD_END) {
          cancelled = true;
          doneRef.current();
          return;
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
}: {
  snap: Snapshot;
  lap: number;
  heading: { title: string; note: string | null };
  playingRef: React.MutableRefObject<boolean>;
  speedRef: React.MutableRefObject<number>;
  onDone: () => void;
}) {
  const colRef = useRef<HTMLDivElement>(null);
  useAutoScroll(colRef, snap.posts.length > 0, 1, playingRef, speedRef, onDone, 0);
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
            {snap.posts.map((p) => (
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
}: {
  snap: Snapshot;
  heading: { title: string; note: string | null };
  playingRef: React.MutableRefObject<boolean>;
  speedRef: React.MutableRefObject<number>;
  onDone: () => void;
}) {
  const colRef = useRef<HTMLDivElement>(null);
  useAutoScroll(colRef, snap.members.length > 0, LEVELS_SPEED_RATIO, playingRef, speedRef, onDone, 40);
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
}: {
  snap: Snapshot;
  playingRef: React.MutableRefObject<boolean>;
  onDone: () => void;
}) {
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
