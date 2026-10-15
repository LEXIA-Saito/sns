// 端末によっては File.type が空になる（HEIC/HEIF、一部の動画など）。
// 空のままアップロードすると Storage ルールの contentType 判定で弾かれるため、拡張子から補う。
const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

export function resolveContentType(file: { name: string; type: string }): string {
  if (file.type && file.type !== "application/octet-stream") return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_MIME[ext] ?? file.type;
}

/**
 * 投稿失敗時に画面へ出す文言。原因の切り分けができるよう、エラーコードの種類ごとに分ける。
 */
export function describePostError(error: unknown): string {
  const code = String((error as { code?: unknown } | null)?.code ?? "");
  const tail = code ? `\n（エラーコード: ${code}）` : "";
  if (code === "storage/unauthorized") {
    return `写真・動画のアップロードが許可されませんでした。ファイルの形式（画像・動画のみ）や、ログイン状態をご確認ください。${tail}`;
  }
  if (code === "PERMISSION_DENIED" || /permission[_ ]denied/i.test(String((error as Error)?.message ?? ""))) {
    return `投稿が許可されませんでした。締切後はアカデミーメンバー以外は投稿できません。ページを再読み込みしてもう一度お試しください。${tail}`;
  }
  if (code === "storage/retry-limit-exceeded" || code === "storage/canceled") {
    return `通信が不安定なためアップロードできませんでした。電波の良い場所でもう一度お試しください。${tail}`;
  }
  return `投稿に失敗しました。時間をおいてもう一度お試しください。${tail}`;
}
