import type { LevelTier } from "@/lib/level";

interface LevelIconProps {
  rank: LevelTier["rank"];
  size?: number;
  className?: string;
}

/**
 * レベルの段階を表すアイコン。線は currentColor なので配色案にそのまま馴染む。
 * 芽 → 若木 → 炎 → 星 → 冠 の順に育つ。
 */
export default function LevelIcon({ rank, size = 14, className }: LevelIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {rank === 1 && (
        <>
          <path d="M12 21v-6" />
          <path d="M12 15c0-3.3-2.5-6-5.6-6 0 3.3 2.5 6 5.6 6Z" />
        </>
      )}

      {rank === 2 && (
        <>
          <path d="M12 21v-9.5" />
          <path d="M12 14.5c0-2.9-2.1-5.3-4.9-5.3 0 2.9 2.1 5.3 4.9 5.3Z" />
          <path d="M12 12c0-3.2 2.3-5.8 5.3-5.8 0 3.2-2.3 5.8-5.3 5.8Z" />
        </>
      )}

      {rank === 3 && (
        <>
          <path d="M12 2.8c3 3.4 5 6 5 8.7a5 5 0 0 1-10 0c0-1.8 1-3.3 2.4-4.7.2 1.4.9 2.4 2 2.8-.6-2.3-.3-4.5.6-6.8Z" />
          <path d="M12 18.6c-1 0-1.8-.8-1.8-1.8 0-1.1 1.1-1.7 1.8-3 .7 1.3 1.8 1.9 1.8 3 0 1-.8 1.8-1.8 1.8Z" />
        </>
      )}

      {rank === 4 && (
        <path d="m12 3.4 2.7 5.4 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.7l6-.9Z" />
      )}

      {rank === 5 && (
        <>
          <path d="M4 8.5 7.8 12 12 5l4.2 7L20 8.5 18.4 18H5.6Z" />
          <path d="M6.2 21h11.6" />
        </>
      )}
    </svg>
  );
}
