import type { LevelTier } from "@/lib/level";
import { PixelCrown, PixelFire, PixelLeaf, PixelStar, PixelTree } from "./PixelIcon";

interface LevelIconProps {
  rank: LevelTier["rank"];
  size?: number;
  className?: string;
}

/**
 * レベルの段階を表すアイコン。色は currentColor なので配色案にそのまま馴染む。
 * 芽 → 若木 → 炎 → 星 → 冠 の順に育つ。
 */
const RANK_ICONS = {
  1: PixelLeaf,
  2: PixelTree,
  3: PixelFire,
  4: PixelStar,
  5: PixelCrown,
} as const;

export default function LevelIcon({ rank, size = 14, className }: LevelIconProps) {
  const Icon = RANK_ICONS[rank];
  return <Icon size={size} className={className} />;
}
