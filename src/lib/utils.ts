/**
 * 相対時間表示(例: たった今 / 3分前 / 2時間前 / 6/13 14:30)
 * @param timestamp 対象のタイムスタンプ(ミリ秒)
 * @param now 基準とする現在時刻(ミリ秒)。useNow()の値を渡すと自動更新される
 */
export function formatRelativeTime(timestamp?: number, now?: number): string {
  if (!timestamp) return "";
  const base = now ?? Date.now();
  const diff = base - timestamp;
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hour = Math.floor(min / 60);
  const day = Math.floor(hour / 24);

  if (sec < 60) return "たった今";
  if (min < 60) return `${min}分前`;
  if (hour < 24) return `${hour}時間前`;
  if (day < 7) return `${day}日前`;

  const d = new Date(timestamp);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(
    2,
    "0"
  )}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** クラス名を結合 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
