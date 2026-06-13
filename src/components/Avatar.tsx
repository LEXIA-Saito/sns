import type { AuthorRole } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  role: AuthorRole;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

export default function Avatar({ name, role, size = "md" }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold select-none",
        role === "academy"
          ? "bg-ink-900 text-white"
          : "border border-ink-300 bg-white text-ink-700",
        sizeMap[size]
      )}
      aria-hidden
    >
      {initial}
    </div>
  );
}
