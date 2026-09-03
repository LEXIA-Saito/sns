import React from "react";

export interface PixelIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
  filled?: boolean;
}

/**
 * 24x24 グリッドで描かれた完全なピクセルアート（ドット絵）SVGアイコンセット
 * PixelMplus12 フォントおよび白線テーマ（#080808）に完全最適化。
 */

// 1. ハート（いいねアイコン）
export function PixelHeart({ size = 16, className = "", filled = false, ...props }: PixelIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 2}
      className={`pixel-icon shrink-0 ${className}`}
      style={{ shapeRendering: "crispEdges" }}
      {...props}
    >
      {filled ? (
        <path d="M4 4h4v2H4V4zm8 0h4v2h-4V4zM2 6h2v4H2V6zm6 2h4v2H8V8zm8-2h2v4h-2V6zm2 4h2v4h-2v-4zM0 10h2v4H0v-4zm2 4h2v2H2v-2zm2 2h2v2H4v-2zm2 2h2v2H6v-2zm2 2h2v2H8v-2zm2 2h2v2h-2v-2zm2-2h2v-2h-2v2zm2-2h2v-2h-2v2zm2-2h2v-2h-2v2zm2-2h2v-2h-2v2zm2-4h-2v4h2v-4z" />
      ) : (
        // アウトラインドットハート
        <path
          fill="currentColor"
          d="M4 3h5v2H4V3zm11 0h5v2h-5V3zM2 5h2v3H2V5zm18 0h2v3h-2V5zM9 5h6v2H9V5zm-9 3h2v6H0V8zm22 0h2v6h-2V8zM2 14h2v3H2v-3zm18 0h2v3h-2v-3zm-16 3h2v2H4v-2zm14 0h2v2h-2v-2zm-12 2h2v2H6v-2zm10 0h2v2h-2v-2zm-8 2h2v2H8v-2zm6 0h2v2h-2v-2zm-4 2h4v2h-4v-2z"
        />
      )}
    </svg>
  );
}

// 2. コメント（吹き出しアイコン）
export function PixelComment({ size = 16, className = "", ...props }: PixelIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`pixel-icon shrink-0 ${className}`}
      style={{ shapeRendering: "crispEdges" }}
      {...props}
    >
      {/* クラシックRPG風の四角いドット吹き出し */}
      <path d="M3 3h18v2H3V3zm-2 2h2v12H1V5zm20 0h2v12h-2V5zm-18 12h8v2H3v-2zm8 2h3v2h-3v-2zm3 2h3v2h-3v-2zm3-2h3v-2h-3v2zm3-2h3v-2h-3v2zm-2 0h2v-2h-2v2zM6 8h12v2H6V8zm0 4h8v2H6v-2z" />
    </svg>
  );
}

// 3. ペン / 鉛筆（投稿FAB）
export function PixelPen({ size = 16, className = "", ...props }: PixelIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`pixel-icon shrink-0 ${className}`}
      style={{ shapeRendering: "crispEdges" }}
      {...props}
    >
      {/* ドットの鉛筆 */}
      <path d="M16 2h4v2h2v4h-2v2h-2V8h-2V6h-2V4h2V2zm-2 4h2v2h-2V6zm-2 2h2v2h-2V8zm-2 2h2v2h-2v-2zm-2 2h2v2H8v-2zm-2 2h2v2H6v-2zm-2 2h2v2H4v-2zm-2 2h2v2H2v-2zm0 2h2v2H0v-4h2v2zM18 4h2v2h-2V4z" />
    </svg>
  );
}

// 4. カメラ / 画像（写真・メディア）
export function PixelCamera({ size = 16, className = "", ...props }: PixelIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`pixel-icon shrink-0 ${className}`}
      style={{ shapeRendering: "crispEdges" }}
      {...props}
    >
      {/* レトロなドットカメラ */}
      <path d="M7 3h4v2H7V3zm-5 4h20v2H2V7zm-2 2h2v12H0V9zm22 0h2v12h-2V9zm-20 12h20v2H2v-2zm7-9h6v2H9v-2zm-2 2h2v4H7v-4zm8 0h2v4h-2v-4zm-6 4h6v2H9v-2zm8-10h3v2h-3V6z" />
    </svg>
  );
}

// 5. ゴミ箱（削除）
export function PixelTrash({ size = 16, className = "", ...props }: PixelIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`pixel-icon shrink-0 ${className}`}
      style={{ shapeRendering: "crispEdges" }}
      {...props}
    >
      {/* ドットのゴミ箱 */}
      <path d="M8 2h8v2H8V2zM3 5h18v2H3V5zm2 3h2v13H5V8zm12 0h2v13h-2V8zm-8 2h2v9H9v-9zm4 0h2v9h-2v-9zM7 21h10v2H7v-2z" />
    </svg>
  );
}

