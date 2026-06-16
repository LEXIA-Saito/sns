import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Database,
  HardDrive,
  Radio,
  Server,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type { Post } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type StatusLevel = "ok" | "warning" | "error";

type DatabaseProbe = {
  level: StatusLevel;
  label: string;
  detail: string;
  posts: Post[];
  checkedAt: string;
  latencyMs: number | null;
};

const requiredEnv = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_FIREBASE_DATABASE_URL",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
] as const;

function hasRequiredFirebaseEnv() {
  return requiredEnv.every((key) => Boolean(process.env[key]));
}

function normalizeDatabaseUrl(url: string) {
  return url.replace(/\/$/, "");
}

function toPosts(value: unknown): Post[] {
  if (!value || typeof value !== "object") return [];

  return Object.entries(value as Record<string, Omit<Post, "id">>)
    .map(([id, post]) => ({ ...post, id }))
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

async function probeDatabase(): Promise<DatabaseProbe> {
  const checkedAt = new Date().toISOString();

  if (!hasRequiredFirebaseEnv()) {
    return {
      level: "warning",
      label: "Firebase設定が不足しています",
      detail: "必要な環境変数が揃っていないため、SSRからデータベースを確認できません。",
      posts: [],
      checkedAt,
      latencyMs: null,
    };
  }

  const startedAt = Date.now();
  const databaseUrl = normalizeDatabaseUrl(
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ?? ""
  );

  try {
    const response = await fetch(`${databaseUrl}/posts.json?orderBy=%22createdAt%22`, {
      cache: "no-store",
      next: { revalidate: 0 },
    });
    const latencyMs = Date.now() - startedAt;

    if (!response.ok) {
      return {
        level: response.status === 401 || response.status === 403 ? "error" : "warning",
        label: "データベース応答に問題があります",
        detail: `Realtime Database が HTTP ${response.status} を返しました。セキュリティルールやURLを確認してください。`,
        posts: [],
        checkedAt,
        latencyMs,
      };
    }

    const posts = toPosts(await response.json());

    return {
      level: "ok",
      label: "SSRからデータベースを確認できました",
      detail: "このページはサーバー側でRealtime Databaseを読み取り、描画時点の状態を表示しています。",
      posts,
      checkedAt,
      latencyMs,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return {
      level: "error",
      label: "データベース接続に失敗しました",
      detail: `SSR実行環境からRealtime Databaseへ接続できませんでした: ${message}`,
      posts: [],
      checkedAt,
      latencyMs: Date.now() - startedAt,
    };
  }
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "Asia/Tokyo",
  }).format(new Date(iso));
}

function formatPostTime(value?: number) {
  if (!value) return "時刻未確定";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(new Date(value));
}

function StatusIcon({ level }: { level: StatusLevel }) {
  if (level === "ok") return <CheckCircle2 className="h-6 w-6 text-emerald-500" />;
  if (level === "warning") return <AlertTriangle className="h-6 w-6 text-amber-500" />;
  return <XCircle className="h-6 w-6 text-red-500" />;
}

export default async function StatusPage() {
  const probe = await probeDatabase();
  const commentCount = probe.posts.reduce(
    (total, post) => total + Object.keys(post.comments ?? {}).length,
    0
  );
  const mediaCount = probe.posts.filter((post) => post.media).length;
  const latestPost = probe.posts[0];
  const configuredCount = requiredEnv.filter((key) => Boolean(process.env[key])).length;

  const cards = [
    { label: "投稿数", value: probe.posts.length, icon: Database, helper: "postsノード" },
    { label: "コメント数", value: commentCount, icon: Radio, helper: "全投稿合計" },
    { label: "メディア付き", value: mediaCount, icon: HardDrive, helper: "画像・動画" },
    { label: "応答時間", value: probe.latencyMs === null ? "--" : `${probe.latencyMs}ms`, icon: Activity, helper: "SSR fetch" },
  ];

  return (
    <main className="min-h-screen bg-ink-950 px-4 py-6 text-white">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft size={16} />
          SNSへ戻る
        </Link>

        <section className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] shadow-2xl shadow-black/30">
          <div className="bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_35%),linear-gradient(135deg,rgba(24,24,27,0.9),rgba(63,63,70,0.65))] p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
                  <Server size={14} />
                  SSR STATUS PAGE
                </div>
                <h1 className="mt-4 text-2xl font-black tracking-tight sm:text-4xl">
                  サーバーサイドレンダリング状況
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">
                  ページ表示時にサーバー側でFirebase Realtime Databaseを読み取り、
                  設定・接続・投稿データの状態をまとめて可視化します。
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <StatusIcon level={probe.level} />
                <p className="mt-3 text-sm font-bold">{probe.label}</p>
                <p className="mt-1 text-xs text-white/55">{formatTime(probe.checkedAt)} JST</p>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-5 sm:p-8">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="flex items-start gap-3">
                <StatusIcon level={probe.level} />
                <div>
                  <h2 className="text-lg font-bold">データベース接続</h2>
                  <p className="mt-1 text-sm leading-6 text-white/65">{probe.detail}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {cards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex items-center justify-between text-white/55">
                      <span className="text-xs font-semibold uppercase tracking-wide">{card.label}</span>
                      <Icon size={18} />
                    </div>
                    <p className="mt-3 text-3xl font-black">{card.value}</p>
                    <p className="mt-1 text-xs text-white/45">{card.helper}</p>
                  </div>
                );
              })}
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <ShieldCheck size={18} />
                  Firebase環境変数
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-white"
                    style={{ width: `${(configuredCount / requiredEnv.length) * 100}%` }}
                  />
                </div>
                <p className="mt-3 text-sm text-white/65">
                  {configuredCount}/{requiredEnv.length} 件の必須設定を検出しました。
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <Clock3 size={18} />
                  最新投稿
                </div>
                {latestPost ? (
                  <div className="mt-4 rounded-xl bg-black/20 p-4">
                    <p className="text-sm font-bold">{latestPost.name || "匿名"}</p>
                    <p className="mt-1 text-xs text-white/45">{formatPostTime(latestPost.createdAt)}</p>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/70">{latestPost.text}</p>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-white/55">まだ表示できる投稿はありません。</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
