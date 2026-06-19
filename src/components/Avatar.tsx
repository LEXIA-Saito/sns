import type { AuthorRole } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  role: AuthorRole;
  avatarUrl?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeMap = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-20 w-20 text-2xl",
};

export default function Avatar({ name, role, avatarUrl, size = "md" }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold select-none overflow-hidden",
        role === "academy"
          ? "bg-ink-900 text-white"
          : "border border-ink-300 bg-white text-ink-700",
        sizeMap[size]
      )}
      aria-hidden
    >
      {avatarUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </div>
  );
}
