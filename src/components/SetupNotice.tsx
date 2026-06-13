import { AlertTriangle } from "lucide-react";

export default function SetupNotice() {
  return (
    <div className="mx-auto mb-4 max-w-xl rounded-lg border border-ink-300 bg-ink-50 px-4 py-3">
      <div className="flex items-start gap-2">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-ink-700" />
        <div className="text-sm text-ink-700">
          <p className="font-semibold">Firebaseの設定が未完了です</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-500">
            <code className="rounded bg-white px-1">.env.local</code> に
            FirebaseのWebアプリ設定(apiKey / appId など)を入力すると、投稿・コメントが有効になります。Firebaseコンソール →
            プロジェクトの設定 → マイアプリ から取得できます。
          </p>
        </div>
      </div>
    </div>
  );
}
