import { levelFromXp, tierFromLevel } from "@/lib/level";
import { cn } from "@/lib/utils";
import LevelIcon from "./LevelIcon";

interface LevelBadgeProps {
  xp: number;
  className?: string;
}

/** 名前の横に出す「Lv.◯」。段階が上がるとアイコンの絵柄が変わる */
export default function LevelBadge({ xp, className }: LevelBadgeProps) {
  const { level } = levelFromXp(xp);
  const tier = tierFromLevel(level);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-ink-200 px-2 py-0.5 text-[10px] font-medium leading-none text-ink-600",
        className
      )}
      title={`${tier.label} / レベル${level}`}
    >
      <LevelIcon rank={tier.rank} size={12} />
      Lv.{level}
    </span>
  );
}
