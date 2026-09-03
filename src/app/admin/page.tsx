"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  EyeOff,
  Filter,
  Flame,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  RefreshCw,
  Save,
  Search,
  Shield,
  Trash2,
  Tv,
  Database,
  Users,
  AlertTriangle,
  FileSpreadsheet,
} from "lucide-react";
import AdminOnly from "@/components/AdminOnly";
import Avatar from "@/components/Avatar";
import type { Post, AppSettings, AccountActivity } from "@/lib/types";
import {
  subscribePosts,
  subscribeSettings,
  subscribeAllActivities,
  updateSettings,
  setPostModeration,
  deletePost,
  resetAccountAvatar,
} from "@/lib/posts";
import {
  formatJstDateTime,
  toJstDateTimeLocal,
  parseJstDateTimeLocal,
  DEFAULT_POST_GUIDE_LINES,
  DEFAULT_POST_GUIDE_NOTICE,
  DEFAULT_POST_DEADLINE_ISO,
} from "@/lib/settings";
import { buildAccountProgressList, generateProgressCsv, type AccountProgressItem } from "@/lib/progress";
import { formatPhotoFileName, createZipArchive, type ZipFileEntry } from "@/lib/zip";
import { formatRelativeTime } from "@/lib/utils";

type AdminTab = "settings" | "posts" | "progress" | "photos";

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("settings");

  // データ状態
  const [posts, setPosts] = useState<Post[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [activities, setActivities] = useState<Record<string, AccountActivity>>({});
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // 設定フォーム状態
  const [postAccepting, setPostAccepting] = useState(true);
  const [postDeadlineInput, setPostDeadlineInput] = useState("");
  const [guideNotice, setGuideNotice] = useState(DEFAULT_POST_GUIDE_NOTICE);
  const [guideLinesText, setGuideLinesText] = useState(DEFAULT_POST_GUIDE_LINES.join("\n"));

  // 投稿モデレーション状態
  const [postFilter, setPostFilter] = useState<"all" | "hidden">("all");
  const [postSearch, setPostSearch] = useState("");

  // アイコン初期化の実行中カード
  const [resettingAvatarId, setResettingAvatarId] = useState<string | null>(null);

  // アカウント進捗フィルタ状態
  const [progressFilter, setProgressFilter] = useState<"all" | "not_logged_in" | "not_posted" | "not_image">("all");
  const [progressSearch, setProgressSearch] = useState("");
  const [progressSort, setProgressSort] = useState<"id" | "posts" | "login">("id");

  // 写真ダウンロード状態
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState("");

  const now = Date.now();

  // リアルタイム購読
  useEffect(() => {
    let unsubPosts: (() => void) | undefined;
    let unsubSettings: (() => void) | undefined;
    let unsubAct: (() => void) | undefined;

    try {
      unsubPosts = subscribePosts((list) => {
        setPosts(list);
        setLoading(false);
      });

      unsubSettings = subscribeSettings((st) => {
        setSettings(st);
        if (st) {
          setPostAccepting(st.postAccepting !== false);
          setPostDeadlineInput(st.postDeadline ? toJstDateTimeLocal(st.postDeadline) : "");
          setGuideNotice(st.postGuideNotice || DEFAULT_POST_GUIDE_NOTICE);
          if (st.postGuideLines && Array.isArray(st.postGuideLines)) {
            setGuideLinesText(st.postGuideLines.join("\n"));
          }
        }
      });

      unsubAct = subscribeAllActivities((act) => {
        setActivities(act);
      });
    } catch (e) {
      console.error(e);
      setLoading(false);
    }

    return () => {
      unsubPosts?.();
      unsubSettings?.();
      unsubAct?.();
    };
  }, []);

  const notify = (text: string, type: "success" | "error" = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  // -------------------------------------------------------------
  // タブ1: 受付設定保存
  // -------------------------------------------------------------
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const postDeadline = parseJstDateTimeLocal(postDeadlineInput);
      const postGuideLines = guideLinesText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      await updateSettings({
        postAccepting,
        postDeadline,
        postGuideNotice: guideNotice.trim() || DEFAULT_POST_GUIDE_NOTICE,
        postGuideLines: postGuideLines.length > 0 ? postGuideLines : DEFAULT_POST_GUIDE_LINES,
        updatedBy: "26-000",
      });
      notify("受付設定を保存しました");
    } catch (err) {
      console.error(err);
      notify("設定の保存に失敗しました", "error");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleApplyRecommendedDeadlines = () => {
    setPostDeadlineInput(DEFAULT_POST_DEADLINE_ISO);
    notify("推奨締切（投稿: 10/12 23:59）を入力欄にセットしました。「設定を保存」を押して適用してください。");
  };

  // -------------------------------------------------------------
  // タブ2: 投稿モデレーション
  // -------------------------------------------------------------
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      if (postFilter === "hidden" && !p.moderation?.hidden) return false;
      if (postSearch.trim()) {
        const q = postSearch.trim().toLowerCase();
        const inName = p.name.toLowerCase().includes(q);
        const inId = (p.accountId || "").toLowerCase().includes(q);
        const inText = p.text.toLowerCase().includes(q);
        if (!inName && !inId && !inText) return false;
      }
      return true;
    });
  }, [posts, postFilter, postSearch]);

  const handleTogglePostHide = async (post: Post) => {
    const isHidden = Boolean(post.moderation?.hidden);
    if (isHidden) {
      if (!confirm(`「${post.name}」の投稿の非表示を解除し、全体に再公開しますか？`)) return;
      try {
        await setPostModeration(post.id, {
          hidden: false,
          moderatedBy: "26-000",
        });
        notify("投稿を再公開（復元）しました");
      } catch (err) {
        console.error(err);
        notify("復元に失敗しました", "error");
      }
    } else {
      const reason = prompt("非表示の理由を入力してください（例: 誤投稿・重複・不適切な内容）:", "運営判断による非表示");
      if (reason === null) return;
      try {
        await setPostModeration(post.id, {
          hidden: true,
          reason: reason.trim() || "運営判断による非表示",
          moderatedBy: "26-000",
        });
        notify("投稿を非表示にしました");
      } catch (err) {
        console.error(err);
        notify("非表示処理に失敗しました", "error");
      }
    }
  };

  const handleDeletePostHard = async (post: Post) => {
    const ok = confirm(`【二段階確認】この投稿を完全に削除しますか？\n（復元できません。写真もすべて削除されます）`);
    if (!ok) return;
    try {
      await deletePost(post);
      notify("投稿を完全に削除しました");
    } catch (err) {
      console.error(err);
      notify("削除に失敗しました", "error");
    }
  };

  // -------------------------------------------------------------
  // タブ3: アカウント進捗
  // -------------------------------------------------------------
  const rawProgressList = useMemo(() => {
    return buildAccountProgressList(posts, activities, false); // 26-001〜26-085
  }, [posts, activities]);

  const filteredProgressList = useMemo(() => {
    let list = rawProgressList.filter((item) => {
      if (progressFilter === "not_logged_in" && item.isLoggedIn) return false;
      if (progressFilter === "not_posted" && item.hasPosted) return false;
      if (progressFilter === "not_image" && item.hasImagePosted) return false;

      if (progressSearch.trim()) {
        const q = progressSearch.trim().toLowerCase();
        return item.name.toLowerCase().includes(q) || item.accountId.toLowerCase().includes(q);
      }
      return true;
    });

    if (progressSort === "posts") {
      list.sort((a, b) => b.postCount - a.postCount);
    } else if (progressSort === "login") {
      list.sort((a, b) => (b.lastLoginAt ?? 0) - (a.lastLoginAt ?? 0));
    } else {
      list.sort((a, b) => a.accountId.localeCompare(b.accountId));
    }

    return list;
  }, [rawProgressList, progressFilter, progressSearch, progressSort]);

  // 不適切なアイコンを、名前のみの初期表示へ戻す。
  // 過去の投稿に焼き付いたぶんも外し、本人の端末にも反映される
  const handleResetAvatar = async (accountId: string, name: string) => {
    if (
      !confirm(
        `${name}（${accountId}）のプロフィール画像をデフォルトに戻します。\n過去の投稿に表示されている画像も外れます。よろしいですか？`
      )
    ) {
      return;
    }
    setResettingAvatarId(accountId);
    try {
      const count = await resetAccountAvatar(posts, accountId);
      notify(`${name} のアイコンをデフォルトに戻しました（投稿 ${count}件）`);
    } catch (err) {
      console.error(err);
      notify("アイコンの初期化に失敗しました", "error");
    } finally {
      setResettingAvatarId(null);
    }
  };

  const handleDownloadCsv = () => {
    const csvString = generateProgressCsv(filteredProgressList);
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sns26_account_progress_${toJstDateTimeLocal(Date.now()).replace(/[-:]/g, "")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify("CSVファイルをダウンロードしました");
  };

  // -------------------------------------------------------------
  // タブ4: 写真一覧・一括ダウンロード
  // -------------------------------------------------------------
  const photoPosts = useMemo(() => {
    return posts.filter((p) => p.media && p.media.type === "image");
  }, [posts]);

  const handleDownloadSinglePhoto = (post: Post, index: number) => {
    if (!post.media?.url) return;
    const filename = formatPhotoFileName(
      post.accountId || "unknown",
      post.name,
      post.createdAt,
      index + 1,
      post.media.url
    );

    // 新規ウィンドウまたはaタグダウンロード
    const a = document.createElement("a");
    a.href = post.media.url;
    a.target = "_blank";
    a.download = filename;
    a.click();
  };

  const handleDownloadAllPhotosZip = async () => {
    if (photoPosts.length === 0) {
      alert("ダウンロード対象の写真がありません。");
      return;
    }
    if (!confirm(`表示中の写真 ${photoPosts.length} 件を一括ダウンロード（ZIP作成）しますか？`)) return;

    setDownloadingZip(true);
    setDownloadProgress("準備中...");

    const files: ZipFileEntry[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < photoPosts.length; i++) {
      const p = photoPosts[i];
      if (!p.media?.url) continue;

      setDownloadProgress(`写真を取得中 (${i + 1}/${photoPosts.length}): ${p.name}`);
      const filename = formatPhotoFileName(
        p.accountId || "unknown",
        p.name,
        p.createdAt,
        i + 1,
        p.media.url
      );

      try {
        const res = await fetch(p.media.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const buffer = await blob.arrayBuffer();
        files.push({
          name: filename,
          data: new Uint8Array(buffer),
        });
        successCount++;
      } catch (err) {
        console.warn(`画像の取得に失敗しました: ${filename}`, err);
        failedCount++;
      }
    }

    if (files.length === 0) {
      alert("すべての画像のダウンロードに失敗しました。CORS制限またはネットワークをご確認ください。");
      setDownloadingZip(false);
      setDownloadProgress("");
      return;
    }

    setDownloadProgress(`ZIPアーカイブを生成中 (${files.length} ファイル)...`);
    try {
      const zipData = createZipArchive(files);
      const zipBlob = new Blob([zipData.buffer as ArrayBuffer], { type: "application/zip" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sns26_photos_${toJstDateTimeLocal(Date.now()).replace(/[-:]/g, "")}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      notify(`ZIPを作成しました (成功: ${successCount}件${failedCount > 0 ? `, 失敗: ${failedCount}件` : ""})`);
    } catch (err) {
      console.error("ZIP生成エラー:", err);
      alert("ZIPの生成に失敗しました。");
    } finally {
      setDownloadingZip(false);
      setDownloadProgress("");
    }
  };

  return (
    <AdminOnly
      title="運営管理ダッシュボード"
      description="この画面は公式運営アカウント（26-000）のみ操作可能です。"
    >
      <div className="min-h-screen bg-canvas text-ink-900 pb-20">
        {/* ヘッダー */}
        <header className="sticky top-0 z-30 border-b border-ink-200 bg-surface/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-1.5 rounded-md border border-ink-200 bg-surface px-2.5 py-1.5 text-xs font-medium text-ink-700 transition hover:bg-ink-100 hover:text-ink-900"
              >
                <ArrowLeft size={15} />
                <span>SNSへ戻る</span>
              </Link>
              <div className="flex items-center gap-1.5">
                <Shield size={18} className="text-accent" />
                <h1 className="text-base font-bold text-ink-900">運営管理画面</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/projector"
                className="flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/20"
                title="会場投影画面を開く"
              >
                <Tv size={15} />
                <span>投影モード</span>
              </Link>
              <Link
                href="/status"
                className="flex items-center gap-1.5 rounded-md border border-ink-200 px-2.5 py-1.5 text-xs font-medium text-ink-600 transition hover:bg-ink-100 hover:text-ink-900"
                title="データベース接続状態"
              >
                <Database size={15} />
                <span className="hidden sm:inline">DB状態</span>
              </Link>
            </div>
          </div>

          {/* タブバー */}
          <div className="mx-auto max-w-6xl px-4 flex gap-2 overflow-x-auto border-t border-ink-100 py-2">
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
                activeTab === "settings"
                  ? "bg-accent text-accent-fg shadow-sm"
                  : "bg-surface text-ink-600 border border-ink-200 hover:bg-ink-100"
              }`}
            >
              <Calendar size={14} />
              <span>受付・締切管理</span>
            </button>
            <button
              onClick={() => setActiveTab("posts")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
                activeTab === "posts"
                  ? "bg-accent text-accent-fg shadow-sm"
                  : "bg-surface text-ink-600 border border-ink-200 hover:bg-ink-100"
              }`}
            >
              <MessageCircle size={14} />
              <span>投稿管理 ({posts.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("progress")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
                activeTab === "progress"
                  ? "bg-accent text-accent-fg shadow-sm"
                  : "bg-surface text-ink-600 border border-ink-200 hover:bg-ink-100"
              }`}
            >
              <Users size={14} />
              <span>参加進捗 (85名)</span>
            </button>
            <button
              onClick={() => setActiveTab("photos")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
                activeTab === "photos"
                  ? "bg-accent text-accent-fg shadow-sm"
                  : "bg-surface text-ink-600 border border-ink-200 hover:bg-ink-100"
              }`}
            >
              <ImageIcon size={14} />
              <span>写真素材 ({photoPosts.length})</span>
            </button>
          </div>
        </header>

        {/* 通知メッセージ */}
        {message && (
          <div
            className={`fixed top-16 right-4 z-50 rounded-lg px-4 py-3 text-sm shadow-lg transition-all ${
              message.type === "success"
                ? "bg-emerald-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            {message.text}
          </div>
        )}

        <main className="mx-auto max-w-6xl px-4 py-6">
          {/* ========================================================= */}
          {/* タブ 1: 受付・締切管理 */}
          {/* ========================================================= */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-ink-200 bg-surface p-5 space-y-5">
                <div>
                  <h2 className="text-base font-bold text-ink-900">受付スイッチ・締切日時</h2>
                  <p className="mt-1 text-xs text-ink-500">
                    一般メンバーの投稿受付を即時ON/OFF、または日時で自動停止します。
                    <span className="text-accent font-semibold ml-1">※ 運営アカウント（26-000）は停止中も常に投稿可能です。</span>
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {/* 投稿受付 */}
                  <div className="rounded-lg border border-ink-200 p-4 space-y-3 bg-ink-50/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-ink-900">投稿の受付</span>
                      <button
                        type="button"
                        onClick={() => setPostAccepting(!postAccepting)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          postAccepting ? "bg-accent" : "bg-ink-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            postAccepting ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                    <p className="text-xs text-ink-500">
                      状態: {postAccepting ? "🟢 受付中" : "🔴 一時停止中"}
                    </p>
                    <div>
                      <label className="block text-xs font-semibold text-ink-700 mb-1">
                        投稿締切日時（日本時間）
                      </label>
                      <input
                        type="datetime-local"
                        value={postDeadlineInput}
                        onChange={(e) => setPostDeadlineInput(e.target.value)}
                        className="w-full rounded-md border border-ink-300 bg-surface px-3 py-2 text-sm text-ink-900 outline-none focus:border-accent"
                      />
                      {postDeadlineInput && (
                        <button
                          type="button"
                          onClick={() => setPostDeadlineInput("")}
                          className="mt-1 text-[11px] text-ink-400 hover:text-red-500"
                        >
                          締切を解除（無期限にする）
                        </button>
                      )}
                    </div>
                  </div>

                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleApplyRecommendedDeadlines}
                    className="text-xs font-semibold text-accent hover:underline"
                  >
                    10月度例会の初期目安（投稿: 10/12 23:59）を自動入力
                  </button>
                </div>
              </div>

              {/* 投稿ガイド文の設定 */}
              <div className="rounded-xl border border-ink-200 bg-surface p-5 space-y-4">
                <div>
                  <h2 className="text-base font-bold text-ink-900">投稿画面のガイド文</h2>
                  <p className="mt-1 text-xs text-ink-500">
                    参加者の投稿ポップアップ内に常時表示されるテーマ文言をカスタマイズできます。
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1">
                    右上の締切予告テキスト
                  </label>
                  <input
                    type="text"
                    value={guideNotice}
                    onChange={(e) => setGuideNotice(e.target.value)}
                    placeholder="写真付き投稿は10月12日まで"
                    className="w-full rounded-md border border-ink-300 bg-surface px-3 py-2 text-sm text-ink-900 outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1">
                    箇条書きテーマ（1行に1項目）
                  </label>
                  <textarea
                    rows={3}
                    value={guideLinesText}
                    onChange={(e) => setGuideLinesText(e.target.value)}
                    className="w-full rounded-md border border-ink-300 bg-surface px-3 py-2 text-sm text-ink-900 outline-none focus:border-accent font-mono"
                  />
                </div>

                <div className="pt-3 border-t border-ink-100 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    disabled={savingSettings}
                    className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-accent-fg transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingSettings ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    <span>設定を保存する</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* タブ 2: 投稿管理（モデレーション） */}
          {/* ========================================================= */}
          {activeTab === "posts" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPostFilter("all")}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                      postFilter === "all" ? "bg-accent text-accent-fg" : "bg-surface border border-ink-200 text-ink-600"
                    }`}
                  >
                    すべて ({posts.length})
                  </button>
                  <button
                    onClick={() => setPostFilter("hidden")}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                      postFilter === "hidden" ? "bg-accent text-accent-fg" : "bg-surface border border-ink-200 text-ink-600"
                    }`}
                  >
                    非表示のみ ({posts.filter((p) => p.moderation?.hidden).length})
                  </button>
                </div>

                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    type="text"
                    value={postSearch}
                    onChange={(e) => setPostSearch(e.target.value)}
                    placeholder="氏名・ID・本文で検索..."
                    className="w-full sm:w-64 rounded-md border border-ink-200 bg-surface pl-8 pr-3 py-1.5 text-xs text-ink-900 outline-none focus:border-accent"
                  />
                </div>
              </div>

              {filteredPosts.length === 0 ? (
                <div className="rounded-xl border border-ink-200 bg-surface p-12 text-center text-sm text-ink-500">
                  該当する投稿はありません
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPosts.map((post) => {
                    const isHidden = Boolean(post.moderation?.hidden);

                    return (
                      <div
                        key={post.id}
                        className={`rounded-xl border bg-surface p-4 transition ${
                          isHidden ? "border-amber-500/40 bg-amber-500/5" : "border-ink-200"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={post.name} avatarUrl={post.avatarUrl} size="md" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-ink-900">{post.name}</span>
                                <span className="text-xs text-ink-400">({post.accountId || "IDなし"})</span>
                                {isHidden && (
                                  <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                                    非表示中
                                  </span>
                                )}
                              </div>
                              <time className="text-[11px] text-ink-400">
                                {formatJstDateTime(post.createdAt)}
                              </time>
                            </div>
                          </div>

                          {/* 運営アクション */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleTogglePostHide(post)}
                              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                                isHidden
                                  ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                                  : "border border-ink-300 text-ink-700 hover:bg-ink-100"
                              }`}
                            >
                              {isHidden ? <Eye size={13} /> : <EyeOff size={13} />}
                              <span>{isHidden ? "再公開（復元）" : "非表示にする"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePostHard(post)}
                              className="rounded-md border border-red-500/30 p-1.5 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                              title="完全削除"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {isHidden && post.moderation?.reason && (
                          <div className="mt-2 rounded bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200">
                            理由: {post.moderation.reason} （実行者: {post.moderation.moderatedBy || "運営"}）
                          </div>
                        )}

                        {post.text && (
                          <p className="mt-3 text-sm text-ink-800 whitespace-pre-wrap leading-relaxed">
                            {post.text}
                          </p>
                        )}

                        {post.media && (
                          <div className="mt-3 max-w-xs overflow-hidden rounded-lg border border-ink-200 bg-media">
                            {post.media.type === "image" ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={post.media.url} alt="投稿メディア" className="max-h-48 w-full object-contain" />
                            ) : (
                              <video src={post.media.url} controls className="max-h-48 w-full object-contain" />
                            )}
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* タブ 3: アカウント進捗一覧 */}
          {/* ========================================================= */}
          {activeTab === "progress" && (
            <div className="space-y-4">
              {/* サマリーカード */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-ink-200 bg-surface p-4 text-center">
                  <p className="text-xs text-ink-500">ログイン済</p>
                  <p className="text-xl font-bold text-ink-900 mt-1">
                    {rawProgressList.filter((x) => x.isLoggedIn).length} / {rawProgressList.length}
                  </p>
                </div>
                <div className="rounded-xl border border-ink-200 bg-surface p-4 text-center">
                  <p className="text-xs text-ink-500">投稿済</p>
                  <p className="text-xl font-bold text-ink-900 mt-1">
                    {rawProgressList.filter((x) => x.hasPosted).length} / {rawProgressList.length}
                  </p>
                </div>
                <div className="rounded-xl border border-ink-200 bg-surface p-4 text-center">
                  <p className="text-xs text-ink-500">写真投稿済</p>
                  <p className="text-xl font-bold text-accent mt-1">
                    {rawProgressList.filter((x) => x.hasImagePosted).length} / {rawProgressList.length}
                  </p>
                </div>
              </div>

              {/* ツールバー */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => setProgressFilter("all")}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                      progressFilter === "all" ? "bg-accent text-accent-fg" : "bg-surface border border-ink-200 text-ink-600"
                    }`}
                  >
                    全員 ({rawProgressList.length})
                  </button>
                  <button
                    onClick={() => setProgressFilter("not_logged_in")}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                      progressFilter === "not_logged_in" ? "bg-accent text-accent-fg" : "bg-surface border border-ink-200 text-ink-600"
                    }`}
                  >
                    未ログイン
                  </button>
                  <button
                    onClick={() => setProgressFilter("not_posted")}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                      progressFilter === "not_posted" ? "bg-accent text-accent-fg" : "bg-surface border border-ink-200 text-ink-600"
                    }`}
                  >
                    未投稿
                  </button>
                  <button
                    onClick={() => setProgressFilter("not_image")}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                      progressFilter === "not_image" ? "bg-accent text-accent-fg" : "bg-surface border border-ink-200 text-ink-600"
                    }`}
                  >
                    写真未投稿
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={progressSearch}
                    onChange={(e) => setProgressSearch(e.target.value)}
                    placeholder="氏名・ID検索..."
                    className="w-40 sm:w-48 rounded-md border border-ink-200 bg-surface px-3 py-1 text-xs text-ink-900 outline-none focus:border-accent"
                  />
                  <select
                    value={progressSort}
                    onChange={(e) => setProgressSort(e.target.value as any)}
                    className="rounded-md border border-ink-200 bg-surface px-2.5 py-1 text-xs text-ink-700 outline-none"
                  >
                    <option value="id">ID順</option>
                    <option value="posts">投稿数順</option>
                    <option value="login">ログイン順</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleDownloadCsv}
                    className="flex items-center gap-1 rounded-md bg-emerald-700 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-600"
                  >
                    <FileSpreadsheet size={14} />
                    <span>CSV</span>
                  </button>
                </div>
              </div>

              {/* テーブル */}
              <div className="overflow-x-auto rounded-xl border border-ink-200 bg-surface">
                <table className="w-full text-left text-xs text-ink-700">
                  <thead className="bg-ink-50 text-ink-900 border-b border-ink-200 font-bold">
                    <tr>
                      <th className="px-3 py-2.5">ID</th>
                      <th className="px-3 py-2.5">氏名</th>
                      <th className="px-3 py-2.5">ログイン</th>
                      <th className="px-3 py-2.5 text-center">投稿数</th>
                      <th className="px-3 py-2.5 text-center">写真投稿</th>
                      <th className="px-3 py-2.5">最終ログイン</th>
                      <th className="px-3 py-2.5 text-center">アイコン</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {filteredProgressList.map((item) => (
                      <tr key={item.accountId} className="hover:bg-ink-50/50">
                        <td className="px-3 py-2 font-mono font-semibold text-ink-900">
                          {item.accountId}
                        </td>
                        <td className="px-3 py-2 font-medium text-ink-900">
                          {item.name}
                        </td>
                        <td className="px-3 py-2">
                          {item.isLoggedIn ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                              <CheckCircle2 size={12} /> 済
                            </span>
                          ) : (
                            <span className="text-ink-400">未記録</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center font-semibold">
                          {item.postCount > 0 ? item.postCount : <span className="text-ink-300">0</span>}
                          {item.hiddenPostCount > 0 && (
                            <span className="ml-1 text-[10px] text-amber-400">({item.hiddenPostCount}非表示)</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {item.hasImagePosted ? (
                            <span className="rounded bg-accent/20 px-1.5 py-0.5 font-bold text-accent">
                              {item.imagePostCount}枚
                            </span>
                          ) : (
                            <span className="text-ink-300">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-ink-500">
                          {item.lastLoginAt ? formatJstDateTime(item.lastLoginAt) : "未記録"}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => void handleResetAvatar(item.accountId, item.name)}
                            disabled={resettingAvatarId === item.accountId}
                            className="rounded-md border border-ink-200 px-2 py-1 text-[11px] font-semibold text-ink-600 transition hover:border-ink-400 hover:text-ink-900 disabled:opacity-50"
                          >
                            {resettingAvatarId === item.accountId ? "初期化中..." : "デフォルトに戻す"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* タブ 4: 写真素材一覧・一括ダウンロード */}
          {/* ========================================================= */}
          {activeTab === "photos" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-ink-900">写真素材一覧</h2>
                  <p className="mt-1 text-xs text-ink-500">
                    メンバーが投稿した写真（静止画）のみを一覧表示・一括保存できます。（動画は対象外）
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadAllPhotosZip}
                  disabled={downloadingZip || photoPosts.length === 0}
                  className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-bold text-accent-fg transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {downloadingZip ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>{downloadProgress || "ダウンロード中..."}</span>
                    </>
                  ) : (
                    <>
                      <Download size={15} />
                      <span>表示中の写真を一括ダウンロード (ZIP)</span>
                    </>
                  )}
                </button>
              </div>

              {photoPosts.length === 0 ? (
                <div className="rounded-xl border border-ink-200 bg-surface p-12 text-center text-sm text-ink-500">
                  写真付き投稿はまだありません
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {photoPosts.map((post, idx) => {
                    const isHidden = Boolean(post.moderation?.hidden);
                    return (
                      <div
                        key={post.id}
                        className={`rounded-xl border bg-surface overflow-hidden flex flex-col justify-between ${
                          isHidden ? "border-amber-500/40 opacity-70" : "border-ink-200"
                        }`}
                      >
                        <div className="relative aspect-square w-full bg-media">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={post.media?.url}
                            alt="投稿写真"
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                          {isHidden && (
                            <span className="absolute top-2 left-2 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-black">
                              非表示
                            </span>
                          )}
                        </div>

                        <div className="p-3 flex-1 flex flex-col justify-between">
                          <div>
                            <p className="font-bold text-xs text-ink-900 truncate">{post.name}</p>
                            <p className="text-[10px] text-ink-400">{post.accountId} ・ {formatJstDateTime(post.createdAt)}</p>
                            {post.text && (
                              <p className="mt-1 text-xs text-ink-600 line-clamp-2">{post.text}</p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDownloadSinglePhoto(post, idx)}
                            className="mt-3 w-full rounded border border-ink-200 bg-ink-50 py-1 text-[11px] font-semibold text-ink-700 transition hover:bg-ink-100 flex items-center justify-center gap-1"
                          >
                            <Download size={12} />
                            <span>個別保存</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </AdminOnly>
  );
}