// 6. 編集（ノート / ペン）
export function PixelEdit({ size = 16, className = "", ...props }: PixelIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`pixel-icon shrink-0 ${className}`}
      style={{ shapeRendering: "crispEdges" }}
      {...props}
    >
      {/* 編集アイコン */}
      <path d="M3 3h12v2H3v14h14v-6h2v8H1V3h2zm14 0h4v2h-4V3zm4 2h2v4h-2V5zm-2 4h-2V7h2v2zm-2 2h-2V9h2v2zm-2 2h-2v-2h2v2zm-2 2h-2v-2h2v2zm-2 2H9v-2h2v2zm-4 2H3v-4h2v2h2v2z" />
    </svg>
  );
}

// 7. バツ印（閉じる）
export function PixelX({ size = 16, className = "", ...props }: PixelIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`pixel-icon shrink-0 ${className}`}
      style={{ shapeRendering: "crispEdges" }}
      {...props}
    >
      {/* カクカクの太いバツ */}
      <path d="M3 3h4v2H3V3zm4 2h2v2H7V5zm2 2h2v2H9V7zm2 2h2v2h-2V9zm2-2h2v2h-2V7zm2-2h2v2h-2V5zm2-2h4v2h-4V3zm-2 8h-2v2h2v-2zm-2 2h-2v2h-2v-2h2v-2h2v2zm-4 2H7v-2h2v2zm-2 2H3v-2h4v2zm12-2h2v2h-2v-2zm2 2h4v2h-4v-2z" />
    </svg>
  );
}

// 8. 盾（運営・管理画面）
export function PixelShield({ size = 16, className = "", ...props }: PixelIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`pixel-icon shrink-0 ${className}`}
      style={{ shapeRendering: "crispEdges" }}
      {...props}
    >
      {/* ドットの盾 */}
      <path d="M2 2h20v4h-2v6h-2v4h-2v3h-2v2h-2v2h-2v-2h-2v-2H8v-3H6v-4H4V6H2V2zm4 4v6h2v3h2v2h2v2h2v-2h2v-2h2v-3h2V6H6zM11 7h2v6h-2V7zm0 8h2v2h-2v-2z" />
    </svg>
  );
}

// 9. テレビ / モニター（投影モード）
export function PixelTv({ size = 16, className = "", ...props }: PixelIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`pixel-icon shrink-0 ${className}`}
      style={{ shapeRendering: "crispEdges" }}
      {...props}
    >
      {/* アンテナ付きレトロテレビ */}
      <path d="M7 2h2v2H7V2zm8 0h2v2h-2V2zm-4 2h2v2h-2V4zm-2 2h2v2H9V6zm4 0h2v2h-2V6zM1 7h22v2H1V7zm-1 2h2v12H0V9zm22 0h2v12h-2V9zm-20 12h20v2H2v-2zm2-10h14v8H4V9zm16 2h2v2h-2v-2zm0 4h2v2h-2v-2z" />
    </svg>
  );
}

// 10. データベース（DB状態）
export function PixelDatabase({ size = 16, className = "", ...props }: PixelIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`pixel-icon shrink-0 ${className}`}
      style={{ shapeRendering: "crispEdges" }}
      {...props}
    >
      {/* ドットのシリンダー/DB */}
      <path d="M5 2h14v2H5V2zM3 4h2v3H3V4zm16 0h2v3h-2V4zm-14 3h14v2H5V7zM3 9h2v4H3V9zm16 0h2v4h-2V9zm-14 4h14v2H5v-2zm-2 2h2v4H3v-4zm16 0h2v4h-2v-4zm-14 4h14v2H5v-2z" />
    </svg>
  );
}

// 11. QRコード
export function PixelQrCode({ size = 16, className = "", ...props }: PixelIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`pixel-icon shrink-0 ${className}`}
      style={{ shapeRendering: "crispEdges" }}
      {...props}
    >
      {/* ドットQR */}
      <path d="M2 2h7v2H4v3H2V2zm5 2v3H4V4h3zm7-2h7v5h-2V4h-5V2zm5 2v3h-3V4h3zm-9 4h2v2H8V8zm4 0h2v2h-2V8zm-6 2h2v2H6v-2zm6 0h2v2h-2v-2zm-2 2h2v2h-2v-2zm-8 4h7v5H2v-5zm2 2v1h3v-1H4zm10-2h2v2h-2v-2zm4 0h3v5h-2v-3h-1v-2zm-4 3h2v3h-2v-3zm4 1h2v2h-2v-2z" />
    </svg>
  );
}

// 12. 送信（紙飛行機）
export function PixelSend({ size = 16, className = "", ...props }: PixelIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`pixel-icon shrink-0 ${className}`}
      style={{ shapeRendering: "crispEdges" }}
      {...props}
    >
      {/* ドットの紙飛行機 */}
      <path d="M2 3h20v2L13 13v9h-3l-2-6-6-3V3zm4 3l4 2 2-4zm6 9l4-4-7-3 3 7z" />
    </svg>
  );
}

// 13. 目（モデレーション表示）
export function PixelEye({ size = 16, className = "", ...props }: PixelIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`pixel-icon shrink-0 ${className}`}
      style={{ shapeRendering: "crispEdges" }}
      {...props}
    >
      {/* ドットの目 */}
      <path d="M8 5h8v2H8V5zm-4 2h4v2H4V7zm12 0h4v2h-4V7zM1 9h3v2H1V9zm19 0h3v2h-3V9zM1 13h3v2H1v-2zm19 0h3v2h-3v-2zm-16 2h4v2H4v-2zm12 0h4v2h-4v-2zm-8 2h8v2H8v-2zm2-8h4v6h-4V9z" />
    </svg>
  );
}

// 14. 目・非表示（モデレーション非表示）
export function PixelEyeOff({ size = 16, className = "", ...props }: PixelIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`pixel-icon shrink-0 ${className}`}
      style={{ shapeRendering: "crispEdges" }}
      {...props}
    >
      {/* ドットのスラッシュ付き目 */}
      <path d="M2 2h3v2H2V2zm3 2h3v2H5V4zm3 2h3v2H8V6zm3 2h3v2h-3V8zm3 2h3v2h-3v-2zm3 2h3v2h-3v-2zm3 2h3v2h-3v-2zm-12-6h5v2H8V6zm-4 2h3v2H4V8zm12 0h3v2h-3V8zM1 11h2v2H1v-2zm19 0h3v2h-3v-2zm-16 3h3v2H4v-2zm12 0h3v2h-3v-2zm-8 3h8v2H8v-2z" />
    </svg>
  );
}

// 15. ログアウト
export function PixelLogOut({ size = 16, className = "", ...props }: PixelIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`pixel-icon shrink-0 ${className}`}
      style={{ shapeRendering: "crispEdges" }}
      {...props}
    >
      {/* ドットのドア＋矢印 */}
      <path d="M2 3h9v2H4v14h7v2H2V3zm14 4h3v2h-3V7zm3 2h3v2h-3V9zm-3 2h3v2h-3v-2zm-6 2h10v2H10v-2zm6 2h3v2h-3v-2zm3 2h-3v-2h3v2z" />
    </svg>
  );
}

// 16. キラキラ（星・テーマガイド）
export function PixelSparkle({ size = 16, className = "", ...props }: PixelIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`pixel-icon shrink-0 ${className}`}
      style={{ shapeRendering: "crispEdges" }}
      {...props}
    >
      {/* ドットの4方向星 */}
      <path d="M11 2h2v4h-2V2zm0 16h2v4h-2v-4zM2 11h4v2H2v-2zm16 0h4v2h-4v-2zm-9-2h6v6H9V9zm-2-2h2v2H7V7zm8 0h2v2h-2V7zm-8 8h2v2H7v-2zm8 0h2v2h-2v-2z" />
    </svg>
  );
}

// 17. フィルム / 動画
export function PixelFilm({ size = 16, className = "", ...props }: PixelIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`pixel-icon shrink-0 ${className}`}
      style={{ shapeRendering: "crispEdges" }}
      {...props}
    >
      {/* ドットのフィルムスプール/フレーム */}
      <path d="M2 4h20v2H2V4zm0 2h3v4H2V6zm17 0h3v4h-3V6zm-14 4h14v4H5v-4zm-3 0h3v4H2v-4zm17 0h3v4h-3v-4zm-17 4h3v4H2v-4zm17 0h3v4h-3v-4zM2 18h20v2H2v-2z" />
    </svg>
  );
}

// 18. ログイン
export function PixelLogIn({ size = 16, className = "", ...props }: PixelIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`pixel-icon shrink-0 ${className}`}
      style={{ shapeRendering: "crispEdges" }}
      {...props}
    >
      {/* ドットの矢印＋ドア */}
      <path d="M11 3h11v18H11v-2h9V5h-9V3zM2 11h10v2H2v-2zm6-4h2v2H8V7zm2 2h2v2h-2V9zm0 6h-2v-2h2v2zm-2 2H6v-2h2v2z" />
    </svg>
  );
}

// 19. 鍵
export function PixelKey({ size = 16, className = "", ...props }: PixelIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`pixel-icon shrink-0 ${className}`}
      style={{ shapeRendering: "crispEdges" }}
      {...props}
    >
      {/* ドットの鍵 */}
      <path d="M6 3h6v2H6V3zm-2 2h2v6H4V5zm8 0h2v6h-2V5zm-6 6h6v2H6v-2zm2 2h2v8H8v-8zm2 3h3v2h-3v-2zm0 3h2v2h-2v-2z" />
    </svg>
  );
}
